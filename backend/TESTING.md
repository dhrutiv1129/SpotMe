# Backend testing

## What exists today

The backend contains the application scaffold and standalone workout validation
under `com.spotme.workout`. There are no controllers, persistence adapters, or
frontend yet. The validator is not wired into an HTTP endpoint.

`src/test/java/com/spotme/backend/BackendApplicationTests.java` contains two
Spring context smoke tests: application configuration registers the entry-point
bean, and the configured application name is `backend`. The original context
loading test is retained with an explicit assertion; one configuration test was
added. Neither is a business unit test. They use the default mock web environment
(no listening server), need no database, and make no external API calls.

## Frameworks and commands

Use JDK 21 and the checked-in Maven wrapper. `spring-boot-starter-webmvc-test` already supplies Spring
Boot Test, AssertJ, JUnit Jupiter, and Mockito; no duplicate dependencies are
needed. The existing Spring Boot `4.2.0-SNAPSHOT` dependency is retained. Its
current dependency management resolves JUnit Jupiter 6, using the same
`org.junit.jupiter` API as JUnit 5; do not override it just to force JUnit 5.
Snapshot dependencies require access to the configured Spring snapshot repository
on a fresh machine and can change between builds.

From `backend/`:

```sh
./mvnw test
./mvnw verify
./mvnw -Dtest=BackendApplicationTests test
```

Surefire results are in `target/surefire-reports/`. Maven may need network access
to download build dependencies, but the tests themselves do not use the network.
The checked-in wrapper selects Maven 3.10.0 and downloads it on first use.
On Windows, use `.\mvnw.cmd` in place of `./mvnw`. No installed Maven is required.

## Coverage

JaCoCo 0.8.14 attaches its agent before tests and generates HTML, XML, and CSV
reports during `./mvnw verify`. Open `target/site/jacoco/index.html`; automation can
read `target/site/jacoco/jacoco.xml`. `./mvnw test` records execution data but does
not generate the report. Use `./mvnw clean verify` when you need a fresh report
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
out of source control and keep `./mvnw test` independent of PostgreSQL.

## Deferred feature tests

The table below is backed by 53 disabled JUnit cases in six `*PendingTests`
classes under `src/test/java/com/spotme/{feature}/`. These are pending test
contracts, not implemented behavior checks: each body describes the setup,
operation and expected result in a deliberate `fail(...)` call. Maven reports
them as skipped, and they add no coverage. No production functionality was added.

To activate a feature class, replace each `fail(...)` with assertions against
the real production API, mock actual dependencies, resolve any documented policy
questions, then remove its class-level `@Disabled`. Removing only `@Disabled`
will fail the build, so unfinished cases cannot accidentally appear green. Remove
the `pending` tag when the class is complete. For example, run
`./mvnw -Dtest=PersonalRecordsPendingTests test` while developing it.

Pending cases by area: workouts 6, records 8, recommendations
11, consistency 14, authentication/authorization 11, validation/errors 3.
Enabled tests cover smoke checks, validation, creation, history, and strength calculations. Frontend and optional video tests
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
`./mvnw --batch-mode clean verify` from `backend/`.

Compilation errors and enabled test failures fail the job. The 53 intentionally
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

## Verified wrapper baseline (October 29, 2026)

`./mvnw --batch-mode clean verify` passed with wrapper Maven 3.10.0 and
Temurin JDK 21.0.1: 80 discovered tests, 2 passed, 78 skipped, zero failures
or errors. The executable JAR and JaCoCo report were generated successfully.

## Historical baseline (October 26, 2026)

Both `./mvnw test` and `./mvnw -B verify` passed with Maven 3.9.15 and JDK 25
(compiling for Java 21). Each ran two tests with zero failures, errors or skips.
A JDK 21 runtime was not available locally, so that runtime still needs CI
verification. JaCoCo generated all three report formats: 1/3 lines (33.3%),
3/8 instructions (37.5%), 1/2 methods (50%), and no branches. Only the
bootstrap class exists; `main` is not exercised by the context tests.

