import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, controls, radii, spacing, typography } from "../theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "text";
  disabled?: boolean;
  busy?: boolean;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  busy,
}: ButtonProps) {
  const [focused, setFocused] = useState(false);
  const foreground =
    variant === "primary"
      ? colors.onAccent
      : variant === "danger"
        ? colors.onDanger
        : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.button,
        buttonStyles[variant],
        (disabled || busy) && styles.disabled,
        pressed && styles.pressed,
        focused && styles.focused,
      ]}
    >
      {busy && <ActivityIndicator color={foreground} />}
      <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  integer?: boolean;
}

export function NumberField({
  label,
  value,
  onChange,
  error,
  disabled,
  integer,
}: NumberFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        value={value}
        onChangeText={onChange}
        keyboardType={integer ? "number-pad" : "decimal-pad"}
        editable={!disabled}
        selectTextOnFocus
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-invalid={!!error}
        style={[
          styles.input,
          !!error && styles.invalid,
          focused && styles.focused,
          disabled && styles.disabled,
        ]}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

interface SheetProps {
  title: string;
  onClose: () => void;
  locked?: boolean;
  children: React.ReactNode;
}

export function Sheet({ title, onClose, locked, children }: SheetProps) {
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!locked) onClose();
      }}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Close dialog"
          accessibilityRole="button"
          disabled={locked}
          onPress={onClose}
        />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetContent}
          >
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {title}
            </Text>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: controls.minTarget,
    borderRadius: radii.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  primary: { backgroundColor: colors.green },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  danger: { backgroundColor: colors.danger },
  text: { backgroundColor: "transparent" },
  buttonText: {
    ...typography.body,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  focused: {
    outlineStyle: "solid",
    outlineWidth: 2,
    outlineColor: colors.green,
    outlineOffset: 3,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  field: { gap: spacing.sm, flex: 1, minWidth: 0 },
  label: { color: colors.muted, ...typography.label },
  input: {
    minHeight: controls.inputHeight,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.control,
    paddingHorizontal: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
    ...typography.body,
  },
  invalid: { borderColor: colors.errorText },
  error: { ...typography.label, color: colors.errorText },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    backgroundColor: colors.surface,
    paddingTop: 16,
  },
  handle: {
    width: 44,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 4,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetContent: { paddingHorizontal: 22, paddingBottom: 32, gap: 14 },
  sheetTitle: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
});

const buttonStyles = {
  primary: styles.primary,
  secondary: styles.secondary,
  danger: styles.danger,
  text: styles.text,
};
