# SpotMe UI refinement

## Architecture and baseline

The Expo / React Native app starts in `frontend/index.ts`, wraps `App.tsx` in
`PhonePreview`, and uses local screen state rather than a routing dependency.
`App.tsx` is the connected beta application. It calls the existing API and
persists drafts through `src/beta/draft.ts`. Keep those contracts unchanged.

The repository also contains reusable feature screens and `ProgressNavigator`.
They expose callback-driven interfaces; some capabilities are not connected to
the live beta entry point. Preserve those interfaces and screens rather than
claiming they are live or wiring new behavior as part of visual work.

Before this refinement, TypeScript and all four desktop/phone Playwright tests
passed on the usability branches. The tests cover account creation, exercise
search and filters, tab navigation, input preservation, alternatives and guides,
saving and reloading workouts, history, progress, optional metric help, and retry
of a lost save response. These are the functional regression baseline.

## User-facing inventory

| Surface | Existing interactions to preserve | Primary task |
| --- | --- | --- |
| Account | Sign in, register, session restore, retry initialization, sign out | Access account |
| Home | Start/continue workout, history and progress links | Resume or start training |
| Workout | Search, muscle/equipment filters, select exercises, weight/reps entry, log/edit/remove draft sets, how-to instructions, local persistence | Log a set |
| Review | Set summary, continue training, save, confirm ambiguous save safely | Save workout |
| Alternatives | Open through Swap exercise, choose equipment and beginner filter, request recommendations, select result, return to equipment | Find a usable substitute |
| Exercise guide | Instructions, retain original or choose replacement; retain previously logged sets | Understand/select an exercise |
| History and detail | Empty state, saved sessions, per-session sets and totals, links to progress | Review saved training |
| Progress | Choose exercise, records, estimate chart, session changes, optional definitions, empty state | Understand improvement |
| Shared navigation | Home, Workout, History, Progress; busy states and pending-save routing | Switch tasks |
| Reusable workout screens | Active/paused workout, rest/skip, full plan, edit/remove sets, pause/resume, discard confirmation, save for later | Preserve existing callback workflows |
| Reusable progress screens | Strength/consistency tabs, exercise selector, load history, calendar/month/day sheet, goal editor and saving | Preserve existing callback workflows |
| Plan/review/saved screens | Plan targets, save/start, review, confirmation and summaries | Preserve existing callback workflows |

## Findings

- The current theme is cream/white and forest green. The user's explicit dark
  charcoal/lime direction takes priority. Existing dark brand colors and lime
  can be reused as semantic surfaces and action colors.
- Colors exist as shared tokens, but spacing, type, radii, control dimensions,
  and light-only foreground pairings are repeated across components.
- Some inputs use 10 px labels; some secondary links and metadata are too small.
  Account inputs use placeholders as their only visible labels.
- The app mixes oversized hero panels with dense wrapped exercise chips; the
  selected exercise and Log set action sit after the full exercise library.
- Repeated back/home links compete with persistent tabs. Keep destinations and
  callbacks while refining their presentation in a later screen-focused PR.
- Dark migration must distinguish text-on-action, text-on-hero, and surface
  colors. Simply changing surface tokens would make existing hero text unreadable.
- Sheets use slide animation regardless of reduced-motion preferences. Fixed
  top/bottom padding and the desktop phone frame need safe-area/short-screen work.
- No full accessibility audit exists. Contrast measurements, keyboard focus,
  touch targets, small viewports, and text growth require explicit checks.

## Review-sized sequence

1. **Foundation:** semantic dark colors using existing brand palette; shared
   spacing/type/radius/control tokens; buttons, numeric inputs, app shell and
   phone preview; fix color pairings affected by the shared theme. Review first.
2. **Logging and discovery:** prioritize selected exercise and Log set; keep
   search/filter and all set actions available with less scrolling. Review.
3. **Home, account, navigation:** refine hierarchy, labels, responsive spacing,
   safe areas, and task entry points without changing authentication. Review.
4. **Progress/history:** prioritize meaningful improvement and saved sessions;
   keep beginner explanations optional and preserve all detail. Review.
5. **Alternatives/guides and remaining reusable screens:** align surfaces,
   typography, sheets, calendar/goal and plan views. Review.
6. **Cross-screen verification:** regression suite, export, phone widths,
   large text/reflow, keyboard/focus and contrast; record remaining limits.

## Foundation acceptance and limits

Use lime for primary actions, selected states, and progress. Use neutral text
for ordinary labels and secondary actions. Aim for 48 px minimum shared touch
targets and normal text contrast at least 4.5:1. These are implementation targets,
not a claim that the app meets all WCAG requirements.

Reference: [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
and [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Do not change backend, dependencies, API schemas, auth, calculations, save keys,
or draft behavior. Do not remove dormant screens or their callback contracts.

## Foundation review checkpoint

Implemented on `feat/design-system-foundation`, based on the reviewed usability
branches. No backend or workflow handlers changed. Shared dark tokens use the
existing charcoal, forest, lime, cream, and sage colors. Explicit on-action and
on-hero foregrounds repair the old light-only pairings, including reusable
screens. Calendar activity levels retain distinct surface colors.

Added spacing/type/radius/control tokens. Shared buttons have a 48 px minimum
height, neutral secondary text, pressed/disabled/loading states, and a visible
focus outline. Numeric fields have persistent 14 px labels, 52 px minimum height,
error semantics, and a focus outline. The app shell uses the common type scale
and dark status bar; desktop phone framing follows the dark theme.

Checks performed:

- TypeScript: passed.
- Existing Playwright desktop/phone suite: all 4 passed.
- Production web export: passed.
- Visual screenshots inspected for Home, logging form, alternatives, and guide.
- Browser checks at 320, 390, 430, and 1280 px widths: no document horizontal
  overflow in the checked logging view; numeric fields remain 52 px tall with
  a visible 2 px focus outline. Horizontal equipment lists intentionally scroll.
- Measured contrast: body/surface 12.80:1; supporting text/surface 7.69:1;
  primary action text/lime 13.21:1; selected tab text/surface 7.57:1;
  white/destructive button 5.79:1. These sample pairings are not an app-wide audit.

Remaining: logging still puts the exercise catalog ahead of the selected set
form; account labels, safe areas, short-height frames, large text, keyboard tab
behavior, screen-reader/native-device testing, reduced motion, and remaining
screen hierarchy will be handled in subsequent focused updates. The existing
web preview remounts the application when crossing its 480 px phone-frame
breakpoint; review its presentation separately without changing draft behavior.
