# SpotMe user guide

SpotMe helps you record workouts, find replacement exercises when equipment is busy, and review strength and workout frequency. All recorded weights are in pounds (lb).

## Getting started

Open the running SpotMe web app (for local development, http://localhost:8081). If you need to start it yourself, follow the [local setup instructions](../readme.md#run-locally).

1. Choose **New here? Create an account** and enter your email and a password (12–72 UTF-8 bytes).
2. Sign in with your account. Your workouts and progress are associated with that account.
3. Use the home screen to navigate to Train, Progress, and your profile.

## Log and save a workout

1. Open **Train** and choose an exercise from the catalog.
2. Enter the weight and repetitions, then add the set. Repeat for each set or exercise.
3. Edit or remove incorrect sets before saving.
4. Open the workout review, check the entries, and save. Saving requires a backend connection. If a save is interrupted, retry the same workout rather than starting another.
5. An unfinished draft can be recovered on the same device after reloading and signing back into the same account.

## Find an alternative

1. Select the exercise you originally intended to perform.
2. Choose **Find alternatives**.
3. Specify the equipment available to you; optionally restrict results to beginner exercises.
4. Review the ranked suggestions, open the exercise instructions if needed, and select a substitute. Previously logged sets retain their original exercise.

## Review past workouts and progress

- Open workout history and choose a saved workout to see its exercises, weights and repetitions.
- Open **Progress** and select an exercise to see estimated one-rep max, training volume, session changes and personal records. Estimated one-rep max is an estimate, not a recommendation to attempt that weight.
- Open **Progress → Consistency** to view the monthly calendar. Use the month navigation to review earlier activity, and select a completed date to open its workout.

## Experimental form analysis

In the web app, open **You → Form Analysis · Bodyweight Squat**, or choose **Review video form** while logging a bodyweight squat. Select a side-view, unweighted squat video up to 30 seconds and 50 MB, preview it, confirm the recording setup, and choose **Analyze Video**. Results include detected complete repetitions, joint angles, tracking quality and movement observations. Videos are processed in the browser and are not uploaded or permanently stored. Feedback is experimental and educational, not a substitute for professional coaching.

## Current limitations

The exercise catalog is limited. Editing or deleting saved workouts, persistent weekly goals, password reset and email verification are unavailable in the documented beta. The monthly consistency calendar is available; dedicated streak and heatmap displays are not documented as operational. Form analysis supports only side-view bodyweight squats in the browser and requires model/runtime downloads.

## Reporting a problem

Search the [existing issues](https://github.com/dhrutiv1129/SpotMe/issues) before opening a new issue. Use the bug report template if available. Describe what you were doing, the steps to reproduce, what you expected, what actually happened, your browser/device and operating system, and the affected version if known. Include screenshots if helpful, but remove private information and never share passwords or session tokens. See the [bug tracking guidelines](../CONTRIBUTING.md#bug-tracking).
