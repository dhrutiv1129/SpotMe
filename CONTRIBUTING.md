# Contributing

## Version control

1. Start from an up-to-date `main`: `git switch main`, then `git pull --ff-only`.
2. Create a focused branch, for example `git switch -c fix/123-workout-validation`.
3. Keep changes focused on one issue and update documentation when commands or
   behavior change. Never commit credentials, local configuration, or build output.
4. From `backend/`, run `./mvnw --batch-mode clean verify` before submitting.
   Inspect skipped tests as well as failures; pending contracts provide no coverage.
5. Review `git diff` and `git status`, stage the intended files, and make coherent
   commits with descriptive messages, such as `Fix negative workout weight validation`.
6. Push your branch and open a pull request targeting `main`. Explain the problem,
   resulting behavior, and validation performed. Use `Closes #123` when applicable.
7. Require a successful Backend CI run and resolve review feedback before merging.
   Repository administrators should configure the `Backend build and tests` check
   as required in the `main` branch rules; this file does not configure GitHub rules.

## Bug tracking

Search [existing issues](https://github.com/dhrutiv1129/SpotMe/issues) first.
For a new defect, choose the Bug report template and supply reproduction steps,
expected and actual behavior, the affected commit, Java version, OS, and relevant
logs with secrets removed. Record missing features as feature requests rather
than defects in functionality that has not been implemented.

Use the issue discussion to record investigation and acceptance criteria. Link
the fixing pull request, reproduce the defect before fixing it, and add a
regression test when there is implemented behavior to exercise. Verify the fix
and close the issue through the merged pull request.
