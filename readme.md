# SpotMe

A private beta for signing in, logging workouts, seeing exercise progress, and finding
alternatives when equipment is unavailable.

The React Native/Expo frontend now connects to the Spring Boot API. PostgreSQL and local
H2 persistence use versioned Flyway migrations. The backend reuses the team's workout,
analytics, and recommendation services; all workout access uses the authenticated owner.

## Run locally

Requires JDK 21+ and Node 24. Run each code block below in a separate terminal,
starting from the repository root.

Start the backend:

```sh
cd backend
./mvnw spring-boot:run
```

In another terminal, install and start the frontend:

```sh
cd frontend
npm ci
EXPO_PUBLIC_API_URL=http://localhost:8080 npm run web
```

Open http://localhost:8081 and create an account. This version uses pounds (lb).
The local database is `backend/data/beta/spotme.mv.db`; existing older database files
are left untouched. Do not commit `.env` files or database contents.

See [the beta runbook](deployment/BETA.md) for phone setup, PostgreSQL configuration,
container deployment, testing, and release limitations. Dockerfiles and `compose.yaml`
are supplied for a separate web/backend/PostgreSQL environment.

## Build and test

Requires JDK 21+ and Node 24. Run each code block below separately, starting from
the repository root. You do not need to start the app manually first.

### Build backend and run tests

This command cleans previous build output, compiles and packages the backend,
runs enabled tests, and generates a JaCoCo coverage report.

```sh
cd backend
./mvnw --batch-mode clean verify
```

### Check, build, and test the frontend

Install the locked dependencies, check TypeScript types, build the web app, and
run browser integration tests:

```sh
cd frontend
npm ci
npm run typecheck
npm run export:web
npm run test:e2e
```

`typecheck` checks types without generating output. `export:web` builds the web
app into `frontend/dist`. `test:e2e` runs the Playwright browser integration tests.

The browser suite requires Google Chrome and starts local servers if they are not already
running. Backend tests use an isolated in-memory database. Live PostgreSQL connectivity
tests are opt-in; see the runbook. The existing Spring Boot `4.2.0-SNAPSHOT` parent is
retained, so Maven needs access to the Spring snapshot repository.

## API

All `/api` routes require a bearer session except registration and login.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account with email/password |
| POST | `/api/auth/login` | Obtain a revocable seven-day session |
| GET | `/api/auth/me` | Restore the current user |
| POST | `/api/auth/logout` | Revoke the current session |
| GET | `/api/exercises` | Load catalog and required equipment |
| POST | `/api/workouts` | Save a completed workout with an `Idempotency-Key` |
| GET | `/api/workouts` | Current user's saved history |
| GET | `/api/workouts/{id}` | Current user's workout details |
| GET | `/api/progress/{exerciseId}` | Session progress and exercise records |
| GET | `/api/records` | Current user's personal records |
| GET | `/api/exercises/{id}/alternatives?equipment=dumbbell,bodyweight` | Available-equipment replacements |

A workout body contains `date` and `exercises`, each with numeric `exerciseId` and
`sets` containing `reps` and decimal `weight`. There is no caller-supplied user ID.
A retried save must use the same idempotency key and payload. A changed payload with
an already-used key returns 409.

The seed catalog is deliberately small. This private beta has no password reset or email
verification; native-device and hosted PostgreSQL verification remain release steps.
No deployment is performed by adding these files.

## Currently Operational Usecases

| Create an account and sign in | Register with email/password, sign in, restore a valid session, and sign out. |

| Log a workout | Select catalog exercises, enter weight and reps, edit or remove logged sets before saving, and review the workout. |

| Resume a workout draft | Recover logged sets on the same device after reloading and signing into the same account. |

| Save a completed workout | Persist the workout and retry an interrupted save without creating a duplicate. Saving requires a connection to the backend. |

| Review workout history | Browse your saved workouts and open their exercise and set details. |

| View strength progress | Select an exercise to see per-workout estimated one-rep max, training volume, changes from the previous session, and personal records. |

| Find an exercise alternative | Choose available equipment, optionally restrict results to beginner exercises, and select from up to three ranked substitutes. Previously logged sets keep their original exercise. |

| Read exercise instructions | Open the selected exercise's text instructions and equipment requirements. |

The current catalog contains twelve exercises, and all logged weights use pounds
(lb). History and progress are scoped to the signed-in account.

Editing and deleting **saved** workouts are required for the first beta but are
not implemented yet. Consistency tracking (calendar, heatmap, and streaks) is
deferred until after the first beta; its existing services and UI components are
not connected to the beta app. Weekly-goal persistence, video form analysis,
password reset, and email verification are also unavailable.
