# Backend architecture

SpotMe is a single Spring Boot application organized by feature under `com.spotme`.
`SpotMeApplication` is the entry point and sits above all feature packages so
Spring can discover their controllers, repositories, and configuration.

## Package map

| Package | Responsibilities and starting points |
|---|---|
| `auth` | `AuthController`, credential/session policy in `AuthenticationService`, account and session repositories, authentication interceptor, rate limiter, and the `CurrentUser` boundary. |
| `workout` | `WorkoutController`, business rules in `WorkoutServiceImpl` and `WorkoutValidator`, transactional retry handling in `SaveWorkout`, and SQL in `JdbcWorkoutRepository`. |
| `exercise` | `ExerciseController`, shared catalog data in `Exercise`, and `JdbcExerciseCatalog`, which implements the workout validator's `ExerciseCatalog` interface. |
| `analytics` | `AnalyticsController`, progress assembly, estimated 1RM, volume, and personal-record calculations. Reads workout history through `WorkoutService`. |
| `recommendation` | `RecommendationController`, filtering/ranking services, and `JdbcRecommendationCatalog`, which combines shared exercise data with substitution relationships. |
| `consistency` | Standalone streak, frequency, and calendar services. These remain outside the beta's HTTP and UI flows. |
| `config` | CORS in `WebConfiguration`, authentication registration and current-user wiring in `SecurityConfiguration`, and plain Java service assembly in `DomainConfiguration`. |
| `common` | API error handling and shared SHA-256 hashing used for session tokens and workout retry payloads. |

## Request and persistence flow

API requests pass through `AuthenticationInterceptor`. Login and registration are
public and rate limited; other API routes require a valid bearer session.
`CurrentUser` resolves the authenticated identity for the active request rather
than accepting a user ID from workout input.

Feature controllers delegate to services or read-only catalog adapters. Workout,
analytics, recommendation, and consistency business services are plain Java
objects. `DomainConfiguration` explicitly wires the integrated services to their
interfaces. Repositories use `JdbcTemplate`; JPA entities are not required by the
current implementation.

`SaveWorkout.save` owns the HTTP save transaction. It locks the owner's account
row, checks the retry key and payload hash, calls `WorkoutService`, and records
the retry metadata. `JdbcWorkoutRepository.save` is also transactional so direct
domain saves remain atomic. Calls go through Spring-managed proxies; nested saves
join the outer transaction. A failed set insert must roll back the whole workout.

The refactor preserves `/api` routes, JSON shapes, session behavior, and database
tables. Flyway migrations remain in `src/main/resources/db/migration`; this package
layout does not require a data migration. H2 is the local default and the
`postgres` profile selects PostgreSQL.

## Tests and feature status

Tests mirror the feature packages under `src/test/java/com/spotme`.
`SpotMeApplicationTests` checks application wiring; `integration/BetaApiTests`
exercises HTTP flows; `integration/DatabaseConnectivityTests` is opt-in for
PostgreSQL. See [TESTING.md](TESTING.md) and the [beta runbook](../deployment/BETA.md)
for commands and environment requirements.

Saved-workout editing and deletion remain required beta work. Consistency
integration is deferred. See the top-level [beta use cases](../readme.md#current-beta-use-cases-optional-reference)
for current user-visible behavior. The frontend has not been reorganized by this
backend refactor.
