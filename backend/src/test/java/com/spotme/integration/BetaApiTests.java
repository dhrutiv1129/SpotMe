package com.spotme.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.*;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class BetaApiTests {
  @LocalServerPort int port;
  @Autowired JdbcTemplate jdbc;
  private final HttpClient client = HttpClient.newHttpClient();

  private HttpResponse<String> call(
      String method, String path, String token, String body, String key) throws Exception {
    var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + path));
    if (token != null) builder.header("Authorization", "Bearer " + token);
    if (key != null) builder.header("Idempotency-Key", key);
    if (body != null) builder.header("Content-Type", "application/json");
    return client.send(
        builder
            .method(
                method,
                body == null
                    ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(body))
            .build(),
        HttpResponse.BodyHandlers.ofString());
  }

  private String field(String json, String name) {
    var matcher = java.util.regex.Pattern.compile("\"" + name + "\":\"([^\"]+)\"").matcher(json);
    assertThat(matcher.find()).as(json).isTrue();
    return matcher.group(1);
  }

  private String register() throws Exception {
    var response =
        call(
            "POST",
            "/auth/register",
            null,
            "{\"email\":\""
                + UUID.randomUUID()
                + "@example.com\",\"password\":\"correct horse battery staple\"}",
            null);
    assertThat(response.statusCode()).as(response.body()).isEqualTo(201);
    return field(response.body(), "token");
  }

  private String workout(int reps) {
    return "{\"date\":\"2026-01-01\",\"exercises\":[{\"exerciseId\":2,\"sets\":[{\"reps\":"
        + reps
        + ",\"weight\":25.125}]}]}";
  }

  @Test
  void betaFlowPersistsWorkoutUpdatesProgressAndProtectsOwners() throws Exception {
    assertThat(call("GET", "/workouts", null, null, null).statusCode()).isEqualTo(401);
    String token = register();
    assertThat(call("GET", "/auth/me", token, null, null).statusCode()).isEqualTo(200);
    assertThat(call("GET", "/exercises", token, null, null).body())
        .contains("Leg press", "Goblet squat");
    var alternatives =
        call("GET", "/exercises/1/alternatives?equipment=dumbbell,bodyweight", token, null, null);
    assertThat(alternatives.statusCode()).isEqualTo(200);
    assertThat(alternatives.body())
        .contains("Goblet squat", "Bodyweight squat")
        .doesNotContain("Leg press");
    assertThat(call("GET", "/exercises/1/alternatives?equipment=unknown", token, null, null).body())
        .isEqualTo("[]");
    String key = UUID.randomUUID().toString();
    var saved = call("POST", "/workouts", token, workout(8), key);
    assertThat(saved.statusCode()).as(saved.body()).isEqualTo(201);
    var idMatcher = java.util.regex.Pattern.compile("\"id\":(\\d+)").matcher(saved.body());
    assertThat(idMatcher.find()).isTrue();
    String id = idMatcher.group(1);
    assertThat(call("POST", "/workouts", token, workout(8), key).body())
        .contains("\"id\":" + id + ",");
    assertThat(call("POST", "/workouts", token, workout(9), key).statusCode()).isEqualTo(409);
    assertThat(call("GET", "/workouts/" + id, token, null, null).statusCode()).isEqualTo(200);
    assertThat(call("GET", "/progress/2", token, null, null).body())
        .contains("201.000000", "estimatedOneRepMax");
    assertThat(
            call("POST", "/workouts", token, workout(10), UUID.randomUUID().toString())
                .statusCode())
        .isEqualTo(201);
    assertThat(call("GET", "/records", token, null, null).body())
        .contains("maxWorkoutVolume", "251.250000");
    String other = register();
    assertThat(call("GET", "/workouts", other, null, null).body()).isEqualTo("[]");
    assertThat(call("GET", "/workouts/" + id, other, null, null).statusCode()).isEqualTo(404);
    assertThat(call("GET", "/records", other, null, null).body()).isEqualTo("[]");
    assertThat(call("POST", "/auth/logout", token, null, null).statusCode()).isEqualTo(204);
    assertThat(call("GET", "/workouts", token, null, null).statusCode()).isEqualTo(401);
  }

  @Test
  void splitControllersKeepAuthenticationAndCorsPolicy() throws Exception {
    for (String path : List.of(
        "/auth/me", "/exercises", "/workouts", "/progress/2", "/records",
        "/exercises/1/alternatives")) {
      var response = call("GET", path, null, null, null);
      assertThat(response.statusCode()).as(path).isEqualTo(401);
      assertThat(response.headers().firstValue("Cache-Control")).contains("no-store");
      assertThat(response.headers().firstValue("X-Content-Type-Options")).contains("nosniff");
    }
    var preflight = client.send(
        HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/workouts"))
            .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
            .header("Origin", "http://localhost:8081")
            .header("Access-Control-Request-Method", "POST")
            .header("Access-Control-Request-Headers", "Authorization,Idempotency-Key,Content-Type")
            .build(), HttpResponse.BodyHandlers.ofString());
    assertThat(preflight.statusCode()).isEqualTo(200);
    assertThat(preflight.headers().firstValue("Access-Control-Allow-Origin"))
        .contains("http://localhost:8081");
  }

  @Test
  void concurrentRetriesCommitOneWorkout() throws Exception {
    String token = register();
    String key = UUID.randomUUID().toString();
    var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/workouts"))
        .header("Authorization", "Bearer " + token)
        .header("Idempotency-Key", key)
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(workout(8)))
        .build();
    var first = client.sendAsync(request, HttpResponse.BodyHandlers.ofString());
    var second = client.sendAsync(request, HttpResponse.BodyHandlers.ofString());
    CompletableFuture.allOf(first, second).get(15, java.util.concurrent.TimeUnit.SECONDS);
    assertThat(first.get().statusCode()).as(first.get().body()).isEqualTo(201);
    assertThat(second.get().statusCode()).as(second.get().body()).isEqualTo(201);
    long id = jdbc.queryForObject(
        "SELECT id FROM beta_workouts WHERE request_key=?", Long.class, key);
    // A database read may add decimal trailing zeroes; both responses must identify the same save.
    assertThat(first.get().body()).contains("\"id\":" + id + ",");
    assertThat(second.get().body()).contains("\"id\":" + id + ",");
    assertThat(jdbc.queryForObject(
        "SELECT COUNT(*) FROM beta_workouts WHERE request_key=?", Integer.class, key))
        .isEqualTo(1);
  }

  @Test
  void loginExpiryAndInvalidInputs() throws Exception {
    String email = UUID.randomUUID() + "@example.com";
    String body = "{\"email\":\"" + email + "\",\"password\":\"correct horse battery staple\"}";
    var registration = call("POST", "/auth/register", null, body, null);
    String token = field(registration.body(), "token");
    assertThat(call("POST", "/auth/login", null, body, null).statusCode()).isEqualTo(200);
    assertThat(
            call(
                    "POST",
                    "/auth/login",
                    null,
                    body.replace("correct horse battery staple", "wrong password value"),
                    null)
                .statusCode())
        .isEqualTo(401);
    assertThat(call("POST", "/auth/register", null, body, null).statusCode()).isEqualTo(409);
    assertThat(
            jdbc.queryForObject(
                "SELECT password_hash FROM beta_users WHERE email=?", String.class, email))
        .startsWith("$2a$");
    String key = UUID.randomUUID().toString();
    assertThat(call("POST", "/workouts", token, workout(0), key).statusCode()).isEqualTo(400);
    assertThat(
            call(
                    "POST",
                    "/workouts",
                    token,
                    workout(8).replace("exerciseId\":2", "exerciseId\":999"),
                    key)
                .statusCode())
        .isEqualTo(400);
    assertThat(
            call("POST", "/workouts", token, workout(8).replace("25.125", "0"), key).statusCode())
        .isEqualTo(400);
    assertThat(
            call("POST", "/workouts", token, workout(8).replace("25.125", "0.1234567"), key)
                .statusCode())
        .isEqualTo(400);
    assertThat(call("POST", "/workouts", token, workout(8).replace("8,", "8.5,"), key).statusCode())
        .isEqualTo(400);
    assertThat(call("GET", "/workouts", token, null, null).body()).isEqualTo("[]");
    assertThat(call("GET", "/exercises/999/alternatives", token, null, null).statusCode())
        .isEqualTo(404);
    jdbc.update(
        "UPDATE beta_sessions SET expires_at=TIMESTAMP WITH TIME ZONE '2000-01-01 00:00:00+00'"
            + " WHERE user_id=(SELECT id FROM beta_users WHERE email=?)",
        email);
    assertThat(call("GET", "/auth/me", token, null, null).statusCode()).isEqualTo(401);
  }
}