After adding the pending feature contracts, both `./mvnw -B test` and
`./mvnw -B verify` passed: 80 discovered, 2 passed, 78 skipped, zero failures or
errors. Coverage remains 33.3% of bootstrap lines; pending cases provide no
feature coverage.

## Workout validation contract

`WorkoutValidatorTests` exercises the real validator without Spring or a database.
Run `./mvnw -Dtest=WorkoutValidatorTests test` from `backend/`.

Construct `WorkoutValidator` with an `ExerciseCatalog` adapter and a `Clock` in the
application/user date zone. The database teammate supplies `findById`, returning
empty for unknown IDs and trusted `supportsBodyweight` metadata for known IDs.
Catalog infrastructure failures propagate rather than becoming input errors.
No production adapter or Spring bean registration is included yet.

`WorkoutRequest` contains `date`, `exercises`, and per-exercise `exerciseId` and
`sets`. Sets contain integer `reps` and decimal `weight`; list order represents
exercise and set order. Agree on a single weight unit with the UI/database team.

Validation rejects missing inputs, empty exercise/set lists, invalid or unknown
exercise IDs, nonpositive reps, negative weights, and dates after today according
to the injected clock. Zero weight is accepted only for catalog-defined bodyweight
exercises; positive added resistance is allowed for them. Today and past dates
are accepted. Errors are collected into `WorkoutValidationException.violations()`
with indexed field paths, stable codes, and readable messages. There is no HTTP
error mapping or persistence in this PR. Covered validation/creation placeholders have been removed; remaining contracts
stay disabled until their service/controller APIs exist.

## Workout creation service (PR 2)

`WorkoutServiceImpl.createWorkout` obtains identity from `CurrentUser`, snapshots
input collections, validates through the real `WorkoutValidator`, calls
`WorkoutStore.save` once, and returns an immutable `WorkoutResponse` with the
assigned workout ID and ordered exercise/set values. It propagates authentication,
catalog, and storage failures rather than returning success. The request contains
no owner ID. Null nested input still produces the validator's field-specific errors.

Integration boundaries (no production implementations are present yet):

- Authentication supplies `CurrentUser.requireUserId()`, rejecting unauthenticated
  calls and returning the authenticated user's positive database ID. The interface
  currently lives in `workout` as a consumer contract; coordinate its eventual home
  with the authentication teammate rather than introducing a second identity source.
- The database teammate implements `WorkoutStore.save(userId, request)`, maps the
  request to entities, preserves exercise/set order, and saves the whole aggregate
  in one transaction, returning the generated positive workout ID. The adapter must
  roll back all rows on failure. It also implements the existing `ExerciseCatalog`.
- Application configuration will construct the validator with the catalog and a
  clock in the agreed date zone, and inject all dependencies into the service.
  No Spring bean registration or package-scan changes are made before adapters exist.

Run `./mvnw -Dtest=WorkoutServiceTests test` from `backend/`. Creation-service tests (9 focused cases)
cover owner assignment, returned data/order, invalid and unknown inputs,
unauthenticated access, invalid identity/store IDs, storage failures, and snapshots
of mutable input with immutable responses. These use a real validator and mocked
integration boundaries; they do not prove database persistence or rollback.

This is a business-logic increment, not an operational save endpoint. Entity mapping,
transactional database integration and rollback tests, authentication wiring, and
controllers remain necessary before UC1 can save a workout end to end. No fallback
in-memory store or demo identity is shipped as production behavior.

## Reconciled pending contracts

