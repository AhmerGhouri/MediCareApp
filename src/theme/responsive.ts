import {Dimensions, PixelRatio, Platform} from 'react-native';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// Design baseline: iPhone 14 / modern Android flagship
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/** Clamp a value between min and max */
const clamp = (min: number, value: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Horizontal scale — clamped to ±15% of base to avoid extreme sizing
 * on very small (320-wide) or very large (430-wide) screens.
 */
export const scale = (size: number) => {
  const ratio = clamp(0.85, SCREEN_WIDTH / BASE_WIDTH, 1.15);
  return ratio * size;
};

/**
 * Vertical scale — clamped similarly.
 */
export const verticalScale = (size: number) => {
  const ratio = clamp(0.85, SCREEN_HEIGHT / BASE_HEIGHT, 1.15);
  return ratio * size;
};

/**
 * Moderate scale — blends raw logical size with scaled size.
 * Lower factor = closer to raw size (less artificial inflation/deflation).
 */
export const moderateScale = (size: number, factor = 0.2) => {
  return size + (scale(size) - size) * factor;
};

/**
 * Font normalizer — prevents text from being illegibly small on
 * sub-360 screens or oversized on 430+ screens.
 */
export const normalize = (size: number) => {
  // Gentler factor to prevent wild swings
  const factor = Platform.OS === 'ios' ? 0.15 : 0.25;
  const newSize = moderateScale(size, factor);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};
