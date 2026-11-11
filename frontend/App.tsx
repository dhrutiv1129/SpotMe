import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button, NumberField } from "./src/components/WorkoutControls";
import { WorkoutForm, validateSetInput } from "./src/components/WorkoutForm";
import { AlternativesModel } from "./src/components/AlternativesModel";
import { ExerciseGuideScreen } from "./src/screens/ExerciseGuideScreen";
import { api, ApiError, restoreToken, storeToken } from "./src/beta/api";
import type {
  Alternative,
  Exercise,
  Progress,
  User,
  Workout,
} from "./src/beta/api";
import { loadDraft, newDraft, payload, persistDraft } from "./src/beta/draft";
import type { Draft } from "./src/beta/draft";
import { colors } from "./src/theme";

type Screen =
  | "home"
  | "workout"
  | "review"
  | "alternatives"
  | "guide"
  | "history"
  | "detail"
  | "progress";
const number = (value: number | null | undefined) =>
  value == null
    ? "—"
    : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
const volume = (workout: { exercises: Draft["exercises"] }) =>
  workout.exercises.reduce(
    (sum, e) => sum + e.sets.reduce((n, s) => n + s.weight * s.reps, 0),
    0,
  );

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(newDraft);
  const draftRef = useRef(draft);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [history, setHistory] = useState<Workout[]>([]);
  const [detail, setDetail] = useState<Workout | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [guide, setGuide] = useState<Exercise | null>(null);
  const [available, setAvailable] = useState<string[]>([
    "bodyweight",
    "dumbbell",
  ]);
  const [beginner, setBeginner] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function run(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Please try again.",
      );
      if (failure instanceof ApiError && failure.status === 401 && user) {
        await storeToken(null);
        setUser(null);
        setReady(false);
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function initialize(account: User) {
    setReady(false);
    setUser(account);
    const [exercises, saved] = await Promise.all([
      api<Exercise[]>("/exercises"),
      loadDraft(account.id),
    ]);
    setCatalog(exercises);
    setDraft(saved);
    draftRef.current = saved;
    setSelected(saved.exercises[0]?.exerciseId ?? null);
    setScreen(saved.pending ? "review" : "home");
    setReady(true);
  }
  async function boot() {
    setBooting(true);
    setError("");
    try {
      if (await restoreToken()) await initialize(await api<User>("/auth/me"));
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) {
        await storeToken(null);
        setUser(null);
      } else
        setError(
          failure instanceof Error ? failure.message : "Unable to load SpotMe.",
        );
    } finally {
      setBooting(false);
    }
  }
  useEffect(() => {
    void boot();
  }, []);

  // Serialize device writes; a save waits until its retry key and exact payload are durable.
  async function updateDraft(value: Draft) {
    if (!user) return;
    const owner = user.id;
    writes.current = writes.current
      .catch(() => {})
      .then(() => persistDraft(owner, value));
    await writes.current;
    draftRef.current = value;
    setDraft(value);
  }
  function editDraft(change: (value: Draft) => Draft) {
    void run(async () => {
      if (draftRef.current.pending)
        throw new Error(
          "Confirm the pending save before editing this workout.",
        );
      await updateDraft(change(draftRef.current));
    });
  }
  async function authenticate() {
    await run(async () => {
      const session = await api<{ token: string; user: User }>(
        `/auth/${register ? "register" : "login"}`,
        { method: "POST", body: { email, password } },
      );
      await storeToken(session.token);
      setPassword("");
      await initialize(session.user);
    });
  }
  const exercise = catalog.find((e) => e.id === selected);
  const entry = draft.exercises.find((e) => e.exerciseId === selected);
  const equipment = [...new Set(catalog.flatMap((e) => e.requiredEquipment))];
  const muscleGroups = [...new Set(catalog.map((e) => e.muscleGroup))];
  const matchingExercises = catalog.filter(
    (e) =>
      e.name.toLowerCase().includes(exerciseQuery.trim().toLowerCase()) &&
      (muscleFilter === null || e.muscleGroup === muscleFilter) &&
      (equipmentFilter === null ||
        e.requiredEquipment.includes(equipmentFilter)),
  );
  function clearExerciseFilters() {
    setExerciseQuery("");
    setMuscleFilter(null);
    setEquipmentFilter(null);
  }
  const exerciseName = (id: number) =>
    catalog.find((e) => e.id === id)?.name || `Exercise ${id}`;
  function navigate(next: Screen) {
    setError("");
    setNotice("");
    setScreen(next);
    setEditing(null);
  }
  function addExercise(id: number) {
    editDraft((d) => ({
      ...d,
      exercises: d.exercises.some((e) => e.exerciseId === id)
        ? d.exercises
        : [...d.exercises, { exerciseId: id, sets: [] }],
    }));
    setSelected(id);
    setEditing(null);
    setWeight("");
    setReps("");
  }
  async function showAlternatives() {
    await run(async () => {
      if (!exercise) return;
      const result = await api<Alternative[]>(
        `/exercises/${exercise.id}/alternatives?equipment=${available.map(encodeURIComponent).join(",")}&beginnerOnly=${beginner}`,
      );
      setAlternatives(result);
      navigate("alternatives");
    });
  }
  async function save() {
    await run(async () => {
      const current = draftRef.current;
      if (!payload(current).exercises.length)
        throw new Error("Log at least one set before saving.");
      const pending = { ...current, pending: true };
      await updateDraft(pending);
      let saved: Workout;
      try {
        saved = await api<Workout>("/workouts", {
          method: "POST",
          body: payload(pending),
          key: pending.key,
        });
      } catch (failure) {
        // Explicit validation rejection cannot have committed; ambiguous failures retain the frozen payload.
        if (failure instanceof ApiError && failure.status === 400)
          await updateDraft({ ...pending, pending: false });
        throw failure;
      }
      await updateDraft(newDraft());
      setDetail(saved);
      setSelected(null);
      navigate("detail");
      setNotice("Workout saved.");
    });
  }
  async function showHistory() {
    await run(async () => {
      setHistory(await api<Workout[]>("/workouts"));
      navigate("history");
    });
  }
  async function showProgress(id: number) {
    await run(async () => {
      setProgress(await api<Progress>(`/progress/${id}`));
      navigate("progress");
    });
  }
  async function logout() {
    await run(async () => {
      await writes.current;
      await api("/auth/logout", { method: "POST" });
      await storeToken(null);
      setUser(null);
      setReady(false);
      setCatalog([]);
      setHistory([]);
      setDetail(null);
      setProgress(null);
      setDraft(newDraft());
    });
  }

  const alert = error ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {error}
    </Text>
  ) : null;
  const loading = busy ? (
    <ActivityIndicator accessibilityLabel="Loading" color={colors.green} />
  ) : null;
  if (booting)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Opening SpotMe…</Text>
      </View>
    );
  if (!user)
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.auth}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.brand}>SPOTME / PRIVATE BETA</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Show up. Get stronger.
          </Text>
          <Text style={styles.body}>
            Log your training, see your progress, and keep moving when a machine
            is busy.
          </Text>
          <Text style={styles.heading}>
            {register ? "Create your account" : "Welcome back"}
          </Text>
          <TextInput
            accessibilityLabel="Email"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Password"
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoComplete={register ? "new-password" : "current-password"}
            style={styles.input}
          />
          {alert}
          <Button
            label={register ? "Create account" : "Sign in"}
            busy={busy}
            disabled={!email || !password}
            onPress={() => {
              void authenticate();
            }}
          />
          <Button
            label={
              register
                ? "Already have an account? Sign in"
                : "New here? Create an account"
            }
            variant="text"
            disabled={busy}
            onPress={() => {
              setRegister(!register);
              setError("");
            }}
          />
          {!!error && (
            <Button
              label="Retry connection"
              variant="text"
              onPress={() => {
                void boot();
              }}
            />
          )}
          <Text style={styles.small}>
            Use one weight unit throughout: pounds (lb). Native sessions last up
            to 7 days; browser sessions stay in this tab.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  if (!ready)
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>Finish loading your account</Text>
        {alert}
        <Button
          label="Retry"
          busy={busy}
          onPress={() => {
            void run(() => initialize(user));
          }}
        />
        <Button
          label="Sign out"
          variant="text"
          onPress={() => {
            void logout();
          }}
        />
      </View>
    );

  let content: React.ReactNode;
  if (screen === "home")
    content = (
      <>
        <Text accessibilityRole="header" style={styles.title}>
          Make today count.
        </Text>
        <Text style={styles.body}>{user.email}</Text>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Your next rep starts here.</Text>
          <Text style={styles.heroText}>
            A simple log. A clearer view of your progress. A backup plan for
            busy equipment.
          </Text>
          <Button
            label={
              draft.exercises.length ? "Continue workout" : "Start a workout"
            }
            onPress={() => navigate(draft.pending ? "review" : "workout")}
          />
        </View>
        <Button
          label="Workout history"
          variant="secondary"
          onPress={() => {
            void showHistory();
          }}
        />
        <Text style={styles.heading}>See your progress</Text>
        <Text style={styles.body}>
          Choose an exercise to see your logged sessions and personal records.
        </Text>
        <View style={styles.wrap}>
          {catalog.map((e) => (
            <Chip
              key={e.id}
              label={e.name}
              onPress={() => {
                void showProgress(e.id);
              }}
            />
          ))}
        </View>
        <Button
          label="Sign out"
          variant="text"
          disabled={busy}
          onPress={() => {
            void logout();
          }}
        />
      </>
    );
  else if (screen === "workout")
    content = (
      <>
        <Text accessibilityRole="header" style={styles.title}>
          Your workout
        </Text>
        <Text style={styles.body}>
          Date: {draft.date} · All weights in lb. Logged sets are saved on this
          device until you finish.
        </Text>
        <Text style={styles.heading}>Choose an exercise</Text>
        <TextInput
          accessibilityLabel="Search exercises by name"
          placeholder="Search exercises by name"
          value={exerciseQuery}
          onChangeText={setExerciseQuery}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Text style={styles.small}>Muscle group</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.wrap}
        >
          <Chip
            label="All muscles"
            selected={muscleFilter === null}
            onPress={() => setMuscleFilter(null)}
          />
          {muscleGroups.map((group) => (
            <Chip
              key={group}
              label={group}
              selected={muscleFilter === group}
              onPress={() => setMuscleFilter(group)}
            />
          ))}
        </ScrollView>
        <Text style={styles.small}>
          Equipment · other equipment may also be required
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.wrap}
        >
          <Chip
            label="All equipment"
            selected={equipmentFilter === null}
            onPress={() => setEquipmentFilter(null)}
          />
          {equipment.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={equipmentFilter === item}
              onPress={() => setEquipmentFilter(item)}
            />
          ))}
        </ScrollView>
        <Text accessibilityLiveRegion="polite" style={styles.small}>
          {matchingExercises.length}{" "}
          {matchingExercises.length === 1 ? "exercise" : "exercises"} found
        </Text>
        {(exerciseQuery !== "" ||
          muscleFilter !== null ||
          equipmentFilter !== null) && (
          <Button
            label="Clear search and filters"
            variant="text"
            onPress={clearExerciseFilters}
          />
        )}
        {matchingExercises.length === 0 && (
          <Text style={styles.body}>
            No exercises match. Try another name or clear your filters.
          </Text>
        )}
        <View style={styles.wrap}>
          {matchingExercises.map((e) => (
            <Chip
              key={e.id}
              label={e.name}
              selected={selected === e.id}
              disabled={busy || draft.pending}
              onPress={() => addExercise(e.id)}
            />
          ))}
        </View>
        {entry && exercise && (
          <>
            <WorkoutForm
              key={exercise.id}
              exercise={{
                id: String(exercise.id),
                name: exercise.name,
                position: draft.exercises.indexOf(entry) + 1,
                totalExercises: draft.exercises.length,
                targetLabel: exercise.muscleGroup,
                loadLabel: "External load in lb",
                previousSessionLabel: "View previous sessions from Progress",
                sets: entry.sets.map((s, i) => ({
                  ...s,
                  id: String(i),
                  number: i + 1,
                })),
                nextSetNumber: editing === null ? entry.sets.length + 1 : null,
                draft: { weight, reps },
              }}
              weight={weight}
              reps={reps}
              busy={busy}
              disabled={draft.pending}
              onWeightChange={setWeight}
              onRepsChange={setReps}
              onEditSet={(set) => {
                setEditing(Number(set.id));
                setWeight(String(set.weight));
                setReps(String(set.reps));
              }}
              onSwap={() => {
                void showAlternatives();
              }}
              onGuide={() => {
                setNotice(exercise.instructions);
              }}
              onSubmit={(set) => {
                editDraft((d) => ({
                  ...d,
                  exercises: d.exercises.map((e) =>
                    e.exerciseId === exercise.id
                      ? { ...e, sets: [...e.sets, set] }
                      : e,
                  ),
                }));
              }}
            />
            {editing !== null && (
              <View style={styles.card}>
                <Text style={styles.heading}>Edit set {editing + 1}</Text>
                <NumberField
                  label="Weight (lb)"
                  value={weight}
                  onChange={setWeight}
                  disabled={busy}
                />
                <NumberField
                  label="Reps"
                  value={reps}
                  onChange={setReps}
                  integer
                  disabled={busy}
                />
                <Button
                  label="Save edited set"
                  disabled={
                    !!validateSetInput(weight, reps).weight ||
                    !!validateSetInput(weight, reps).reps ||
                    busy
                  }
                  onPress={() => {
                    editDraft((d) => ({
                      ...d,
                      exercises: d.exercises.map((e) =>
                        e.exerciseId === selected
                          ? {
                              ...e,
                              sets: e.sets.map((s, i) =>
                                i === editing
                                  ? {
                                      weight: Number(weight),
                                      reps: Number(reps),
                                    }
                                  : s,
                              ),
                            }
                          : e,
                      ),
                    }));
                    setEditing(null);
                  }}
                />
                <Button
                  label="Remove this set"
                  variant="danger"
                  onPress={() => {
                    editDraft((d) => ({
                      ...d,
                      exercises: d.exercises.map((e) =>
                        e.exerciseId === selected
                          ? {
                              ...e,
                              sets: e.sets.filter((_, i) => i !== editing),
                            }
                          : e,
                      ),
                    }));
                    setEditing(null);
                  }}
                />
              </View>
            )}
            <Text style={styles.heading}>Machine unavailable?</Text>
            <Text style={styles.body}>
              Select only equipment you can use right now.
            </Text>
            <View style={styles.wrap}>
              {equipment.map((e) => (
                <Chip
                  key={e}
                  label={e}
                  selected={available.includes(e)}
                  onPress={() =>
                    setAvailable(
                      available.includes(e)
                        ? available.filter((v) => v !== e)
                        : [...available, e],
                    )
                  }
                />
              ))}
            </View>
            <Chip
              label="Beginner alternatives only"
              selected={beginner}
              onPress={() => setBeginner(!beginner)}
            />
            <Button
              label="Find alternatives"
              busy={busy}
              onPress={() => {
                void showAlternatives();
              }}
            />
          </>
        )}
        <Text style={styles.heading}>Logged so far</Text>
        {draft.exercises
          .filter((e) => e.sets.length)
          .map((e) => (
            <Text key={e.exerciseId} style={styles.body}>
              {exerciseName(e.exerciseId)} · {e.sets.length} sets
            </Text>
          ))}
        <Button
          label="Review & finish"
          variant="secondary"
          disabled={!payload(draft).exercises.length || busy}
          onPress={() => navigate("review")}
        />
      </>
    );
  else if (screen === "review")
    content = (
      <>
        <Text accessibilityRole="header" style={styles.title}>
          Review & finish
        </Text>
        <Text style={styles.body}>
          {draft.date} · {number(volume(draft))} lb total volume
        </Text>
        {payload(draft).exercises.map((e) => (
          <View key={e.exerciseId} style={styles.card}>
            <Text style={styles.heading}>{exerciseName(e.exerciseId)}</Text>
            {e.sets.map((s, i) => (
              <Text key={i} style={styles.body}>
                Set {i + 1}: {s.reps} reps × {number(s.weight)} lb
              </Text>
            ))}
          </View>
        ))}
        {draft.pending && (
          <Text style={styles.body}>
            A save is awaiting confirmation. Retry to confirm it safely; this
            will not create a duplicate.
          </Text>
        )}
        <Button
          label={
            draft.pending ? "Confirm pending save" : "Finish workout & save"
          }
          busy={busy}
          onPress={() => {
            void save();
          }}
        />
        <Button
          label="Keep training"
          variant="text"
          disabled={draft.pending || busy}
          onPress={() => navigate("workout")}
        />
      </>
    );
  else if (screen === "history")
    content = (
      <>
        <Text accessibilityRole="header" style={styles.title}>
          Every session, saved.
        </Text>
        {!history.length && (
          <Text style={styles.body}>
            No workouts yet. Your first saved workout will appear here.
          </Text>
        )}
        {history.map((w) => (
          <View key={w.id} style={styles.card}>
            <Text style={styles.heading}>{w.date}</Text>
            <Text style={styles.body}>
              {w.exercises.map((e) => exerciseName(e.exerciseId)).join(", ")} ·{" "}
              {number(volume(w))} lb volume
            </Text>
            <Button
              label={`View workout ${w.id}`}
              variant="text"
              onPress={() => {
                void run(async () => {
                  setDetail(await api<Workout>(`/workouts/${w.id}`));
                  navigate("detail");
                });
              }}
            />
          </View>
        ))}
      </>
    );
  else if (screen === "detail" && detail)
    content = (
      <>
        <Text accessibilityRole="header" style={styles.title}>
          Workout saved
        </Text>
        <Text style={styles.body}>
          {detail.date} · {number(volume(detail))} lb volume
        </Text>
        {detail.exercises.map((e) => (
          <View key={e.exerciseId} style={styles.card}>
            <Text style={styles.heading}>{exerciseName(e.exerciseId)}</Text>
            {e.sets.map((s, i) => (
              <Text key={i} style={styles.body}>
                Set {i + 1}: {s.reps} reps × {number(s.weight)} lb
              </Text>
            ))}
            <Button
              label={`See progress for ${exerciseName(e.exerciseId)}`}
              variant="text"
              onPress={() => {
                void showProgress(e.exerciseId);
              }}
            />
          </View>
        ))}
        <Button
          label="View workout history"
          onPress={() => {
            void showHistory();
          }}
        />
      </>
    );
  else if (screen === "progress" && progress) {
    const max = Math.max(
      ...progress.points.map((p) => Number(p.estimatedOneRepMax || 0)),
      1,
    );
    content = (
      <>
        <Text accessibilityRole="header" style={styles.title}>
          {exerciseName(progress.exerciseId)}
        </Text>
        <Text style={styles.heading}>Your progress</Text>
        {!progress.points.length && (
          <Text style={styles.body}>
            No logged sets yet. Save a workout with this exercise to start
            tracking progress.
          </Text>
        )}
        {progress.records && (
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Personal records</Text>
            <Text style={styles.heroText}>
              Heaviest weight: {number(progress.records.maxWeight.value)} lb
            </Text>
            <Text style={styles.heroText}>
              Best estimated 1RM:{" "}
              {number(progress.records.estimatedOneRepMax?.value)} lb
            </Text>
            <Text style={styles.heroText}>
              Best session volume:{" "}
              {number(progress.records.maxWorkoutVolume.value)} lb
            </Text>
          </View>
        )}
        <Text style={styles.body}>
          Estimated one-rep max over time. Zero external load has no estimate.
        </Text>
        {progress.points.map((p) => (
          <View key={p.workoutId} style={styles.card}>
            <Text style={styles.heading}>
              {p.date} · Workout {p.workoutId}
            </Text>
            <View
              accessibilityLabel={`Estimated one rep max ${number(p.estimatedOneRepMax)} pounds`}
              style={styles.track}
            >
              <View
                style={[
                  styles.bar,
                  {
                    width: `${Math.max(0, (Number(p.estimatedOneRepMax || 0) / max) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.body}>
              Estimated 1RM: {number(p.estimatedOneRepMax)} lb · Volume:{" "}
              {number(p.volume)} lb
            </Text>
            <Text style={styles.small}>
              Change from previous session: {number(p.oneRepMaxChange)} lb
            </Text>
          </View>
        ))}
      </>
    );
  } else content = null;

  const specialized =
    screen === "alternatives" ? (
      <AlternativesModel
        originalExerciseName={exercise?.name || ""}
        targetLabel={exercise?.muscleGroup || ""}
        availableEquipment={available}
        alternatives={alternatives.map((a, i) => ({
          id: String(a.exerciseId),
          rank: i + 1,
          name: a.name,
          difficulty: a.difficulty.toLowerCase(),
          equipmentLabels: a.requiredEquipment,
        }))}
        onBack={() => navigate("workout")}
        onViewGuide={(id) => {
          setGuide(catalog.find((e) => e.id === Number(id)) || null);
          navigate("guide");
        }}
      />
    ) : screen === "guide" && guide ? (
      <ExerciseGuideScreen
        guide={{
          exerciseId: String(guide.id),
          name: guide.name,
          originalExerciseName: exercise?.name || "",
          muscleEquipmentLabel: guide.muscleGroup,
          targetLabel: "Use a comfortable load and range of motion.",
          equipmentLabel: guide.requiredEquipment.join(", "),
          loadInstructions: "All logged weight is external load in lb.",
          cues: [{ id: "instructions", text: guide.instructions }],
        }}
        onBack={() => navigate("alternatives")}
        onKeepExercise={() => navigate("workout")}
        onUseExercise={async () => {
          if (draftRef.current.pending)
            throw new Error("Confirm the pending save first.");
          await updateDraft({
            ...draftRef.current,
            exercises: [
              ...draftRef.current.exercises.filter(
                (e) => e.exerciseId !== selected || e.sets.length > 0,
              ),
              ...(draftRef.current.exercises.some(
                (e) => e.exerciseId === guide.id,
              )
                ? []
                : [{ exerciseId: guide.id, sets: [] }]),
            ],
          });
          setSelected(guide.id);
          setWeight("");
          setReps("");
          navigate("workout");
          setNotice(
            "Replacement selected. Previously logged sets keep their original exercise.",
          );
        }}
      />
    ) : null;
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" />
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigate("home")}
          disabled={busy}
        >
          <Text style={styles.brand}>SPOTME</Text>
        </Pressable>
        <Text style={styles.small}>PRIVATE BETA · LB</Text>
      </View>
      {specialized ? (
        <View style={styles.flex}>
          {specialized}
          {alert}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {screen !== "home" && (
            <Button
              label="Back to home"
              variant="text"
              disabled={busy}
              onPress={() => navigate("home")}
            />
          )}
          {!!notice && (
            <Text accessibilityRole="alert" style={styles.notice}>
              {notice}
            </Text>
          )}
          {alert}
          {loading}
          {content}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
function Chip({
  label,
  onPress,
  selected,
  disabled,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === "ios" ? 52 : 24,
  },
  flex: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
    gap: 20,
    backgroundColor: colors.background,
  },
  auth: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    padding: 28,
    paddingTop: 64,
    gap: 20,
  },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 64,
    gap: 20,
  },
  nav: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  brand: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
    color: colors.green,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -1,
    color: colors.ink,
  },
  heading: { fontSize: 19, fontWeight: "700", color: colors.ink },
  body: { fontSize: 15, lineHeight: 23, color: colors.muted },
  small: { fontSize: 12, lineHeight: 18, color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  hero: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: colors.hero,
    gap: 16,
  },
  heroTitle: { fontSize: 28, fontWeight: "700", color: colors.surface },
  heroText: { fontSize: 15, lineHeight: 23, color: colors.pale },
  card: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: colors.surface,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 14, color: colors.ink },
  chipTextSelected: { color: colors.surface },
  error: {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    padding: 16,
    borderRadius: 12,
    lineHeight: 22,
  },
  notice: {
    backgroundColor: colors.pale,
    color: colors.ink,
    padding: 16,
    borderRadius: 12,
    lineHeight: 22,
  },
  track: {
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.pale,
    overflow: "hidden",
  },
  bar: { height: 16, backgroundColor: colors.green, borderRadius: 8 },
});
