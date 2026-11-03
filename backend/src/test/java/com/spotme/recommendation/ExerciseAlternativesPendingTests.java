package com.spotme.recommendation;

import static org.junit.jupiter.api.Assertions.fail;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/** Planned behavior only: replace each failure with calls to real production code. */
@Tag("pending")
@Disabled("Catalog lookup and recommendation API are not implemented; see TESTING.md before enabling")
class ExerciseAlternativesPendingTests {

    @Test
    void handlesMissingExercise() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Provide missing exercise information; assert the documented validation or not-found outcome.");
    }

    @Test
    void handlesInvalidExercise() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Provide an unknown exercise ID; assert the documented validation or not-found outcome.");
    }

}
