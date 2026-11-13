import React, {useState} from 'react';
import {SavedWorkoutPlansScreen} from '../screens/SavedWorkoutPlansScreen';
import type {SavedWorkoutPlanView} from '../screens/SavedWorkoutPlansScreen';
import {WorkoutPlanEditorScreen} from '../screens/WorkoutPlanEditorScreen';
import type {EditableWorkoutPlan} from '../screens/WorkoutPlanEditorScreen';

export interface WorkoutPlanSnapshot {
  summary: SavedWorkoutPlanView;
  editable: EditableWorkoutPlan;
}

interface Props {
  workoutPlan: WorkoutPlanSnapshot;
  initials: string;
  dateLabel: string;
  onSavePlan: (plan: EditableWorkoutPlan) => Promise<WorkoutPlanSnapshot>;
  onStartWorkout: (planId: string) => Promise<void>;
  onCreateWorkout?: () => void;
}

/** Connects the saved plan to its editor and the start-workout action. */
export function WorkoutPlanNavigator(props: Props) {
  return <PlanFlow key={props.workoutPlan.summary.id} {...props} />;
}

function PlanFlow({workoutPlan, initials, dateLabel, onSavePlan, onStartWorkout, onCreateWorkout}: Props) {
  const [saved, setSaved] = useState(workoutPlan);
  const [editing, setEditing] = useState(false);

  async function savePlan(plan: EditableWorkoutPlan) {
    const response = await onSavePlan(plan);
    if (response.editable.id !== plan.id || response.summary.id !== plan.id) {
      throw new Error('The workout plan save could not be confirmed.');
    }
    setSaved(response);
    return response.editable;
  }

  if (editing) {
    return (
      <WorkoutPlanEditorScreen
        plan={saved.editable}
        dateLabel={dateLabel}
        onSave={savePlan}
        onSaved={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <SavedWorkoutPlansScreen
      plan={saved.summary}
      initials={initials}
      onEditPlan={() => setEditing(true)}
      onStartWorkout={onStartWorkout}
      onCreateWorkout={onCreateWorkout}
    />
  );
}
