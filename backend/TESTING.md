# Backend testing

## What exists today

The backend currently contains only `BackendApplication` and
`application.yaml`. There are no controllers, services, repositories, domain
models, calculators, validators, or custom exception handlers. The repository
also has no frontend or Python video analysis component.

`src/test/java/com/spotme/backend/BackendApplicationTests.java` contains two
Spring context smoke tests: application configuration registers the entry-point
bean, and the configured application name is `backend`. The original context
loading test is retained with an explicit assertion; one configuration test was
added. Neither is a business unit test. They use the default mock web environment
(no listening server), need no database, and make no external API calls.

## Frameworks and commands

Use JDK 21 and Maven. `spring-boot-starter-webmvc-test` already supplies Spring
Boot Test, AssertJ, JUnit Jupiter, and Mockito; no duplicate dependencies are
needed. The existing Spring Boot `4.2.0-SNAPSHOT` dependency is retained. Its
current dependency management resolves JUnit Jupiter 6, using the same
`org.junit.jupiter` API as JUnit 5; do not override it just to force JUnit 5.
Snapshot dependencies require access to the configured Spring snapshot repository
on a fresh machine and can change between builds.

From `backend/`:

```sh
mvn test
mvn verify
mvn -Dtest=BackendApplicationTests test
```

Surefire results are in `target/surefire-reports/`. Maven may need network access
to download build dependencies, but the tests themselves do not use the network.
The checked-in wrapper is currently configured for Maven 3.10.0; the commands
above use installed Maven and do not depend on that distribution being available.

## Coverage

JaCoCo 0.8.14 attaches its agent before tests and generates HTML, XML, and CSV
reports during `mvn verify`. Open `target/site/jacoco/index.html`; automation can
read `target/site/jacoco/jacoco.xml`. `mvn test` records execution data but does
not generate the report. Use `mvn clean verify` when you need a fresh report
without execution data from previous runs.

There is no coverage threshold or production-code exclusion. Coverage currently
measures only the bootstrap class, including its untested `main` method; it says
nothing about fitness features. Do not test framework internals or mock static
startup calls to inflate this number.

## Adding tests

Mirror each actual production package under `src/test/java`, name classes
`*Test` or `*Tests`, and use descriptive JUnit Jupiter test methods. Keep
Arrange–Act–Assert steps readable. Test validation separately from service logic.
Use plain unit tests for business rules; reserve `@SpringBootTest` for wiring
and context behavior.

When services exist, use `@ExtendWith(MockitoExtension.class)` with `@Mock`
repository fields and construct the actual service with those mocks in
`@BeforeEach`. Arrange repository responses with `when(...).thenReturn(...)`,
call the real service, assert the result with AssertJ, and use `verify(...)` for
meaningful persistence interactions. Test failure paths as well as success; do
not mock the method under test. No Mockito examples are executable yet because
there is no service or repository to test.

Future database integration tests should use `*IT` names and a separate Maven
Failsafe profile with a disposable PostgreSQL database. Configure that profile
before adding such tests: it is not present today. Keep real database credentials
out of source control and keep `mvn test` independent of PostgreSQL.

## Deferred feature tests

The table below is backed by 78 disabled JUnit cases in eight `*PendingTests`
classes under `src/test/java/com/spotme/{feature}/`. These are pending test
contracts, not implemented behavior checks: each body describes the setup,
operation and expected result in a deliberate `fail(...)` call. Maven reports
them as skipped, and they add no coverage. No production functionality was added.

To activate a feature class, replace each `fail(...)` with assertions against
the real production API, mock actual dependencies, resolve any documented policy
questions, then remove its class-level `@Disabled`. Removing only `@Disabled`
will fail the build, so unfinished cases cannot accidentally appear green. Remove
the `pending` tag when the class is complete. For example, run
`mvn -Dtest=EstimatedOneRepMaxPendingTests test` while developing it.

Pending cases by area: workouts 14, 1RM 8, volume 7, records 8, recommendations
11, consistency 14, authentication/authorization 11, validation/errors 5.
The two existing smoke tests remain enabled. Frontend and optional video tests
remain documented below until those components and their test runners exist. Proposed feature
packages (`com.spotme.auth`, `workout`, `analytics`, `consistency`,
`recommendation`, `common`) must be reconciled with the eventual production
package layout; the current application scans `com.spotme.backend` and below.

