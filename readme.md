# SpotMe 💪

A workout tracking app that helps users log exercises,
track progress, and find alternative workouts when
gym equipment is unavailable.

## Planned features
- Track sets, reps, and weights
- Monitor workout progress
- Discover alternative exercises
- Organize workout routines

## Current status

The repository currently contains a Spring Boot backend scaffold. Workout features,
authentication, a database, and a frontend are not implemented yet. The server
starts, but there are no application endpoints; `/` returns HTTP 404.

## Prerequisites

- JDK 21 (`java -version`). Set `JAVA_HOME` to your JDK 21 installation.
- Git and internet access for the first build to download Maven and dependencies.

The checked-in Maven wrapper selects Maven 3.10.0; a separate Maven installation
is unnecessary. On Windows, replace `./mvnw` with `.\mvnw.cmd`.

```sh
git clone https://github.com/dhrutiv1129/SpotMe.git
cd SpotMe/backend
```

## Build

From `backend/`, compile, test, package, and generate coverage in one command:

```sh
./mvnw --batch-mode clean verify
```

The runnable JAR is `backend/target/backend-0.0.1-SNAPSHOT.jar` (relative to
the repository root). Build output is ignored by Git. The Spring Boot parent
currently uses `4.2.0-SNAPSHOT`, so dependency resolution can change between
builds and requires access to the configured Spring snapshot repository.

## Test

From `backend/`:

```sh
./mvnw --batch-mode test
# Run only the enabled application smoke tests:
./mvnw --batch-mode -Dtest=BackendApplicationTests test
```

There are two enabled Spring context smoke tests and 78 deliberately disabled
feature test contracts. Skipped contracts do not verify working features.
Tests need no database, credentials, or running server. Surefire results are in
`backend/target/surefire-reports/`; after `verify`, open
`backend/target/site/jacoco/index.html` for coverage. See
[backend testing](backend/TESTING.md) for scope and how to add tests.

## Run

From `backend/`, start the development server:

```sh
./mvnw spring-boot:run
```

Or, after building, run the packaged application:

```sh
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

The server listens on `http://localhost:8080`. A startup message containing
`Started BackendApplication` confirms it is running. `curl -i
http://localhost:8080/` returns 404 because no controllers exist yet. Stop it
with Ctrl+C. To use another port, run
`java -jar target/backend-0.0.1-SNAPSHOT.jar --server.port=8081`.

## Continuous integration

[Backend CI](https://github.com/dhrutiv1129/SpotMe/actions/workflows/ci.yml)
runs on pushes to `main`, pull requests targeting `main`, and manual runs.
It provisions Java 21 and runs the same `./mvnw --batch-mode clean verify`
command. Build errors and enabled test failures fail the job. Download
`backend-test-results` and `backend-jacoco-coverage` from the workflow run
to inspect test results and coverage; uploads are attempted even on failure.

## Version control and bug tracking

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, commit, review, and
verification process. Track defects in
[GitHub Issues](https://github.com/dhrutiv1129/SpotMe/issues) using the bug
report template, and link fixes to their issue in the pull request.
