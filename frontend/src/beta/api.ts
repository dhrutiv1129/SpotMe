import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export interface User {
  id: number;
  email: string;
}
export interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  requiredEquipment: string[];
  difficulty: string;
  bodyweight: boolean;
  instructions: string;
}
export interface Workout {
  id: number;
  date: string;
  exercises: WorkoutInput["exercises"];
}
export interface WorkoutInput {
  date: string;
  exercises: Array<{
    exerciseId: number;
    sets: Array<{ weight: number; reps: number }>;
  }>;
}
export interface Progress {
  exerciseId: number;
  points: Array<{
    workoutId: number;
    date: string;
    volume: number;
    estimatedOneRepMax: number | null;
    oneRepMaxChange: number | null;
  }>;
  records: {
    maxWeight: { value: number; date: string };
    estimatedOneRepMax: { value: number; date: string } | null;
    maxWorkoutVolume: { value: number; date: string };
  } | null;
}
export interface Alternative {
  exerciseId: number;
  name: string;
  muscleGroups: string[];
  requiredEquipment: string[];
  difficulty: string;
  instructions: string;
  relevance: number;
}

const configured = process.env.EXPO_PUBLIC_API_URL;
const base = (
  configured !== undefined
    ? configured
    : Platform.OS === "web" && !__DEV__
      ? ""
      : "http://localhost:8080"
).replace(/\/$/, "");
let token: string | null = null;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function restoreToken() {
  token =
    Platform.OS === "web"
      ? sessionStorage.getItem("spotme-session")
      : await SecureStore.getItemAsync("spotme-session");
  return token;
}
export async function storeToken(value: string | null) {
  if (Platform.OS === "web") {
    if (value) sessionStorage.setItem("spotme-session", value);
    else sessionStorage.removeItem("spotme-session");
  } else {
    if (value) await SecureStore.setItemAsync("spotme-session", value);
    else await SecureStore.deleteItemAsync("spotme-session");
  }
  token = value;
}
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; key?: string } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${base}/api${path}`, {
      method: options.method || "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.key ? { "Idempotency-Key": options.key } : {}),
      },
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : undefined;
    if (!response.ok) {
      const details = Array.isArray(data?.errors)
        ? data.errors
            .map(
              (e: { field: string; message: string }) =>
                `${e.field}: ${e.message}`,
            )
            .join(" ")
        : "";
      throw new ApiError(
        `${data?.message || "Request failed."}${details ? ` ${details}` : ""}`,
        response.status,
      );
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(
      "Could not reach SpotMe. Check your connection and try again. Your logged sets are kept on this device.",
    );
  } finally {
    clearTimeout(timer);
  }
}
