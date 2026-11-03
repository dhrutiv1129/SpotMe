# SpotMe

A private beta for signing in, logging workouts, seeing exercise progress, and finding
alternatives when equipment is unavailable.

The React Native/Expo frontend now connects to the Spring Boot API. PostgreSQL and local
H2 persistence use versioned Flyway migrations. The backend reuses the team's workout,
analytics, and recommendation services; all workout access uses the authenticated owner.

## Run locally

Requires JDK 21+ and Node 24. Start the backend:

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

## Validate

```sh
cd backend
./mvnw --batch-mode clean verify
```

```sh
cd frontend
npm run typecheck
npm run export:web
npm run test:e2e
```

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
