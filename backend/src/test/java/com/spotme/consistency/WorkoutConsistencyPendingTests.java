package com.spotme.consistency;

import static org.junit.jupiter.api.Assertions.fail;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/** Planned behavior only: replace each failure with calls to real production code. */
@Tag("pending")
@Disabled("Remaining consistency service/calendar APIs are not implemented; see TESTING.md before enabling")
class WorkoutConsistencyPendingTests {

    @Test
    void recordsCompletionDates() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Record a completed workout at a fixed instant; assert its date in the configured user timezone.");
    }

    @Test
    void ordersDatesChronologically() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Provide dates out of order; assert chronological calendar output.");
    }

    @Test
    void generatesCalendarData() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Provide known completion dates within a requested interval; assert their calendar entries and documented inactive-day representation.");
    }

    @Test
    void generatesHeatmapData() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Provide multiple sessions on a date; assert that date has the correct heatmap count under the documented intensity rule.");
    }

    @Test
    void convertsInstantsUsingUserTimezone() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("If timezone support exists, provide instants on either side of local midnight; assert local dates rather than UTC dates, including a daylight-saving boundary.");
    }
}
