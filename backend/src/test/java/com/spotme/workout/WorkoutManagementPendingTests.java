package com.spotme.workout;

import static org.junit.jupiter.api.Assertions.fail;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/** Planned behavior only: replace each failure with calls to real production code. */
@Tag("pending")
@Disabled("Remaining workout update/delete/detail APIs are not implemented; see TESTING.md before enabling")
class WorkoutManagementPendingTests {

    @Test
    void updatesExistingWorkout() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Mock an owned existing workout; update it; assert the saved values changed and its ID and owner were preserved.");
    }

    @Test
    void editsRecordedSet() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Change one recorded set from 10 to 12 reps; assert only that set changes.");
    }

    @Test
    void deletesRecordedSet() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Remove one of two recorded sets; assert the other set remains unchanged.");
    }

    @Test
    void deletesOwnedWorkout() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Mock an owned existing workout; delete it; verify deletion of that ID.");
    }

    @Test
    void handlesUnknownWorkoutId() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Mock missing IDs for lookup, update and delete; assert the documented not-found outcome for each operation.");
    }

    @Test
    void preservesWorkoutOwnership() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Try to read, update and delete a different user's workout; assert rejection and no mutation.");
    }
}
