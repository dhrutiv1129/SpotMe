package com.spotme.recommendation;

import static org.junit.jupiter.api.Assertions.fail;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/** Planned behavior only: replace each failure with calls to real production code. */
@Tag("pending")
@Disabled("ExerciseAlternatives production API is not implemented; see TESTING.md before enabling")
class ExerciseAlternativesPendingTests {

    @Test
    void matchesTargetMuscles() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Provide matching and nonmatching muscle groups; assert only matching candidates are returned.");
    }

    @Test
    void filtersUnavailableEquipment() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Provide dumbbell and barbell candidates with only dumbbells available; assert barbell candidates are excluded.");
    }

    @Test
    void selectsBeginnerFriendlyExercises() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Provide beginner and advanced candidates; assert selection follows the documented beginner rule.");
    }

    @Test
    void ranksEasiestFirst() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Provide candidates in reverse difficulty order; assert ascending difficulty.");
    }

    @Test
    void returnsTopThreeAlternatives() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Provide five eligible candidates; assert exactly the three highest-ranked are returned.");
    }

    @Test
    void returnsOnlyAvailableAlternatives() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Provide two eligible candidates; assert exactly those two with no fabricated entries.");
    }

    @Test
    void handlesNoAlternatives() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Provide no eligible candidates; assert an empty result.");
    }

    @Test
    void excludesOriginalExercise() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Include the original exercise among eligible candidates; assert it is absent from the output.");
    }

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

    @Test
    void breaksDifficultyTiesDeterministically() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Define a secondary ranking key; shuffle equally difficult candidates and assert identical ordering.");
    }
}
