import React from 'react';
import {Platform, StyleSheet, View, useWindowDimensions} from 'react-native';
import {colors} from '../theme';

/** Give desktop recordings a phone viewport; native and small screens stay full size. */
export function PhonePreview({children}: {children: React.ReactNode}) {
  const {width, height} = useWindowDimensions();
  if (Platform.OS !== 'web' || width < 480) return <>{children}</>;

  return (
    <View style={styles.stage}>
      <View
        testID="phone-preview"
        style={[styles.device, {height: Math.min(852, height - 32)}]}>
        <View style={styles.screen}>{children}</View>
        <View pointerEvents="none" style={styles.speaker} />
        <View pointerEvents="none" style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DEE4DE',
    padding: 16,
  },
  device: {
    width: 406,
    maxWidth: '100%',
    borderRadius: 44,
    borderWidth: 8,
    borderColor: '#18211C',
    backgroundColor: colors.background,
    boxShadow: '0 20px 60px rgba(20, 35, 26, 0.2)',
    overflow: 'hidden',
  },
  screen: {flex: 1, borderRadius: 35, overflow: 'hidden', paddingBottom: 16},
  speaker: {
    position: 'absolute',
    top: 7,
    alignSelf: 'center',
    width: 64,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#18211C',
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
    width: 110,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#18211C',
  },
});
