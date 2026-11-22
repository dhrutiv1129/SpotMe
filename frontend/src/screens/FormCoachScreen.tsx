import React from "react";
import { ScrollView, Text } from "react-native";
import { Button } from "../components/WorkoutControls";
import { DISCLAIMER, RECORDING_INSTRUCTIONS } from "../form-coach/config";
import { colors } from "../theme";
/** Native clients keep working; the MVP uses browser video decoding and WebAssembly. */
export function FormCoachScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 22, gap: 20 }}>
      <Button label="Back" variant="text" onPress={onBack} />
      <Text
        accessibilityRole="header"
        style={{ fontSize: 30, color: colors.ink, fontWeight: "700" }}
      >
        Form Coach
      </Text>
      <Text style={{ color: colors.ink }}>Bodyweight Squat · Side View</Text>
      <Text style={{ color: colors.muted, lineHeight: 22 }}>
        Open SpotMe in a current desktop or mobile browser to analyze a video.
        Native video analysis is not available in this MVP.
      </Text>
      <Text style={{ color: colors.muted, lineHeight: 22 }}>
        {RECORDING_INSTRUCTIONS}
      </Text>
      <Text style={{ color: colors.muted, lineHeight: 22 }}>{DISCLAIMER}</Text>
    </ScrollView>
  );
}
