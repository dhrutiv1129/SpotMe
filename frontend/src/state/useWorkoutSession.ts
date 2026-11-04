import {useEffect, useRef, useState} from 'react';
import type {WorkoutView} from '../screens/WorkoutLogScreen';

export interface WorkoutSessionSource {
  startWorkout: (planId: string) => Promise<WorkoutView>;
  loadWorkout: (sessionId: string, exerciseId?: string) => Promise<WorkoutView>;
}

/** Keeps the current workout response available to the Train screens. */
export function useWorkoutSession(source: WorkoutSessionSource) {
  const [workout, setWorkout] = useState<WorkoutView | null>(null);
  const currentWorkout = useRef<WorkoutView | null>(null);
  const requestVersion = useRef(0);
  const starting = useRef(false);

  useEffect(() => () => {requestVersion.current += 1;}, []);

  async function startWorkout(planId: string) {
    if (starting.current) return;
    if (currentWorkout.current) {
      throw new Error('Finish the current workout before starting another.');
    }
    starting.current = true;
    const version = ++requestVersion.current;
    try {
      const response = await source.startWorkout(planId);
      if (version !== requestVersion.current) return;
      if (!response.sessionId || response.status !== 'active') {
        throw new Error('The started workout could not be confirmed.');
      }
      currentWorkout.current = response;
      setWorkout(response);
    } finally {
      if (version === requestVersion.current) starting.current = false;
    }
  }

  async function refreshWorkout(exerciseId?: string) {
    const sessionId = currentWorkout.current?.sessionId;
    if (!sessionId) return;
    const version = ++requestVersion.current;
    const response = await source.loadWorkout(sessionId, exerciseId);
    if (version !== requestVersion.current) return;
    if (response.sessionId !== sessionId) {
      throw new Error('The updated workout could not be confirmed.');
    }
    if (exerciseId && response.exercise.id !== exerciseId) {
      throw new Error('The selected exercise could not be opened.');
    }
    currentWorkout.current = response;
    setWorkout(response);
  }

  function clearWorkout() {
    requestVersion.current += 1;
    starting.current = false;
    currentWorkout.current = null;
    setWorkout(null);
  }

  return {workout, startWorkout, refreshWorkout, clearWorkout};
}
