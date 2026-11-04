package com.spotme.auth;

import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Stores only token digests, never raw bearer tokens. */
@Repository
public class SessionRepository {
  private final JdbcTemplate jdbc;

  public SessionRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public void deleteExpired(OffsetDateTime now) {
    jdbc.update("DELETE FROM beta_sessions WHERE expires_at < ?", now);
  }

  public void create(String tokenHash, long userId, OffsetDateTime expiresAt) {
    jdbc.update(
        "INSERT INTO beta_sessions(token_hash,user_id,expires_at) VALUES (?,?,?)",
        tokenHash, userId, expiresAt);
  }

  public Optional<AuthenticationService.User> findUser(String tokenHash, OffsetDateTime now) {
    return jdbc.query(
        "SELECT u.id,u.email FROM beta_users u JOIN beta_sessions s ON s.user_id=u.id WHERE"
            + " s.token_hash=? AND s.expires_at>?",
        (rs, row) -> new AuthenticationService.User(rs.getLong(1), rs.getString(2)), tokenHash, now)
        .stream().findFirst();
  }

  public void delete(String tokenHash) {
    jdbc.update("DELETE FROM beta_sessions WHERE token_hash=?", tokenHash);
  }
}
