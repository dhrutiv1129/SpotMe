package com.spotme.workout;

/** Authentication integration boundary; never resolve identity from workout request fields. */
@FunctionalInterface
public interface CurrentUser {
  /** Returns the authenticated user's positive database ID, or throws if unauthenticated. */
  long requireUserId();
}
