# Form Coach MVP: operation and testing

## Scope and architecture

Form Coach supports **one person performing Bodyweight Squat, side view, without
weights**. It is an experimental browser-only feature in the existing Expo app.
The native screen explains how to open it on the web; it does not attempt native
video analysis. Other screens and the Spring Boot API remain in place.

The selected file is held through a temporary browser object URL. No video,
frames, landmarks, or results are sent to SpotMe's backend, logged, saved in
browser storage, or permanently stored. Removing a video, selecting another,
leaving the screen, or cancelling aborts pending work and releases its temporary
resources. The MediaPipe landmarker is reused across frames of one analysis and
closed afterward. The downloaded SDK may remain loaded for another analysis;
normal browser caching of public assets is allowed. Results are not persisted.

The exact `@mediapipe/tasks-vision` dependency is 1.2.3. Its official classic browser
bundle is loaded from version-pinned jsDelivr because Metro cannot bundle its
internal dynamic WASM imports. TypeScript uses the installed package's types.
WASM comes from that same version on jsDelivr; the version-1 float16 lite pose
model comes from Google's public model bucket. These are public asset requests,
not video uploads. A network connection is needed for uncached assets. A failed
or timed-out download produces a retryable error; there is no fallback fake data.
No API keys, additional servers, or Python services are required.

Modules under `frontend/src/form-coach/` separate configuration, angle mathematics,
landmark filtering, repetition detection, feedback, video validation/decoding,
SDK loading, and analysis orchestration. UI is in `FormCoachScreen.web.tsx`, with
a native fallback `FormCoachScreen.tsx`. Navigation is added to `App.tsx`.

Official runtime documentation:
https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker?tab=Web

## Install and run

Use the repository's JDK 21+ and Node 24 setup.

```sh
cd frontend
npm ci
```

Start the existing backend from the repository root:

```sh
cd backend
./mvnw spring-boot:run
```

In another terminal:

```sh
cd frontend
EXPO_PUBLIC_API_URL=http://localhost:8080 npm run web
```

Open http://localhost:8081 in a current Chrome or compatible browser, sign in or
create an account, select **You → Form Analysis · Bodyweight Squat**. You can also
open **Review video form** after selecting Bodyweight squat in an active workout.
The workout draft remains unchanged. No automatic analysis starts upon upload.

## Real-video procedure

1. Record from the side with your entire body visible. Keep the camera stationary,
   use good lighting, and perform 3–5 slow bodyweight squats. Include a clear
   standing position at the beginning and between movements. Show only one person
   and do not use weights.
2. Use a clip at most 30 seconds and 50 × 1024 × 1024 bytes (the UI calls this
   50 MB). MP4/H.264 and WebM are recommended. MOV, M4V and Ogg are accepted only
   if the browser can decode their format/codec. File extension alone cannot
   guarantee compatibility. Live streams or files with an unknown/infinite
   duration are rejected; re-export these to a finalized MP4 or WebM.
3. Select **Upload Video**. Check the preview and recording instructions. Read the
   visible disclaimer and confirm the clip shows a side-view bodyweight squat.
4. Select **Analyze Video**. Model loading is asynchronous; the progress message
   then reports sampled-frame processing. CPU inference can take longer than the
   video's playback time on a phone. Keep this tab active. Cancel/remove works
   between inference calls; an individual synchronous inference cannot be interrupted.
5. Read tracking quality before interpreting measurements. Unreliable tracking
   produces an explanation and a dash for the count, never an invented count.
   Adequately tracked clips without a complete recognized movement can show zero
   detected repetitions; that does not prove the clip contains no movement.
6. Compare the counted repetitions to a **manually counted** total. Review the
   start/end timestamps for each detected rep and note any missed/merged reps.
7. Use **Analyze Another Video** to reset, or **Remove video** before reselecting.
   A model/download failure leaves a retry option and preserves the preview.

The full educational disclaimer is visible before analysis and with results.
No results predict injuries or label a squat safe, correct, or appropriate.

## How the measurements work

- The video decoder seeks through about 10 frames per second. Actual seek
  timestamps must increase; duplicate positions are excluded. It analyzes real
  decoded frames, not screenshots or a prerecorded analysis sequence.
- MediaPipe is configured to detect up to two poses. Frames with no pose or more
  than one detected person are excluded.
