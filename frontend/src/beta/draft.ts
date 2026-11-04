import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import type { WorkoutInput } from "./api";
export interface Draft extends WorkoutInput {
  key: string;
  pending: boolean;
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
  return draft;
}
export async function persistDraft(userId: number, draft: Draft) {
  await AsyncStorage.setItem(key(userId), JSON.stringify(draft));
}
