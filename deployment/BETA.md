# SpotMe private beta

The beta connects account registration/login, workout entry and history, exercise progress,
and equipment-filtered replacements. It uses the merged domain services. All weights are
external load in **lb**. The seed catalog has twelve exercises and same-muscle replacement
relationships; review these examples before expanding the catalog.

## Run on this computer

Requires JDK 21+ and Node 24. Install the locked frontend dependencies once:

```sh
cd frontend
npm ci
```

In one terminal:

```sh
cd backend
./mvnw spring-boot:run
```

In another:

```sh
cd frontend
EXPO_PUBLIC_API_URL=http://localhost:8080 npm run web
```

Open http://localhost:8081. Create an account using a unique email and a password of
12–72 UTF-8 bytes. No real email is sent. Select an exercise, log sets, optionally choose
available equipment and swap an exercise, review, and save. Choose the exercise under
Progress to see per-session estimates and personal records. History opens saved workouts.
Only completed sets are submitted. Sets already logged keep their original exercise when
another exercise is substituted.

The local database is `backend/data/beta/spotme.mv.db`. Original `backend/data/spotme.*`
files are not used or migrated. Flyway applies versioned migrations automatically. Do not
edit an applied migration; add a new numbered migration. Back up the local database only
while the backend is stopped. Hosted PostgreSQL needs its own backup policy.

## Run on a phone

Use an Expo Go version supporting SDK 58, or an Expo development build. On your computer:

```sh
cd backend
SERVER_ADDRESS=0.0.0.0 ./mvnw spring-boot:run
```

```sh
cd frontend
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:8080 npm start
```

Connect the phone and computer to the same trusted network and open the Expo QR code.
Local HTTP is for development; a shared release must use HTTPS. Native sessions use
Expo SecureStore. Browser tokens use sessionStorage and survive reloads in the same tab;
closing the tab requires signing in again. Sessions expire after seven days and logout
revokes the token. Logged workout drafts are stored separately per account on the device.
Do not use a shared device for private workout drafts.

## Checks

```sh
cd backend
./mvnw --batch-mode clean verify
```

The default suite uses an isolated in-memory database, not your Supabase project.
The opt-in database connectivity tests require `RUN_POSTGRES_TESTS=true`, `DATABASE_URL`,
`DATABASE_USERNAME`, and `SUPABASE_DB_PASSWORD`; they initialize the `spotme_beta` schema,
so run them only against a dedicated beta/test database.

```sh
cd frontend
npm run typecheck
npm run export:web
npx expo export --platform ios --platform android --output-dir dist-native
```

With the backend on port 18080 and frontend on 8081 configured for that backend:

```sh
cd frontend
npm run test:e2e
```

The browser tests use installed Google Chrome and create synthetic accounts and workouts
in the local beta database. They verify registration/login, replacement selection, saving,
progress, draft recovery, and retry behavior. Never run them against a production database.

## Container deployment files

The Dockerfiles and `compose.yaml` provide a web client, Java backend, and PostgreSQL.
Docker is required; it is not installed in the development environment used for this work.
Copy `.env.example` to `.env`, set a strong `BETA_DATABASE_PASSWORD`, then:

```sh
docker compose up --build
```

Open http://localhost:8080. The frontend proxies `/api` to the backend so browser API calls
use the same origin. Only the frontend port is published, bound to loopback. PostgreSQL
uses a named volume; stopping containers preserves the database. Do not run
`docker compose down -v` unless you intend to erase that database.

For hosting, put an HTTPS reverse proxy in front of the frontend, configure its domain,
and use a dedicated PostgreSQL database with automated backups. The backend's `postgres`
profile requires `DATABASE_URL` (a JDBC URL with TLS for remote databases),
`DATABASE_USERNAME`, and `SUPABASE_DB_PASSWORD`. Flyway and queries use the separate
`spotme_beta` schema; the database role needs permission to create that schema and its
objects. Existing public tables are not imported. Restrict `ALLOWED_ORIGINS` to your web
origin. Keep database credentials on the backend only. Native builds need the public HTTPS
API URL set through `EXPO_PUBLIC_API_URL` at build time.

## Release limits to resolve before inviting external testers

This is a private beta implementation, not a public account service. There is no password
reset or email verification yet. Agree on tester support and account recovery before inviting
people. Authentication throttling is in-process (30 login/registration attempts per IP per
15 minutes); a multi-instance public deployment needs shared throttling at the edge.
When using a reverse proxy, configure rate limiting there because the app sees the proxy IP.
The twelve-exercise catalog needs a product/content review. Progress is an estimate, not
an instruction to attempt a maximum lift. Choose a single unit; this version does not convert
old data in other units.

The repository retains the existing Spring Boot snapshot parent. Test the container build
and PostgreSQL migrations on the chosen host before release. Native iOS/Android bundles build locally, but device behavior and store distribution
still require device/build verification. Expo's current
CLI dependency chain reports moderate glob/minimatch advisories; these are build-tool
dependencies. Review upstream patches rather than applying npm's suggested major downgrade.
