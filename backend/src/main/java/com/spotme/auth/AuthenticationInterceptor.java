package com.spotme.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** Applies the existing beta authentication policy to every API route. */
@Component
public class AuthenticationInterceptor implements HandlerInterceptor {
  private final AuthenticationService auth;
  private final AuthenticationRateLimiter rateLimiter;

  public AuthenticationInterceptor(
      AuthenticationService auth, AuthenticationRateLimiter rateLimiter) {
    this.auth = auth;
    this.rateLimiter = rateLimiter;
  }

  @Override
  public boolean preHandle(
      HttpServletRequest request, HttpServletResponse response, Object handler) {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    if (request.getMethod().equals("OPTIONS")) return true;
    String path = request.getRequestURI();
    if (path.equals("/api/auth/register") || path.equals("/api/auth/login")) {
      rateLimiter.throttle(request.getRemoteAddr());
      return true;
    }
    auth.authenticate(request);
    return true;
  }
}