| Missing area | Tests to implement when built |
| --- | --- |
| Workout logging and management | Valid creation; negative weights; zero/negative reps; required fields; empty workouts; invalid exercise IDs; update workouts and recorded sets; delete sets/workouts; retrieve history; nonexistent IDs; ownership. Mock repositories for service tests. |
| Estimated 1RM | Call the real calculator: 100 × 10 ≈ 133.33, 60 × 5 = 70; decimal weights, precision, negative inputs, zero reps. Define the single-rep rule before testing it. |
| Training volume | One/multiple sets, exercises and sessions; empty history; aggregation by exercise/week using documented production rules. |
| Personal records | First record, new maximum weight/1RM/volume, no improvement, ties, multiple dated sessions and associated record dates. |
| Exercise alternatives | Muscle/equipment matching, beginner suitability, easiest-first ordering, top three, fewer than three/none, original exclusion, invalid data and deterministic tie breaking. |
| Consistency | Completed dates, weekly/monthly counts, current/longest streak, duplicate dates, gaps, empty history, ordering, calendar/heatmap output, week/month boundaries and implemented timezone rules. Define streak semantics and inject a fixed clock when needed. |
| Authentication and authorization | Registration validation/duplicates, login, wrong password, missing/invalid/expired tokens, owned-resource access, cross-user rejection, password hashing/verification. Use fake test inputs, never real secrets. |
| Common validation/errors | Invalid/missing values, missing resources, consistent exceptions and HTTP error mapping after handlers exist. |

## Future frontend and video tests

No frontend dependencies were installed and no application was generated. Once
the React Native framework and package manager are chosen, add framework-compatible
Jest and React Native Testing Library development dependencies, its Jest preset,
setup file and a `test` script. Run the chosen package manager's test command
(e.g. `npm test -- --runInBand` for npm/Jest). Mock API calls and native modules;
no running backend should be required.

Cover workout form rendering/input/validation/submission; saved and empty
history and API errors; analytics/records with empty/loading/error states;
alternative ordering/selection/fewer-than-three/none; dates, weekly counts,
streaks and heatmaps.

Only add Pytest if a Python component is built. Then cover supported/unsupported
video formats, file-size limits, invalid input, missing or low-confidence
landmarks and joint angles. Do not install OpenCV or MediaPipe for this plan.

## GitHub Actions CI

`.github/workflows/ci.yml` runs on pushes to `main`, pull requests targeting
`main`, and manual `workflow_dispatch` runs. It uses Temurin Java 21 and Maven
dependency caching keyed by `backend/pom.xml`, then runs
`mvn --batch-mode clean verify` from `backend/`.

Compilation errors and enabled test failures fail the job. The 78 intentionally
disabled test contracts remain skipped. No frontend or Python jobs are configured.

The workflow uploads `backend-test-results` (Surefire reports) and
`backend-jacoco-coverage` (JaCoCo HTML, XML and CSV). Uploads are attempted even
when the build fails; a report not generated before a failure produces a warning
without hiding the Maven failure. Download the coverage artifact and open
`index.html` to view coverage.

The workflow follows the setup and caching pattern in
[GitHub's Maven CI guide](https://docs.github.com/en/actions/tutorials/build-and-test-code/java-with-maven).
The existing Spring Boot snapshot parent is retained; dependency versions can
change between builds.

## Verified baseline (October 26, 2026)

Both `mvn test` and `mvn -B verify` passed with Maven 3.9.15 and JDK 25
(compiling for Java 21). Each ran two tests with zero failures, errors or skips.
A JDK 21 runtime was not available locally, so that runtime still needs CI
verification. JaCoCo generated all three report formats: 1/3 lines (33.3%),
3/8 instructions (37.5%), 1/2 methods (50%), and no branches. Only the
bootstrap class exists; `main` is not exercised by the context tests.

After adding the pending feature contracts, both `mvn -B test` and
`mvn -B verify` passed: 80 discovered, 2 passed, 78 skipped, zero failures or
errors. Coverage remains 33.3% of bootstrap lines; pending cases provide no
feature coverage.
