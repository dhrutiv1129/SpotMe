package com.spotme.config;

import com.spotme.auth.AuthenticationInterceptor;
import com.spotme.auth.AuthenticationService;
import com.spotme.auth.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class SecurityConfiguration implements WebMvcConfigurer {
  private final AuthenticationInterceptor interceptor;

  public SecurityConfiguration(AuthenticationInterceptor interceptor) {
    this.interceptor = interceptor;
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(interceptor).addPathPatterns("/api/**");
  }

  @Bean
  public CurrentUser currentUser(AuthenticationService auth, HttpServletRequest request) {
    return () -> auth.current(request).id();
  }
}
