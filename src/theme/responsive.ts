import {Dimensions, PixelRatio, Platform} from 'react-native';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// Keep base close to modern larger phones to prevent over-scaling on smaller ones
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

export const scale = (size: number) => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

export const verticalScale = (size: number) => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

export const moderateScale = (size: number, factor = 0.2) => {
  // Lower factor means less artificial scaling (closer to raw logical points)
  return size + (scale(size) - size) * factor;
};

/** Use this for sizing text fonts dynamically but preventing extreme upsizing */
export const normalize = (size: number) => {
  // On iOS, system already handles logical points well.
  // We use a small factor to just give a gentle scale.
  const newSize = moderateScale(size, Platform.OS === 'ios' ? 0.1 : 0.3);
  return (
    Math.round(PixelRatio.roundToNearestPixel(newSize)) -
    (Platform.OS === 'ios' ? 1 : 0)
  );
};
