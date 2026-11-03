import React from 'react';
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
} from 'react-native';
import {colors} from '../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'text';
  disabled?: boolean;
  busy?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  busy,
}: ButtonProps) {
  const filled = variant === 'primary' || variant === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled: !!disabled || !!busy, busy: !!busy}}
      disabled={disabled || busy}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        buttonStyles[variant],
        (disabled || busy) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {busy && (
        <ActivityIndicator color={filled ? colors.surface : colors.green} />
      )}
      <Text style={[styles.buttonText, filled && styles.lightText]}>
        {label}
      </Text>
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
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        value={value}
        onChangeText={onChange}
        keyboardType={integer ? 'number-pad' : 'decimal-pad'}
        editable={!disabled}
        selectTextOnFocus
        style={[styles.input, !!error && styles.invalid]}
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

export function Sheet({title, onClose, locked, children}: SheetProps) {
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primary: {backgroundColor: colors.green},
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {backgroundColor: colors.danger},
  text: {backgroundColor: 'transparent'},
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.green,
    textAlign: 'center',
  },
  lightText: {color: colors.surface},
  disabled: {opacity: 0.45},
  pressed: {opacity: 0.75},
  field: {gap: 6, flex: 1},
  label: {color: colors.green, fontSize: 10, fontWeight: '700'},
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
    fontSize: 16,
  },
  invalid: {borderColor: colors.danger},
  error: {fontSize: 12, color: colors.danger},
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 39, 28, 0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.surface,
    paddingTop: 16,
  },
  handle: {
    width: 44,
    height: 4,
    backgroundColor: '#D6D9D0',
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetContent: {paddingHorizontal: 22, paddingBottom: 32, gap: 14},
  sheetTitle: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
});

const buttonStyles = {
  primary: styles.primary,
  secondary: styles.secondary,
  danger: styles.danger,
  text: styles.text,
};
