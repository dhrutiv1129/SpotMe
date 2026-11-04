package com.spotme.auth;

import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

/** Account persistence; credential policy and password verification belong to the service. */
@Repository
public class AccountRepository {
  public record Account(long id, String passwordHash) {}

  private final JdbcTemplate jdbc;

  public AccountRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public long create(String email, String passwordHash) {
    var key = new GeneratedKeyHolder();
    jdbc.update(
        connection -> {
          var statement = connection.prepareStatement(
              "INSERT INTO beta_users(email,password_hash) VALUES (?,?)", new String[] {"id"});
          statement.setString(1, email);
          statement.setString(2, passwordHash);
          return statement;
        }, key);
    return key.getKey().longValue();
  }

  public Optional<Account> findByEmail(String email) {
    return jdbc.query(
        "SELECT id,password_hash FROM beta_users WHERE email=?",
        (rs, row) -> new Account(rs.getLong(1), rs.getString(2)), email)
        .stream().findFirst();
  }
}
