import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import type { WorkoutInput } from "./api";
export interface Draft extends WorkoutInput {
  key: string;
  pending: boolean;
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
  return draft;
}
export async function persistDraft(userId: number, draft: Draft) {
  await AsyncStorage.setItem(key(userId), JSON.stringify(draft));
}
