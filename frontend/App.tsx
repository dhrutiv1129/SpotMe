import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { FormCoachScreen } from "./src/screens/FormCoachScreen";
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
import { AppTabBar } from "./src/components/AppTabBar";
import { CalendarView } from "./src/components/CalendarView";
import { StrengthChart } from "./src/components/StrengthChart";
import { colors } from "./src/theme";

type Screen =
  | "form-coach"
  | "consistency"
  | "equipment"
  | "profile"
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
  const [formCoachBack, setFormCoachBack] = useState<Screen>("profile");
  const [screen, setScreen] = useState<Screen>("home");
  const [catalog, setCatalog] = useState<Exercise[]>([]);
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
  const [calendarMonth, setCalendarMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [equipmentQuery, setEquipmentQuery] = useState("");
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
    setHistory(await api<Workout[]>("/workouts"));
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
      setHistory((previous) => [
        saved,
        ...previous.filter((w) => w.id !== saved.id),
      ]);
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
          <Text style={styles.brand}>◈ SpotMe</Text>
          <View style={styles.authAccent}>
            <Text style={{ fontSize: 44, color: colors.green }}>↗</Text>
            <Text style={styles.link}>A LITTLE STRONGER, EVERY DAY</Text>
          </View>
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
            Your next chapter starts with one session. All training weights in
            pounds (lb).
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
  const totalSets = draft.exercises.reduce((n, e) => n + e.sets.length, 0);
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  if (screen === "home")
    content = (
      <>
        <Text style={styles.eyebrow}>{todayLabel.toUpperCase()}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Hey {user.email.split("@")[0]}. You’ve got this.
        </Text>
        <Text style={styles.body}>
          A little stronger, one session at a time.
        </Text>
        <View style={[styles.hero, { padding: 0, overflow: "hidden" }]}>
          <Image
            source={require("./src/assets/workout-hero.jpg")}
            style={{ height: 180, width: "100%", opacity: 0.72 }}
            accessibilityLabel="Strength training in a gym"
          />
          <View style={{ padding: 20, gap: 14 }}>
            <Text style={styles.heroEyebrow}>YOUR NEXT SESSION</Text>
            <Text style={styles.heroTitle}>
              {draft.exercises.length
                ? "Your workout, your pace."
                : "Build your strength."}
            </Text>
            <Text style={styles.heroText}>
              {draft.exercises.length
                ? `${draft.exercises.length} exercises · ${totalSets} sets logged`
                : "Choose your exercises · Move at your pace"}
            </Text>
            {draft.exercises.slice(0, 4).map((e, i) => (
              <View key={e.exerciseId} style={styles.between}>
                <Text style={styles.heroText}>
                  {String(i + 1).padStart(2, "0")} {exerciseName(e.exerciseId)}
                </Text>
                <Text style={styles.heroText}>{e.sets.length} sets</Text>
              </View>
            ))}
            <Button
              label={
                draft.exercises.length
                  ? "Continue workout  →"
                  : "Let’s get moving  →"
              }
              onPress={() => navigate(draft.pending ? "review" : "workout")}
            />
          </View>
        </View>
        <View style={styles.between}>
          <Text style={styles.heading}>Showing up adds up</Text>
          <Pressable
            onPress={() => {
              void showHistory();
            }}
          >
            <Text style={styles.link}>View history →</Text>
          </Pressable>
        </View>
        <View style={styles.softCard}>
          <Text style={styles.metric}>{history.length}</Text>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.heading}>Every visit counts.</Text>
            <Text style={styles.small}>
              {history.length
                ? "Look how far you’ve come. Keep showing up."
                : "Your first session is a fresh start."}
            </Text>
          </View>
        </View>
        <View style={styles.between}>
          <Text style={styles.heading}>A win worth noticing</Text>
          <Pressable
            onPress={() => {
              if (catalog[0]) void showProgress(catalog[0].id);
            }}
          >
            <Text style={styles.link}>See progress →</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>Small steps. Real strength.</Text>
          <Text style={styles.body}>
            Your logged sessions tell your story. See your strength grow, one
            workout at a time.
          </Text>
        </View>
        <Pressable
          style={styles.softCard}
          onPress={() => navigate("equipment")}
        >
          <Text style={styles.heading}>Your gym, set up for you</Text>
          <Text style={styles.link}>Edit equipment →</Text>
        </Pressable>
      </>
    );
  else if (screen === "consistency") {
    const [year, month] = calendarMonth.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const offset = (start.getDay() + 6) % 7;
    const dayCount = new Date(year, month, 0).getDate();
    const dateKey = (day: number) =>
      `${calendarMonth}-${String(day).padStart(2, "0")}`;
    const monthKey = (offset: number) => {
      const d = new Date(year, month - 1 + offset, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    const weeks = Array.from(
      { length: Math.ceil((offset + dayCount) / 7) },
      (_, w) => ({
        id: String(w),
        days: Array.from({ length: 7 }, (_, d) => {
          const day = w * 7 + d - offset + 1;
          if (day < 1 || day > dayCount) return null;
          const date = dateKey(day);
          const sessions = history.filter((s) => s.date === date);
          return {
            date,
            dayLabel: String(day),
            accessibilityLabel: `${date}, ${sessions.length} workouts`,
            activity: (sessions.length > 1
              ? "high"
              : sessions.length
                ? "medium"
                : "none") as "high" | "medium" | "none",
            isToday: date === newDraft().date,
            isFuture: date > newDraft().date,
            sessionIds: sessions.map((s) => String(s.id)),
          };
        }),
      }),
    );
    const monthly = history.filter((w) => w.date.startsWith(calendarMonth));
    content = (
      <>
        <Text style={styles.title}>Every visit counts.</Text>
        <View style={styles.tabs}>
          <Pressable
            style={styles.activeSegment}
            onPress={() => {
              if (catalog[0]) void showProgress(catalog[0].id);
            }}
          >
            <Text style={styles.small}>Strength</Text>
          </Pressable>
          <View style={styles.activeSegment}>
            <Text style={styles.link}>Consistency</Text>
          </View>
        </View>
        <View style={styles.softCard}>
          <Text style={styles.metric}>{monthly.length}</Text>
          <Text style={styles.body}>workouts this month</Text>
        </View>
        <CalendarView
          calendar={{
            monthLabel: start.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            }),
            previousMonthId: monthKey(-1),
            nextMonthId: monthKey(1),
            weeks,
          }}
          onChangeMonth={setCalendarMonth}
          onViewDay={(date, ids) => {
            if (ids.length === 1)
              void run(async () => {
                setDetail(await api<Workout>(`/workouts/${ids[0]}`));
                navigate("detail");
              });
            else if (ids.length > 1) {
              setNotice(`Sessions on ${date}`);
              navigate("history");
            } else setNotice(`No saved workouts on ${date}.`);
          }}
        />
        <Button
          label="All workout history"
          variant="secondary"
          onPress={() => {
            void showHistory();
          }}
        />
      </>
    );
  } else if (screen === "profile")
    content = (
      <>
        <Text style={styles.eyebrow}>YOUR SPACE</Text>
        <Text style={styles.title}>Keep showing up.</Text>
        <View style={styles.card}>
          <Text style={styles.heading}>{user.email}</Text>
          <Text style={styles.body}>
            Your training. Your progress. Your pace.
          </Text>
        </View>
        <Button
          label="Form Analysis · Bodyweight Squat"
          variant="secondary"
          onPress={() => {
            setFormCoachBack("profile");
            navigate("form-coach");
          }}
        />
        <Button
          label="Your gym setup"
          variant="secondary"
          onPress={() => navigate("equipment")}
        />
        <Button
          label="Workout history"
          variant="secondary"
          onPress={() => {
            void showHistory();
          }}
        />
        <View style={styles.softCard}>
          <Text style={styles.body}>
            All workout weights are recorded in pounds (lb).
          </Text>
        </View>
        <Button
          label="Sign out"
          variant="text"
          onPress={() => {
            void logout();
          }}
        />
      </>
    );
  else if (screen === "equipment")
    content = (
      <>
        <Text style={styles.title}>What’s at your gym?</Text>
        <Text style={styles.body}>
          Choose the equipment your gym has. We’ll use it to find swaps that
          fit.
        </Text>
        <View style={styles.softCard}>
          <View style={{ gap: 6, flex: 1 }}>
            <Text style={styles.heading}>
              Available doesn’t mean unoccupied.
            </Text>
            <Text style={styles.small}>
              This is your gym’s inventory, not a live busy indicator. You can
              swap when a machine is in use.
            </Text>
          </View>
        </View>
        <Text style={styles.heading}>
          Currently selected · {available.length}
        </Text>
        <View style={styles.wrap}>
          {available.map((e) => (
            <Chip
              key={e}
              label={`✓ ${e}`}
              selected
              onPress={() => setAvailable(available.filter((v) => v !== e))}
            />
          ))}
        </View>
        <TextInput
          accessibilityLabel="Search equipment"
          placeholder="Search equipment"
          value={equipmentQuery}
          onChangeText={setEquipmentQuery}
          style={styles.input}
        />
        {equipment
          .filter((e) => e.toLowerCase().includes(equipmentQuery.toLowerCase()))
          .map((e) => (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: available.includes(e) }}
              aria-checked={available.includes(e)}
              key={e}
              onPress={() =>
                setAvailable(
                  available.includes(e)
                    ? available.filter((v) => v !== e)
                    : [...available, e],
                )
              }
              style={[
                styles.equipmentRow,
                available.includes(e) && { backgroundColor: colors.pale },
              ]}
            >
              <Text style={styles.heading}>{e.replace(/_/g, " ")}</Text>
              <Text style={styles.link}>
                {available.includes(e) ? "✓" : "+"}
              </Text>
            </Pressable>
          ))}
        <Text style={styles.small}>
          Your selections apply to swaps during this session.
        </Text>
        <Button label="✓  Use gym setup" onPress={() => navigate("workout")} />
      </>
    );
  else if (screen === "workout")
    content = (
      <>
        <Text accessibilityRole="header" style={styles.title}>
          Your workout
        </Text>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>IN PROGRESS</Text>
          <Text style={styles.heroTitle}>One rep at a time.</Text>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                {
                  width: `${Math.min(100, (totalSets / Math.max(1, draft.exercises.length * 3)) * 100)}%`,
                  backgroundColor: colors.lime,
                },
              ]}
            />
          </View>
          <Text style={styles.heroText}>
            {totalSets} sets logged · {draft.exercises.length} exercises ·{" "}
            {draft.date}
          </Text>
        </View>
        <Text style={styles.heading}>Choose an exercise</Text>
        <View style={styles.wrap}>
          {catalog.map((e) => (
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
            {exercise.name.toLowerCase() === "bodyweight squat" && (
              <Button
                label="Review video form"
                variant="secondary"
                onPress={() => {
                  setFormCoachBack("workout");
                  navigate("form-coach");
                }}
              />
            )}
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
            <View style={styles.between}>
              <Text style={styles.heading}>Equipment busy?</Text>
              <Pressable onPress={() => navigate("equipment")}>
                <Text style={styles.link}>Gym setup →</Text>
              </Pressable>
            </View>
            <Text style={styles.body}>
              Keep your flow. Find a swap with equipment at your gym.
            </Text>
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
            <View style={styles.between}>
              <Text style={styles.small}>SET</Text>
              <Text style={styles.small}>LB × REPS</Text>
              <Text style={styles.small}>STATUS</Text>
            </View>
            {e.sets.map((s, i) => (
              <View key={i} style={styles.setLine}>
                <Text style={styles.body}>{i + 1}</Text>
                <Text style={styles.body}>
                  {number(s.weight)} × {s.reps}
                </Text>
                <Text style={styles.link}>✓ Completed</Text>
              </View>
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
        <Text style={styles.body}>Your workout history, newest first.</Text>
        <View style={styles.softCard}>
          <Text style={styles.metric}>{history.length}</Text>
          <Text style={styles.body}>completed sessions</Text>
        </View>
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
        <Text style={styles.eyebrow}>{detail.date}</Text>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>✓ SAVED · COMPLETED</Text>
          <Text style={styles.heroTitle}>{number(volume(detail))} lb</Text>
          <Text style={styles.heroText}>
            total training volume · {detail.exercises.length} exercises ·{" "}
            {detail.exercises.reduce((n, e) => n + e.sets.length, 0)} completed
            sets
          </Text>
        </View>
        <Text style={styles.heading}>What you actually did</Text>
        <Text style={styles.small}>
          Your completed sets, saved to your history.
        </Text>
        {detail.exercises.map((e) => (
          <View key={e.exerciseId} style={styles.card}>
            <Text style={styles.heading}>{exerciseName(e.exerciseId)}</Text>
            <View style={styles.between}>
              <Text style={styles.small}>SET</Text>
              <Text style={styles.small}>LB × REPS</Text>
              <Text style={styles.small}>STATUS</Text>
            </View>
            {e.sets.map((s, i) => (
              <View key={i} style={styles.setLine}>
                <Text style={styles.body}>{i + 1}</Text>
                <Text style={styles.body}>
                  {number(s.weight)} × {s.reps}
                </Text>
                <Text style={styles.link}>✓ Completed</Text>
              </View>
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
          Small steps. Real strength.
        </Text>
        <Text style={styles.heading}>{exerciseName(progress.exerciseId)}</Text>
        <Text style={styles.body}>Your strength, session by session.</Text>
        <View style={styles.tabs}>
          <View style={styles.activeSegment}>
            <Text style={styles.link}>Strength</Text>
          </View>
          <Pressable
            style={styles.activeSegment}
            onPress={() => {
              void run(async () => {
                setHistory(await api<Workout[]>("/workouts"));
                navigate("consistency");
              });
            }}
          >
            <Text style={styles.small}>Consistency</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {catalog.map((e) => (
            <Chip
              key={e.id}
              label={e.name}
              selected={e.id === progress.exerciseId}
              onPress={() => {
                void showProgress(e.id);
              }}
            />
          ))}
        </ScrollView>
        {progress.points.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.small}>Estimated one-rep max</Text>
            <Text style={styles.metric}>
              {number(progress.records?.estimatedOneRepMax?.value)}{" "}
              <Text style={styles.small}>lb</Text>
            </Text>
            <StrengthChart
              points={progress.points.map((p) => ({
                id: String(p.workoutId),
                dateLabel: p.date,
                value: Number(p.estimatedOneRepMax || 0),
              }))}
              minimum={0}
              maximum={max * 1.1}
              ticks={[0, max / 2, max].map((v) => ({
                id: String(v),
                value: v,
                label: number(v),
              }))}
              dateLabels={progress.points
                .filter((_, i) => i === 0 || i === progress.points.length - 1)
                .map((p) => ({ id: String(p.workoutId), label: p.date }))}
              accessibilityLabel="Estimated one-rep max over your saved sessions"
            />
          </View>
        )}
        {!progress.points.length && (
          <Text style={styles.body}>
            No logged sets yet. Save a workout with this exercise to start
            tracking progress.
          </Text>
        )}
        {progress.records && (
          <View style={styles.softCard}>
            <View style={{ gap: 10, flex: 1 }}>
              <Text style={styles.heading}>A win worth noticing</Text>
              <Text style={styles.body}>
                Heaviest weight: {number(progress.records.maxWeight.value)} lb
              </Text>
              <Text style={styles.body}>
                Best estimated 1RM:{" "}
                {number(progress.records.estimatedOneRepMax?.value)} lb
              </Text>
              <Text style={styles.body}>
                Best session volume:{" "}
                {number(progress.records.maxWorkoutVolume.value)} lb
              </Text>
            </View>
          </View>
        )}
        <Text style={styles.body}>
          Estimated one-rep max over time. Zero external load has no estimate.
        </Text>
        <View style={styles.between}>
          <Text style={styles.heading}>Recent sessions</Text>
          <Pressable
            onPress={() => {
              void showHistory();
            }}
          >
            <Text style={styles.link}>All workouts →</Text>
          </Pressable>
        </View>
        {progress.points.map((p) => (
          <View key={p.workoutId} style={styles.card}>
            <Text style={styles.heading}>
              {p.date} · Workout {p.workoutId}
            </Text>
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
    screen === "form-coach" ? (
      <FormCoachScreen onBack={() => navigate(formCoachBack)} />
    ) : screen === "alternatives" ? (
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
          <Text style={styles.brand}>◈ SpotMe</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Your profile"
          onPress={() => navigate("profile")}
          style={styles.avatar}
        >
          <Text style={styles.link}>
            {user.email.slice(0, 2).toUpperCase()}
          </Text>
        </Pressable>
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
      <AppTabBar
        active={
          screen === "home"
            ? "Today"
            : screen === "profile"
              ? "You"
              : ["progress", "history", "detail", "consistency"].includes(
                    screen,
                  )
                ? "Progress"
                : "Train"
        }
        disabled={busy}
        onSelect={(tab) => {
          if (tab === "Today") navigate("home");
          else if (tab === "You") navigate("profile");
          else if (tab === "Train")
            navigate(draft.pending ? "review" : "workout");
          else if (catalog[0]) void showProgress(catalog[0].id);
        }}
      />
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
    paddingTop: Platform.OS === "ios" ? 52 : 12,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 0 80px rgba(28,48,37,0.08)" }
      : {}),
  },
  flex: { flex: 1 },
  setLine: {
    backgroundColor: colors.pale,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.3,
    color: colors.green,
    marginTop: 10,
  },
  heroEyebrow: {
    fontSize: 10,
    letterSpacing: 1,
    color: colors.lime,
    fontWeight: "700",
  },
  link: { fontSize: 12, color: colors.green, fontWeight: "600" },
  metric: {
    fontSize: 34,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -1,
  },
  softCard: {
    backgroundColor: colors.pale,
    padding: 18,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  equipmentRow: {
    padding: 17,
    borderRadius: 14,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabs: {
    backgroundColor: colors.soft,
    padding: 4,
    borderRadius: 12,
    flexDirection: "row",
    gap: 4,
  },
  activeSegment: {
    flex: 1,
    alignItems: "center",
    padding: 10,
    backgroundColor: colors.surface,
    borderRadius: 9,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 20,
    backgroundColor: colors.pale,
    alignItems: "center",
    justifyContent: "center",
  },
  authAccent: {
    backgroundColor: colors.pale,
    borderRadius: 22,
    padding: 24,
    gap: 18,
    marginTop: 20,
  },
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
    maxWidth: 440,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 32,
    gap: 18,
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
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.green,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -1,
    color: colors.ink,
  },
  heading: { fontSize: 16, fontWeight: "700", color: colors.ink },
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
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    gap: 12,
    borderWidth: 0,
    borderColor: colors.border,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.pale, borderColor: colors.green },
  chipText: { fontSize: 14, color: colors.ink },
  chipTextSelected: { color: colors.green },
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
