package com.spotme.analytics;

import static org.junit.jupiter.api.Assertions.fail;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/** Planned behavior only: replace each failure with calls to real production code. */
@Tag("pending")
@Disabled("EstimatedOneRepMax production API is not implemented; see TESTING.md before enabling")
class EstimatedOneRepMaxPendingTests {

    @Test
    void estimatesOneRepMaxForTenReps() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Call the production calculator with weight 100 and reps 10; assert 133.333333 within 0.000001.");
    }

    @Test
    void estimatesOneRepMaxForFiveReps() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Call the production calculator with weight 60 and reps 5; assert 70 within 0.000001.");
    }

    @Test
    void handlesSingleRepetition() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("First document whether one rep returns the lifted weight or Epley estimate; call the real calculator and assert that agreed value.");
    }

    @Test
    void supportsDecimalWeights() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Call the production calculator with weight 62.5 and reps 6; assert 75 within 0.000001.");
    }

    @Test
    void rejectsNegativeWeight() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Call the calculator with weight -1 and reps 5; assert the documented invalid-input exception.");
    }

    @Test
    void rejectsNegativeRepetitions() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Call the calculator with weight 100 and reps -1; assert the documented invalid-input exception.");
    }

    @Test
    void rejectsZeroRepetitions() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Call the calculator with weight 100 and reps 0; assert the documented invalid-input exception.");
    }

    @Test
    void preservesCalculationPrecision() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Call the calculator with weight 100 and reps 1 after the single-rep rule is settled; also use weight 100 and reps 7 and assert 123.333333 within 0.000001 to catch integer division.");
    }
}
