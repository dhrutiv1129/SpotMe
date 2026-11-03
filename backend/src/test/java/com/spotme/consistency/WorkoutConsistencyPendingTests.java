package com.spotme.consistency;

import static org.junit.jupiter.api.Assertions.fail;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/** Planned behavior only: replace each failure with calls to real production code. */
@Tag("pending")
@Disabled("Completion-date ingestion and timezone conversion are not implemented; see TESTING.md before enabling")
class WorkoutConsistencyPendingTests {

    @Test
    void recordsCompletionDates() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Record a completed workout at a fixed instant; assert its date in the configured user timezone.");
    }

    @Test
    void convertsInstantsUsingUserTimezone() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("If timezone support exists, provide instants on either side of local midnight; assert local dates rather than UTC dates, including a daylight-saving boundary.");
    }
}
