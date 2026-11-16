import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import type { WorkoutInput } from "./api";
export interface Draft extends WorkoutInput {
  key: string;
  pending: boolean;
  session?: {
    elapsedMs: number;
    runningSince: number | null;
    inputs: Record<string, {weight: string; reps: string}>;
    targets?: Array<{exerciseId: number; sets: number; reps: number}>;
    substitutions?: Record<string, number>;
  };
  plan?: {
    name: string;
    ready: boolean;
    targets: Array<{exerciseId: number; sets: number; reps: number}>;
  };
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function newDraft(): Draft {
  return {
    key: Crypto.randomUUID(),
    date: today(),
    exercises: [],
    pending: false,
  };
}
export function payload(draft: Draft): WorkoutInput {
  return {
    date: draft.date,
    exercises: draft.exercises.filter((e) => e.sets.length > 0),
  };
}
export function elapsedMilliseconds(draft: Draft, now = Date.now()) {
  if (!draft.session) return 0;
  return draft.session.elapsedMs + (draft.session.runningSince === null ? 0 : Math.max(0, now - draft.session.runningSince));
}
export function pauseDraft(draft: Draft, now = Date.now()): Draft {
  return {...draft, session: {...draft.session, elapsedMs: elapsedMilliseconds(draft, now), runningSince: null, inputs: draft.session?.inputs || {}}};
}
export function resumeDraft(draft: Draft, now = Date.now()): Draft {
  if (draft.session?.runningSince != null) return draft;
  return {...draft, session: {...draft.session, elapsedMs: draft.session?.elapsedMs || 0, runningSince: now, inputs: draft.session?.inputs || {}, targets: draft.session?.targets || draft.plan?.targets}};
}
export function workoutTargets(draft: Draft) {
  return draft.session?.targets || draft.plan?.targets || [];
}
export function workoutCounts(draft: Draft) {
  const targets = workoutTargets(draft);
  const completed = draft.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const pending = targets.reduce((sum, target) => sum + Math.max(0, target.sets - (draft.exercises.find(exercise => exercise.exerciseId === target.exerciseId)?.sets.length || 0)), 0);
  return {completed, pending, total: completed + pending, hasTargets: targets.length > 0};
}
export function resetWorkout(draft: Draft): Draft {
  return draft.plan ? {...newDraft(), plan: {...draft.plan, ready: true}, exercises: draft.plan.targets.map(target => ({exerciseId: target.exerciseId, sets: []}))} : newDraft();
}
const key = (userId: number) => `spotme-draft-v1-${userId}`;
export async function loadDraft(userId: number): Promise<Draft> {
  const value = await AsyncStorage.getItem(key(userId));
  if (!value) return newDraft();
  const draft = JSON.parse(value) as Draft;
  if (
    !draft.key ||
    !Array.isArray(draft.exercises) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.date)
  )
    throw new Error(
      "Saved workout draft could not be read. Your stored draft has been kept.",
    );
  if (draft.plan && (
    typeof draft.plan.name !== 'string' || !draft.plan.name.trim() ||
    typeof draft.plan.ready !== 'boolean' || !Array.isArray(draft.plan.targets) ||
    draft.plan.targets.length === 0 ||
    draft.plan.targets.some(target => !Number.isSafeInteger(target.exerciseId) ||
      !Number.isSafeInteger(target.sets) || target.sets <= 0 ||
      !Number.isSafeInteger(target.reps) || target.reps <= 0) ||
    new Set(draft.plan.targets.map(target => target.exerciseId)).size !== draft.plan.targets.length ||
    (draft.plan.ready && (draft.pending || draft.exercises.some(exercise => exercise.sets.length > 0) ||
      draft.exercises.length !== draft.plan.targets.length ||
      draft.exercises.some((exercise, index) => exercise.exerciseId !== draft.plan!.targets[index].exerciseId)))
  )) throw new Error('Saved workout plan could not be read. Your stored plan has been kept.');
  if (draft.session && (
    !Number.isFinite(draft.session.elapsedMs) || draft.session.elapsedMs < 0 ||
    (draft.session.runningSince !== null && (!Number.isFinite(draft.session.runningSince) || draft.session.runningSince < 0)) ||
    !draft.session.inputs || typeof draft.session.inputs !== 'object' || Array.isArray(draft.session.inputs) ||
    Object.values(draft.session.inputs).some(input => !input || typeof input.weight !== 'string' || typeof input.reps !== 'string') ||
    (draft.session.targets !== undefined && (!Array.isArray(draft.session.targets) ||
      draft.session.targets.some(target => !target || !Number.isSafeInteger(target.exerciseId) || !Number.isSafeInteger(target.sets) || target.sets <= 0 || !Number.isSafeInteger(target.reps) || target.reps <= 0) ||
      new Set(draft.session.targets.map(target => target.exerciseId)).size !== draft.session.targets.length)) ||
    (draft.session.substitutions !== undefined && (!draft.session.substitutions || typeof draft.session.substitutions !== 'object' || Array.isArray(draft.session.substitutions) || Object.values(draft.session.substitutions).some(id => !Number.isSafeInteger(id))))
  )) throw new Error('Saved workout timer could not be read. Your stored workout has been kept.');
  return draft;
}
export async function persistDraft(userId: number, draft: Draft) {
  await AsyncStorage.setItem(key(userId), JSON.stringify(draft));
}
