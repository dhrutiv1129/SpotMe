package com.spotme.auth;

import com.spotme.common.Digests;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Locale;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Opaque, revocable sessions. Only password hashes and token digests reach the database. */
@Service
public class AuthenticationService {
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

  private final AccountRepository accounts;
  private final SessionRepository sessions;
  private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);
  private final String dummyHash = passwords.encode("unused-timing-placeholder");
  private final SecureRandom random = new SecureRandom();

  public AuthenticationService(AccountRepository accounts, SessionRepository sessions) {
    this.accounts = accounts;
    this.sessions = sessions;
  }

  public Session register(Credentials input) {
    String email = validate(input);
    long id;
    String hash = passwords.encode(input.password());
    try {
      id = accounts.create(email, hash);
    } catch (DuplicateKeyException ex) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Unable to create account. Try signing in.");
    }
    return issue(new User(id, email));
  }

  public Session login(Credentials input) {
    String email = validate(input);
    var account = accounts.findByEmail(email);
    boolean matches = passwords.matches(
        input.password(), account.isEmpty() ? dummyHash : account.get().passwordHash());
    if (account.isEmpty() || !matches)
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect.");
    return issue(new User(account.get().id(), email));
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
    sessions.deleteExpired(OffsetDateTime.now());
    sessions.create(Digests.sha256(token), user.id(), OffsetDateTime.now().plusDays(7));
    return new Session(token, user);
  }

  public User authenticate(HttpServletRequest request) {
    String header = request.getHeader("Authorization");
    if (header == null || !header.matches("Bearer [A-Za-z0-9_-]{43}"))
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in.");
    String hash = Digests.sha256(header.substring(7));
    User user = sessions.findUser(hash, OffsetDateTime.now())
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.UNAUTHORIZED, "Your session expired. Please sign in."));
    request.setAttribute("spotme.user", user);
    request.setAttribute("spotme.session", hash);
    return user;
  }

  public User current(HttpServletRequest request) {
    User user = (User) request.getAttribute("spotme.user");
    if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in.");
    return user;
  }

  public void logout(HttpServletRequest request) {
    sessions.delete((String) request.getAttribute("spotme.session"));
  }
}
