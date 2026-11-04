package com.spotme.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthenticationService auth;

  public AuthController(AuthenticationService auth) {
    this.auth = auth;
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public AuthenticationService.Session register(@RequestBody AuthenticationService.Credentials body) {
    return auth.register(body);
  }

  @PostMapping("/login")
  public AuthenticationService.Session login(@RequestBody AuthenticationService.Credentials body) {
    return auth.login(body);
  }

  @GetMapping("/me")
  public AuthenticationService.User me(HttpServletRequest request) {
    return auth.current(request);
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(HttpServletRequest request) {
    auth.logout(request);
  }
}
