package com.spotme.consistency;

import java.time.YearMonth;
import java.util.List;

/** Consistency results derived from the authenticated user's completed workouts. */
public interface ConsistencyService {
  ConsistencySummaryDTO getSummary();

  /** Every day of the selected month, in date order. */
  List<CalendarDayDTO> getCalendar(YearMonth month);
}
