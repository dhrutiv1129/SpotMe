package com.spotme.common;

import static org.junit.jupiter.api.Assertions.fail;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/** Planned behavior only: replace each failure with calls to real production code. */
@Tag("pending")
@Disabled("ValidationAndErrors production API is not implemented; see TESTING.md before enabling")
class ValidationAndErrorsPendingTests {

    @Test
    void rejectsInvalidInput() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Call a real validator with an invalid value; assert its documented field and error code.");
    }

    @Test
    void rejectsMissingRequiredValues() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Omit each required value independently; assert its documented validation error.");
    }

    @Test
    void reportsMissingResource() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Mock an absent resource; call the real service and assert its resource-not-found exception.");
    }

    @Test
    void handlesExceptionsConsistently() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Trigger the same supported exception from two real endpoints; assert the agreed error response schema without stack traces.");
    }

    @Test
    void mapsErrorsToHttpResponses() {
        // Arrange / Act / Assert contract to implement once the production API exists.
        fail("Use a controller slice with the actual exception handler; assert the documented HTTP status and response body for validation, not-found and authorization errors.");
    }
}