Removed seven creation/validation placeholders from `WorkoutManagementPendingTests`
and two input-validation placeholders from `ValidationAndErrorsPendingTests`.
Their behavior is exercised by `WorkoutValidatorTests` and `WorkoutServiceTests`.
Validator rules run directly in `WorkoutValidatorTests`; representative invalid,
null-nested, and unknown-exercise requests verify no storage calls in service tests. Remaining placeholders cover unimplemented update/delete,
history, cross-user access, resource errors, HTTP mapping, and other feature modules.
Historical baseline counts above describe earlier runs, not the current suite.

## Workout history (PR 3)

`WorkoutService` now exposes `getWorkoutHistory`, `getSetHistory(exerciseId)`,
and `getWorkoutDates` for the authenticated user only. The constructor additionally
requires `WorkoutHistoryReader`. Its database adapter must query by owner ID and
return fully loaded immutable `WorkoutResponse` DTOs with trusted owner metadata.
The service fails closed if any returned owner differs from the current user.

History is ordered by date descending, then workout ID descending. Set history
filters by positive exercise ID and preserves workout/exercise/set order, using
one-based exercise and set positions. Dates are distinct and sorted ascending;
multiple sessions on a day remain separate in full history. Unknown positive
exercise IDs produce empty set history when no stored sets match. No exercise
catalog lookup is needed to read saved history. Calculators decide frequency and
streak rules; this layer does not calculate them.

Nine `WorkoutHistoryTests` cover ordering, stored values, empty results, filtering,
immutable lists, distinct dates, invalid inputs, authentication, owner mismatch,
and database failures. The completed-history placeholder has been removed.
The PR 3 baseline originally had 64 passing cases and 68 pending contracts. Database adapters,
SQL-level ownership tests, pagination, HTTP endpoints, and detail-by-ID retrieval
are not implemented. This is not yet operational history in the app.

## Strength calculators (PR 4)

`OneRepMaxCalculator.calculate(weight, reps)` returns an optional decimal value.
For reps > 1 it uses Epley: weight * (30 + reps) / 30, rounded once to six
places with HALF_UP. One rep returns the actual input weight without rounding.
Zero external weight returns Optional.empty: body mass is not recorded, so a
meaningful total-load 1RM cannot be estimated. Missing/negative weights and
nonpositive reps are rejected. These policies are the initial prototype defaults.

`VolumeCalculator` sums weight * reps for each supplied set exactly once. It
provides totals and immutable groupings by exercise, workout, or Monday-start
week (keyed by the Monday date, including cross-year weeks). Input weights must
use the same unit; output is that unit multiplied by repetitions. Bodyweight
sets with zero external load contribute zero; added resistance contributes its
recorded weight only. Empty history returns zero/empty maps. Null history/sets,
invalid reps/weights, and missing dates for weekly aggregation are rejected.
Callers supply the intended history window and must avoid duplicate set rows.

The former eight 1RM and seven volume pending contracts are replaced by enabled
`OneRepMaxCalculatorTests` and `VolumeCalculatorTests` (16 executed cases).
Coverage includes manual calculation examples, fractional precision, single rep,
bodyweight, invalid values, large-rep arithmetic, multi-session/exercise grouping,
and Sunday/Monday year boundaries. Current suite: 60 passed, 53 pending skipped.
Run `./mvnw -Dtest=OneRepMaxCalculatorTests,VolumeCalculatorTests test`.

Calculators are plain Java and do not query the database. Personal records,
analytics service/controller orchestration, and frontend integration remain for
later PRs; no operational analytics endpoint is introduced here.

## Test scope cleanup

Reduced the enabled suite from 84 to 60 cases without changing production code:
replaced 20 duplicate validator scenarios at the service layer with one no-save
check (retaining null-nested and unknown-exercise service tests), merged redundant
history immutability/detail coverage into the ordering test, and removed four
calculator examples already covered by equivalent formula/validation branches.
The direct validator matrix remains intact. Security checks, collection snapshots,
precision/rounding, empty/bodyweight behavior, and week boundaries remain tested.
Parameterized rows count as separate executed cases, not separate test methods.
