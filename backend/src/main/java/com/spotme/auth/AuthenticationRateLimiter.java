package com.spotme.auth;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** In-process login/registration limits; shared deployments still need edge throttling. */
@Component
public class AuthenticationRateLimiter {
  private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();
  private record Attempt(long window, int count) {}

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

}
