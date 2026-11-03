package com.spotme.backend.beta;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Opaque, revocable sessions. Only password hashes and token digests reach the database. */
@Service
public class Authentication {
  public record Credentials(String email, String password) {
    @Override
    public String toString() {
      return "Credentials[redacted]";
    }
  }

  public record User(long id, String email) {}

  public record Session(String token, User user) {
    @Override
    public String toString() {
      return "Session[redacted]";
    }
  }

  private final JdbcTemplate jdbc;
  private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);
  private final String dummyHash = passwords.encode("unused-timing-placeholder");
  private final SecureRandom random = new SecureRandom();
  private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();

  private record Attempt(long window, int count) {}

  public Authentication(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public void throttle(String address) {
    long window = System.currentTimeMillis() / 900_000;
    if (attempts.size() > 10000) attempts.entrySet().removeIf(e -> e.getValue().window() != window);
    Attempt value =
        attempts.compute(
            address,
            (key, old) ->
                old == null || old.window() != window
                    ? new Attempt(window, 1)
                    : new Attempt(window, old.count() + 1));
    if (value.count() > 30)
      throw new ResponseStatusException(
          HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Try again in 15 minutes.");
  }

  public Session register(Credentials input) {
    String email = validate(input);
    var key = new GeneratedKeyHolder();
    String hash = passwords.encode(input.password());
    try {
      jdbc.update(
          connection -> {
            var statement =
                connection.prepareStatement(
                    "INSERT INTO beta_users(email,password_hash) VALUES (?,?)",
                    new String[] {"id"});
            statement.setString(1, email);
            statement.setString(2, hash);
            return statement;
          },
          key);
    } catch (DuplicateKeyException ex) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Unable to create account. Try signing in.");
    }
    return issue(new User(key.getKey().longValue(), email));
  }

  public Session login(Credentials input) {
    String email = validate(input);
    record Account(long id, String hash) {}
    var accounts =
        jdbc.query(
            "SELECT id,password_hash FROM beta_users WHERE email=?",
            (rs, row) -> new Account(rs.getLong(1), rs.getString(2)),
            email);
    boolean matches =
        passwords.matches(
            input.password(), accounts.isEmpty() ? dummyHash : accounts.getFirst().hash());
    if (accounts.isEmpty() || !matches)
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect.");
    return issue(new User(accounts.getFirst().id(), email));
  }

  private String validate(Credentials input) {
    if (input == null || input.email() == null || input.password() == null)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and password are required.");
    String email = input.email().strip().toLowerCase(Locale.ROOT);
    int length = input.password().getBytes(StandardCharsets.UTF_8).length;
    if (email.length() > 254
        || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")
        || length < 12
        || length > 72)
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Use a valid email and a password of 12–72 UTF-8 bytes.");
    return email;
  }

  private Session issue(User user) {
    byte[] bytes = new byte[32];
    random.nextBytes(bytes);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    jdbc.update("DELETE FROM beta_sessions WHERE expires_at < ?", OffsetDateTime.now());
    jdbc.update(
        "INSERT INTO beta_sessions(token_hash,user_id,expires_at) VALUES (?,?,?)",
        digest(token),
        user.id(),
        OffsetDateTime.now().plusDays(7));
    return new Session(token, user);
  }

  public User authenticate(HttpServletRequest request) {
    String header = request.getHeader("Authorization");
    if (header == null || !header.matches("Bearer [A-Za-z0-9_-]{43}"))
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in.");
    String hash = digest(header.substring(7));
    var users =
        jdbc.query(
            "SELECT u.id,u.email FROM beta_users u JOIN beta_sessions s ON s.user_id=u.id WHERE"
                + " s.token_hash=? AND s.expires_at>?",
            (rs, row) -> new User(rs.getLong(1), rs.getString(2)),
            hash,
            OffsetDateTime.now());
    if (users.isEmpty())
      throw new ResponseStatusException(
          HttpStatus.UNAUTHORIZED, "Your session expired. Please sign in.");
    request.setAttribute("spotme.user", users.getFirst());
    request.setAttribute("spotme.session", hash);
    return users.getFirst();
  }

  public User current(HttpServletRequest request) {
    User user = (User) request.getAttribute("spotme.user");
    if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in.");
    return user;
  }

  public void logout(HttpServletRequest request) {
    jdbc.update(
        "DELETE FROM beta_sessions WHERE token_hash=?", request.getAttribute("spotme.session"));
  }

  static String digest(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException ex) {
      throw new IllegalStateException(ex);
    }
  }
}