- Left and right shoulder/hip/knee/ankle visibility scores are accumulated over
  the clip. The most consistently visible side is used for the entire analysis;
  it never substitutes the other leg during an occlusion. Missing confidence,
  low visibility/presence, invalid coordinates, and off-frame core joints are
  excluded. Heel/foot landmarks are not used to infer heel lift or load distribution.
- Coordinates are normalized 2D image coordinates. The x coordinate is adjusted
  for source width/height before calculating vector angles, avoiding distortion
  from a non-square frame. Perspective, camera position, baggy clothing and pose
  errors still affect accuracy. No 3D biomechanical reconstruction is performed.
- The knee angle uses hip–knee–ankle; the hip angle uses shoulder–hip–knee. Both are
  interior angles in [0, 180] degrees, **not anatomical flexion measured from
  zero in a straight leg**. A knee angle of 180° is approximately straight;
  smaller angles represent greater bend. Zero-length/invalid vectors return no
  measurement. Knee minima use a three-sample median filter; hip minima use valid
  observations. The UI reports these as estimates.
- A simple shoulder/hip-width heuristic excludes obvious frontal views when both
  sides are visible. It does **not** reliably determine camera orientation or
  identify the exercise. Wrong-angle clips can still pass; user confirmation is
  required. Weighted squats and other movements are unsupported, not automatically
  recognized or classified by this model.

Experimental defaults are centralized in `config.ts`:

| Setting | Default |
| --- | --- |
| Required landmark visibility/presence | 0.65 |
| Near standing / leave standing | 160° / below 150° |
| Enter flexed region / exit bottom | at most 110° / at least 118° |
| Upright confirmation | 2 consecutive valid smoothed samples |
| Minimum movement | 0.8 seconds, 7 valid moving samples |
| Maximum gap to bridge | 0.45 seconds |
| Minimum coverage for usable results | 15 valid samples and 65% of sampled frames |
| Rep-minimum consistency spread | at most 15° |

These are engineering heuristics, not universal squat-depth targets. The state
machine is STANDING → DESCENDING → BOTTOM → ASCENDING → STANDING. It must see an
initial standing position and sufficient observations before counting a completed
movement. Missing data beyond the permitted gap resets the candidate movement.
A final incomplete rep is excluded. Repeated bounces without standing remain one
movement and produce a completion observation. Smaller intended ranges of motion
can go uncounted without being incorrect technique. Hip measurements are reported
without prescribing a target. Tracking quality refers to sample coverage and gaps,
not a calibrated probability of counting accuracy or technique correctness.

## Invalid-video checks

- Select a text/image file: unsupported format message, analysis disabled.
- Select an empty file or a corrupted `.mp4`: useful unreadable/decode message.
- Select a file larger than 50 MB: rejected before browser decoding/model loading.
- Select a 31-second clip: rejected after metadata decoding, before model loading.
- Try a codec your browser cannot decode: a format/decode error and another upload option.
- Block jsDelivr or Google model requests in developer tools, then analyze: model
  error, no results; unblock and use **Retry Analysis**.
- Remove/cancel during metadata or model loading and while processing frames;
  select another clip. Previous work must not replace the new preview/results.
- Leave Form Coach during analysis, return, and upload another clip.
- Inspect Network: video media reads use `blob:` URLs. External requests are GETs
  for the SDK, WASM and model. No request body should contain a video or frame.

## Automated checks

From `frontend/`:

```sh
npm run test:form
npm run typecheck
npm run export:web
npm run test:e2e
```

`test:form` uses the existing Playwright runner in Node, without starting a
browser/backend or downloading a model. It covers vector angles, confidence and
aspect handling, side selection, repetition/noise/missing-frame cases, measurable
feedback, file limits, decode errors, model failure, and cleanup/cancellation.

`test:e2e` keeps the existing beta integration tests and adds desktop/phone Form
Coach browser checks. Form Coach UI tests use a mocked account/API and explicitly
intercepted synthetic pose SDK, with the real CC0 flower MP4 for browser decoding
and preview. They check explicit analysis, invalid files, retry, measured results,
cancellation, and reset. No production feature path injects synthetic landmarks.
These deterministic tests do not measure MediaPipe's exercise accuracy.

Optional smoke check with the **real** public SDK, WASM, and pose model:

```sh
FORM_COACH_REAL_MODEL=1 npm run test:e2e -- --project desktop --grep 'real MediaPipe'
```

