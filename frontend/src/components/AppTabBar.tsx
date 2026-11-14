import React from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../theme";

export type AppTab = "Today" | "Train" | "Progress" | "You";
interface Props {
  active: AppTab;
  disabled?: boolean;
  onSelect: (tab: AppTab) => void;
}

export function AppTabBar({ active, disabled, onSelect }: Props) {
  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {(["Today", "Train", "Progress", "You"] as const).map((tab) => {
        const color = tab === active ? colors.green : colors.muted;
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityLabel={tab}
            accessibilityState={{ selected: tab === active, disabled }}
            disabled={disabled}
            onPress={() => onSelect(tab)}
            style={[styles.tab, tab === active && styles.active]}
          >
            <View style={styles.icon}>
              {tab === "Train" ? (
                <Image
                  source={require("../assets/dumbbell.png")}
                  style={{
                    width: 22,
                    height: 22,
                    opacity: tab === active ? 1 : 0.6,
                  }}
                />
              ) : tab === "You" ? (
                <>
                  <View style={[styles.head, { borderColor: color }]} />
                  <View style={[styles.shoulders, { borderColor: color }]} />
                </>
              ) : tab === "Progress" ? (
                <View style={styles.chart}>
                  {[7, 12, 18].map((height, i) => (
                    <View
                      key={i}
                      style={{
                        width: 3,
                        height,
                        backgroundColor: color,
                        borderRadius: 1,
                      }}
                    />
                  ))}
                </View>
              ) : (
                <Text style={{ fontSize: 25, lineHeight: 26, color }}>⌂</Text>
              )}
            </View>
            <Text
              style={{
                fontSize: 10,
                color,
                fontWeight: tab === active ? "700" : "400",
              }}
            >
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === "ios" ? 22 : 10,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  active: { borderColor: colors.green },
  icon: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  head: {
    width: 8,
    height: 8,
    borderRadius: 5,
    borderWidth: 1.3,
    marginBottom: 2,
  },
  shoulders: {
    width: 16,
    height: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1.3,
    borderBottomWidth: 0,
  },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 20 },
});
