package com.spotme.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class OneRepMaxCalculatorTests {
  private final OneRepMaxCalculator calculator = new OneRepMaxCalculator();

  @ParameterizedTest
  @CsvSource({"100,10,133.333333", "62.5,6,75",
      "62.1234567,1,62.1234567", "0.01,2,0.010667"})
  void calculatesKnownResultsWithoutIntegerDivision(String weight, int reps, String expected) {
    assertThat(calculator.calculate(new BigDecimal(weight), reps)).hasValueSatisfying(
        value -> assertThat(value).isEqualByComparingTo(expected));
  }

  @Test
  void zeroExternalWeightHasNoEstimateIncludingSingleRep() {
    assertThat(calculator.calculate(BigDecimal.ZERO, 10)).isEmpty();
    assertThat(calculator.calculate(new BigDecimal("0.00"), 1)).isEmpty();
  }

  @ParameterizedTest
  @CsvSource({"-1,5", "100,0", "100,-1"})
  void rejectsInvalidInputs(String weight, int reps) {
    assertThatThrownBy(() -> calculator.calculate(new BigDecimal(weight), reps))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void rejectsMissingWeight() {
    assertThatThrownBy(() -> calculator.calculate(null, 5))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void largeRepetitionCountDoesNotOverflowIntegerAddition() {
    assertThat(calculator.calculate(new BigDecimal("30"), Integer.MAX_VALUE))
        .hasValueSatisfying(value -> assertThat(value).isEqualByComparingTo("2147483677"));
  }
}