This downloads model assets and analyzes the flower fixture, expecting unreliable
tracking because there is no person. It checks runtime integration, not squat
accuracy. It is skipped in the normal offline/deterministic suite and CI.

CI runs `test:form` in addition to the existing frontend typecheck, export,
browser tests and backend verification. The testing fixture's attribution is in
`frontend/e2e/fixtures/README.md`.

## Manual exercise checklist and accuracy record

Use consenting participants; keep test recordings outside git. For each clip,
record browser/device, camera placement, lighting, manually counted complete reps,
detected reps, tracking coverage, and mismatched rep timestamps. Compare every
count with a human review before making any accuracy statement.

- [ ] 3–5 normal side-view bodyweight squats, upright at start/end.
- [ ] Varying intended squat depth: observe per-rep minima and range comparison.
- [ ] Incomplete final rep and bounces without full upright return.
- [ ] No squats (standing/still): no completed reps.
- [ ] Person partially out of frame or joints occluded: quality warning/exclusions.
- [ ] Wrong camera angle: note whether rejected; the orientation heuristic is limited.
- [ ] Poor lighting: low confidence should reduce coverage or prevent results.
- [ ] Person already crouching at clip start: don't count the initial ascent as a rep.
- [ ] A second person in frame: ambiguous frames are excluded when detected.
- [ ] Smaller intended range of motion: document missed reps without labeling depth wrong.
- [ ] Remove, retry, cancel, repeated upload, and leave/return on desktop and mobile.

**Validation status:** no participant squat-video accuracy evaluation is included.
Synthetic tests and a no-person runtime smoke check cannot establish real-world
rep-counting accuracy. Thresholds need evaluation against manually labeled exercise
clips across people, camera setups and ranges of motion before making such claims.

## Implementation verification record (2026-11-14)

Executed locally:

- `npm run typecheck`: passed.
- `npm run export:web`: passed.
- `npm run test:form`: 35 passed.
- `npm run test:e2e`: 12 passed; 2 opt-in real-model cases skipped by default.
- Real-model desktop smoke command above: 1 passed with the real SDK, WASM,
  pose model, and decoded CC0 flower video.
- Final phone results-layout browser check: 1 passed.
- `./mvnw -o --batch-mode verify` in `backend/`: build success; 131 tests reported,
  0 failures/errors, 25 skipped. It required running outside the filesystem sandbox
  so Mockito could attach its test agent.

GitHub-hosted CI was updated but has not been executed for these uncommitted changes.
No real-person squat recordings were used for accuracy validation.

## Created and modified files

Created:

- `frontend/src/form-coach/config.ts`: shared text and experimental thresholds.
- `frontend/src/form-coach/angles.ts`: reusable joint-angle mathematics.
- `frontend/src/form-coach/landmarks.ts`: side selection and confident 2D measurements.
- `frontend/src/form-coach/repetitions.ts`: smoothed repetition state machine.
- `frontend/src/form-coach/feedback.ts`: measured summaries and observations.
- `frontend/src/form-coach/video.ts`: upload limits, metadata, decoding, seeking, cleanup.
- `frontend/src/form-coach/visionSdk.ts`: asynchronous pinned browser SDK loader.
- `frontend/src/form-coach/pose.ts`: actual MediaPipe Pose Landmarker adapter.
- `frontend/src/form-coach/analyze.ts`: sampled-frame analysis orchestration.
- `frontend/src/screens/FormCoachScreen.web.tsx`: browser upload/preview/results flow.
- `frontend/src/screens/FormCoachScreen.tsx`: native browser-only explanation.
- `frontend/tests/form-coach/analysis.spec.ts`: independent mathematical/pipeline tests.
- `frontend/playwright.form.config.ts`: existing runner configured for logic tests.
- `frontend/e2e/form-coach.spec.ts`: browser validation, retry, cancellation and runtime tests.
- `frontend/e2e/fixtures/flower.mp4` and `README.md`: real decoder fixture and attribution.
- `docs/FORM_COACH_TESTING.md`: this guide.

Modified:

- `frontend/App.tsx`: two navigation entry points and return navigation.
- `frontend/package.json` and `package-lock.json`: exact MediaPipe dependency and logic-test command.
- `.github/workflows/ci.yml`: run the new logic suite before existing browser checks.
- `readme.md`: entry point, scope, and guide link.

No backend source or API changes were needed. No changes were committed or pushed.
