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
import { Button, Sheet } from "./src/components/WorkoutControls";
import {ActiveWorkoutScreen, elapsedLabel} from "./src/screens/ActiveWorkoutScreen";
import {WorkoutReviewScreen} from "./src/screens/WorkoutReviewScreen";
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
import { loadDraft, newDraft, payload, persistDraft, resumeDraft, pauseDraft, resetWorkout, workoutTargets, workoutCounts } from "./src/beta/draft";
import type { Draft } from "./src/beta/draft";
import { colors } from "./src/theme";
import { MainTabs } from "./src/navigation/MainTabs";
import type { MainTab } from "./src/navigation/MainTabs";
import { SavedWorkoutPlansScreen } from "./src/screens/SavedWorkoutPlansScreen";
import { CreateWorkoutScreen, validTarget } from "./src/screens/CreateWorkoutScreen";
import type { WorkoutBuilderValue } from "./src/screens/CreateWorkoutScreen";

type Screen =
  | "home"
  | "create"
  | "workout"
  | "review"
  | "alternatives"
  | "guide"
  | "history"
  | "detail"
  | "progress"
  | "progressHome"
  | "profile";
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
  const [activeTab, setActiveTab] = useState<MainTab>("train");
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [draft, setDraft] = useState<Draft>(newDraft);
  const draftRef = useRef(draft);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const [selected, setSelected] = useState<number | null>(null);
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
  const [editingEquipment, setEditingEquipment] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [trainWorkouts, setTrainWorkouts] = useState<Workout[]>([]);
  const [trainLoading, setTrainLoading] = useState(true);
  const [trainError, setTrainError] = useState("");
  const [trainReload, setTrainReload] = useState(0);
  const sessionInputs = useRef<Record<string, Record<string, {weight: string; reps: string}>>>({});
  const [creation, setCreation] = useState<WorkoutBuilderValue | null>(null);

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
    setTrainWorkouts([]);
    setTrainLoading(true);
    setTrainError("");
    setCreation(null);
    setEditingEquipment(false);
    const [exercises, saved] = await Promise.all([
      api<Exercise[]>("/exercises"),
      loadDraft(account.id),
    ]);
    setCatalog(exercises);
    sessionInputs.current = {[saved.key]: {...saved.session?.inputs}};
    setDraft(saved);
    draftRef.current = saved;
    setSelected(saved.exercises[0]?.exerciseId ?? null);
    setScreen(saved.pending ? "review" : "home");
    setActiveTab("train");
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

  useEffect(() => {
    if (!ready || !user || screen !== "home") return;
    let cancelled = false;
    setTrainLoading(true);
    setTrainError("");
    setTrainWorkouts([]);
    void api<Workout[]>("/workouts")
      .then(workouts => {
        if (!cancelled) setTrainWorkouts([...workouts].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));
      })
      .catch(failure => {
        if (!cancelled) setTrainError(failure instanceof Error ? failure.message : "Saved workouts could not be loaded.");
      })
      .finally(() => { if (!cancelled) setTrainLoading(false); });
    return () => { cancelled = true; };
  }, [ready, user?.id, screen, trainReload]);

  // Save local changes in order. Keep the retry key and workout data before sending.
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
  const equipment = [...new Set(catalog.flatMap((e) => e.requiredEquipment))];
  const exerciseName = (id: number) =>
    catalog.find((e) => e.id === id)?.name || `Exercise ${id}`;
  function navigate(next: Screen) {
    if (next === "home") setActiveTab("train");
    else if (["create", "workout", "review", "alternatives", "guide"].includes(next))
      setActiveTab("train");
    else if (next === "progress" || next === "progressHome") setActiveTab("progress");
    else if (next === "profile") setActiveTab("you");
    setError("");
    setNotice("");
    setScreen(next);
    setEditingEquipment(false);
  }
  function selectTab(tab: MainTab) {
    if (busyRef.current || tab === activeTab) return;
    if (screen === "workout") {
      void run(async () => {
        const current = draftRef.current;
        const session = current.session || resumeDraft(current).session!;
        await updateDraft({...current, session: {...session, inputs: {...sessionInputs.current[current.key]}}});
        navigate(tab === "progress" ? "progressHome" : tab === "you" ? "profile" : "home");
      });
      return;
    }
    setActiveTab(tab);
    navigate(
      tab === "train" ? (draftRef.current.pending ? "review" : creation ? "create" : "home") :
      tab === "progress" ? "progressHome" : "profile",
    );
  }
  const trainTemplate = trainWorkouts.find(workout => workout.exercises.some(item => item.sets.length > 0));
  const templateExercises = trainTemplate?.exercises.filter(item => item.sets.length > 0) || [];
  const templateDate = trainTemplate ? new Date(`${trainTemplate.date}T12:00:00`).toLocaleDateString(undefined, {day: "numeric", month: "short"}) : "";
  const historyWorkoutCard = trainTemplate ? {
    id: String(trainTemplate.id),
    name: `Workout · ${templateDate}`,
    summaryLabel: `${templateExercises.length} exercises · ${templateExercises.reduce((sum, item) => sum + item.sets.length, 0)} sets`,
    exercisePreview: templateExercises.slice(0, 3).map((item, index) => ({
      id: String(item.exerciseId),
      orderLabel: String(index + 1).padStart(2, "0"),
      name: exerciseName(item.exerciseId),
      targetLabel: item.sets.every(set => set.reps === item.sets[0].reps) ? `${item.sets.length} × ${item.sets[0].reps}` : `${item.sets.length} sets`,
    })),
    remainingExercisesLabel: templateExercises.length > 3 ? `+ ${templateExercises.slice(3).map(item => exerciseName(item.exerciseId)).join(", ")}` : undefined,
  } : null;
  const plannedWorkoutCard = draft.plan?.ready ? {
    id: draft.key,
    name: draft.plan.name,
    summaryLabel: `${draft.plan.targets.length} exercises · ${draft.plan.targets.reduce((sum, item) => sum + item.sets, 0)} target sets · On this device`,
    exercisePreview: draft.plan.targets.slice(0, 3).map((item, index) => ({
      id: String(item.exerciseId), orderLabel: String(index + 1).padStart(2, "0"),
      name: exerciseName(item.exerciseId), targetLabel: `${item.sets} × ${item.reps}`,
    })),
    remainingExercisesLabel: draft.plan.targets.length > 3 ? `+ ${draft.plan.targets.slice(3).map(item => exerciseName(item.exerciseId)).join(", ")}` : undefined,
  } : null;
  const savedWorkoutCard = plannedWorkoutCard || historyWorkoutCard;
  const plannedTarget = draft.plan?.targets.find(item => item.exerciseId === selected);
  const initials = user?.email.split("@")[0].split(/[.\s_-]+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "U";

  async function saveCreatedPlan() {
    if (busyRef.current) throw new Error("Please wait for the current change to finish.");
    if (!creation || !creation.name.trim() || !creation.exercises.length || creation.exercises.some(item => !validTarget(item.sets) || !validTarget(item.reps) || !catalog.some(exercise => exercise.id === item.exerciseId)) || new Set(creation.exercises.map(item => item.exerciseId)).size !== creation.exercises.length)
      throw new Error("Check the workout name, exercises, sets and reps.");
    if (draftRef.current.pending || (draftRef.current.exercises.length && !draftRef.current.plan?.ready)) throw new Error("Finish your current workout before saving a new plan.");
    busyRef.current = true;
    setBusy(true);
    try {
      await updateDraft({
        ...newDraft(),
        exercises: creation.exercises.map(item => ({exerciseId: item.exerciseId, sets: []})),
        plan: {name: creation.name.trim(), ready: true, targets: creation.exercises.map(item => ({exerciseId: item.exerciseId, sets: Number(item.sets), reps: Number(item.reps)}))},
      });
      setCreation(null);
      setSelected(null);
      setWeight("");
      setReps("");
      navigate("home");
    } finally { busyRef.current = false; setBusy(false); }
  }

  async function startSavedWorkout(id: string) {
    if (busyRef.current) throw new Error("Please wait for the current change to finish.");
    const current = draftRef.current;
    if (current.plan?.ready && current.key === id) {
      if (current.plan.targets.some(item => !catalog.some(exercise => exercise.id === item.exerciseId))) throw new Error("An exercise is no longer available. Edit the plan before starting.");
      busyRef.current = true;
      setBusy(true);
      try {
        await updateDraft(resumeDraft({...current, date: newDraft().date, plan: {...current.plan, ready: false}}));
        setSelected(current.exercises[0].exerciseId);
        setWeight("");
        setReps(String(current.plan.targets[0].reps));
        navigate("workout");
      } finally { busyRef.current = false; setBusy(false); }
      return;
    }
    if (draftRef.current.exercises.length || draftRef.current.pending) throw new Error("Resume your current workout first.");
    if (!trainTemplate || String(trainTemplate.id) !== id) throw new Error("This saved workout is no longer available. Reload and try again.");
    if (templateExercises.some(item => !catalog.some(exercise => exercise.id === item.exerciseId))) throw new Error("An exercise in this workout is no longer available. Create a new workout instead.");
    busyRef.current = true;
    setBusy(true);
    try {
      await updateDraft(resumeDraft({...newDraft(), plan: {name: `Workout · ${templateDate}`, ready: false, targets: templateExercises.map(item => ({exerciseId: item.exerciseId, sets: item.sets.length, reps: item.sets[0].reps}))}, exercises: templateExercises.map(item => ({exerciseId: item.exerciseId, sets: []}))}));
      setSelected(templateExercises[0].exerciseId);
      setWeight("");
      setReps("");
      navigate("workout");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
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
  async function changeActiveWorkout(value: Draft) {
    if (busyRef.current) throw new Error("Please wait for the current change to finish.");
    if (draftRef.current.pending) throw new Error("Confirm the pending save before changing this workout.");
    busyRef.current = true;
    setBusy(true);
    try { await updateDraft(value); }
    finally {busyRef.current = false; setBusy(false);}
  }
  async function save() {
    if (busyRef.current) throw new Error("Please wait for the current change to finish.");
    busyRef.current = true;
    setBusy(true);
    try {
      const current = draftRef.current;
      if (!payload(current).exercises.length) throw new Error("Log at least one set before saving.");
      const pending = {...pauseDraft(current), pending: true};
      await updateDraft(pending);
      let saved: Workout;
      try {
        saved = await api<Workout>("/workouts", {method: "POST", body: payload(pending), key: pending.key});
      } catch (failure) {
        // Invalid data was not saved. For other errors, keep the same data for a retry.
        if (failure instanceof ApiError && failure.status === 400) await updateDraft({...pending, pending: false});
        throw failure;
      }
      await updateDraft(resetWorkout(current));
      setDetail(saved);
      setSelected(null);
      navigate("detail");
      setNotice("Workout saved.");
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) {
        await storeToken(null);
        setUser(null);
        setReady(false);
      }
      throw failure;
    } finally {busyRef.current = false; setBusy(false);}
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
    content = null;
  else if (screen === "create") content = null;
  else if (screen === "profile")
    content = (
      <>
        <Text accessibilityRole="header" style={styles.title}>Make it yours.</Text>
        <Text style={styles.body}>Your account. Your training.</Text>
        <View style={styles.card}>
          <Text style={styles.heading}>Your account</Text>
          <Text style={styles.body}>{user.email}</Text>
        </View>
        <Button label="Workout history" variant="secondary" onPress={() => { void showHistory(); }} />
        <Text style={styles.small}>Workout loads use pounds (lb) in the current backend.</Text>
        <Button label="Sign out" variant="text" disabled={busy} onPress={() => { void logout(); }} />
      </>
    );
  else if (screen === "progressHome")
    content = (
      <>
        <Text accessibilityRole="header" style={styles.title}>Small steps. Real strength.</Text>
        <Text style={styles.body}>Choose an exercise to see your estimated one-rep max, training volume and personal records.</Text>
        <View style={styles.wrap}>
          {catalog.map(e => (
            <Chip key={e.id} label={e.name} disabled={busy} onPress={() => { void showProgress(e.id); }} />
          ))}
        </View>
        {!catalog.length && <Text style={styles.body}>No exercises are available yet.</Text>}
        <Button label="Workout history" variant="secondary" onPress={() => { void showHistory(); }} />
      </>
    );
  else if (screen === "workout" || screen === "review") content = null;
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
    screen === "workout" ? (
      <ActiveWorkoutScreen key={draft.key} draft={draft} catalog={catalog} selected={selected}
        inputs={sessionInputs.current[draft.key] ||= {...draft.session?.inputs}}
        onSelect={setSelected} onChange={changeActiveWorkout}
        onBack={() => navigate("home")} onReview={() => navigate("review")} onSwap={showAlternatives} />
    ) : screen === "review" ? (
      <WorkoutReviewScreen pending={draft.pending} workout={{
        sessionId: draft.key, name: draft.plan?.name || "Your workout", durationLabel: elapsedLabel(draft),
        volumeLabel: number(volume(draft)) + " lb", summaryLabel: payload(draft).exercises.length + " exercises · " + workoutCounts(draft).completed + " logged sets",
        completedSets: workoutCounts(draft).completed, unit: "lb",
        exercises: payload(draft).exercises.map(item => ({id: String(item.exerciseId), name: exerciseName(item.exerciseId),
          performanceLabel: item.sets.map(set => number(set.weight) + " lb × " + set.reps).join(" · "), loadLabel: "External load in lb",
          completedSets: item.sets.map((set, index) => ({...set, id: item.exerciseId + ":" + index, number: index + 1}))})),
      }} onKeepTraining={() => {void run(async () => {await updateDraft(resumeDraft(draftRef.current)); navigate("workout");});}}
      onSave={async id => {if (id !== draftRef.current.key) throw new Error("Reopen your current workout."); await save();}} />
    ) : screen === "alternatives" ? (
      <View style={styles.flex}>
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
      <Button label="Edit equipment filters" variant="text" disabled={busy} onPress={() => setEditingEquipment(true)} />
      </View>
    ) : screen === "guide" && guide ? (
      <ExerciseGuideScreen
        guide={{
          exerciseId: String(guide.id),
          name: guide.name,
          originalExerciseName: exercise?.name || "",
          targetLabel: "Use a comfortable load and range of motion.",
          loadLabel: "All logged weight is external load in lb.",
          cues: [{ id: "instructions", text: guide.instructions }],
        }}
        onBack={() => navigate("alternatives")}
        onKeepExercise={() => navigate("workout")}
        onUseExercise={async () => {
          if (draftRef.current.pending)
            throw new Error("Confirm the pending save first.");
          const current = draftRef.current;
          if (guide.id === selected) {navigate("workout"); return;}
          if (current.exercises.some(item => item.exerciseId === guide.id)) throw new Error("That exercise is already in this workout. Choose another replacement.");
          const original = current.exercises.find(item => item.exerciseId === selected);
          if (!original) throw new Error("The exercise to replace is no longer in your workout.");
          const targets = workoutTargets(current);
          const target = targets.find(item => item.exerciseId === selected);
          const remainingSets = target ? Math.max(0, target.sets - original.sets.length) : 0;
          if (target && remainingSets === 0) throw new Error("All sets for this exercise are logged. Choose an unfinished exercise to swap.");
          const session = current.session || resumeDraft(current).session!;
          await changeActiveWorkout({...current, session: {...session,
            targets: target ? targets.flatMap(item => item.exerciseId !== selected ? [item] : [
              ...(original.sets.length ? [{...item, sets: original.sets.length}] : []),
              {...item, exerciseId: guide.id, sets: remainingSets},
            ]) : targets,
            substitutions: {...session.substitutions, [guide.id]: session.substitutions?.[String(selected)] || selected!},
          }, exercises: current.exercises.flatMap(item => item.exerciseId !== selected ? [item] : [
            ...(item.sets.length ? [item] : []), {exerciseId: guide.id, sets: []},
          ])});
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
      {!["home", "create", "workout", "review"].includes(screen) && <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigate("home")}
          disabled={busy}
        >
          <Text style={styles.brand}>SPOTME</Text>
        </Pressable>
        <Text style={styles.small}>PRIVATE BETA · LB</Text>
      </View>}
      {screen === "create" && creation ? (
        <CreateWorkoutScreen value={creation} catalog={catalog} initials={initials} onChange={setCreation} onSave={saveCreatedPlan} onCancel={() => {setCreation(null); navigate("home");}} />
      ) : screen === "home" ? (
        <View style={styles.flex}>
          <SavedWorkoutPlansScreen
            plan={savedWorkoutCard}
            initials={initials}
            loading={!plannedWorkoutCard && trainLoading}
            loadError={plannedWorkoutCard ? undefined : trainError}
            onRetry={() => setTrainReload(value => value + 1)}
            disabled={busy}
            onStartWorkout={startSavedWorkout}
            editLabel={plannedWorkoutCard ? "Edit plan" : "View saved workout"}
            onEditPlan={() => {
              if (draft.plan?.ready) {
                setCreation({name: draft.plan.name, exercises: draft.plan.targets.map(item => ({exerciseId: item.exerciseId, sets: String(item.sets), reps: String(item.reps)}))});
                navigate("create");
              } else if (trainTemplate) {
                setDetail(trainTemplate);
                navigate("detail");
              }
            }}
            unfinishedWorkout={(draft.exercises.length || draft.pending) && !draft.plan?.ready ? {
              exerciseLabel: draft.exercises.map(item => exerciseName(item.exerciseId)).join(", "),
              completedSets: draft.exercises.reduce((sum, item) => sum + item.sets.length, 0),
              pendingSave: draft.pending,
            } : undefined}
            onResumeWorkout={() => navigate(draft.pending ? "review" : "workout")}
            onCreateWorkout={draft.plan?.ready ? undefined : () => {
              if (draftRef.current.exercises.length || draftRef.current.pending || busyRef.current) return;
              setSelected(null);
              setWeight("");
              setReps("");
              setCreation({name: "", exercises: []});
              navigate("create");
            }}
          />
          {alert}
        </View>
      ) : specialized ? (
        <View style={styles.flex}>
          {specialized}
          {alert}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {!["home", "progressHome", "profile"].includes(screen) && (
            <Button
              label={activeTab === "progress" ? "Back to Progress" : activeTab === "you" ? "Back to You" : "Back to Train"}
              variant="text"
              disabled={busy}
              onPress={() => navigate(activeTab === "progress" ? "progressHome" : activeTab === "you" ? "profile" : "home")}
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
      <MainTabs activeTab={activeTab} disabled={busy} onSelect={selectTab} />
      {editingEquipment && <Sheet title="Equipment filters" locked={busy} onClose={() => setEditingEquipment(false)}>
        <Text style={styles.body}>Choose the equipment to include when finding swaps.</Text>
        <View style={styles.wrap}>{equipment.map(item => <Chip key={item} label={item} selected={available.includes(item)} disabled={busy} onPress={() => setAvailable(value => value.includes(item) ? value.filter(selected => selected !== item) : [...value, item])} />)}</View>
        <Chip label="Beginner alternatives only" selected={beginner} disabled={busy} onPress={() => setBeginner(value => !value)} />
        {alert}
        <Button label="Find alternatives" busy={busy} onPress={() => {void showAlternatives();}} />
      </Sheet>}
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
