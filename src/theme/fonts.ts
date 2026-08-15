import {Platform} from 'react-native';

/**
 * Montserrat font-family map.
 *
 * React Native on Android requires the exact filename (minus .ttf) as fontFamily.
 * On iOS, the PostScript name is used — which for Montserrat is the same pattern.
 *
 * Usage:
 *   { fontFamily: Fonts.bold, fontWeight: '700' as const }
 *
 * The fontWeight is still needed for iOS to pick the right weight;
 * Android ignores fontWeight and relies solely on fontFamily.
 */
export const Fonts = {
  thin: 'Montserrat-Thin',
  extraLight: 'Montserrat-ExtraLight',
  light: 'Montserrat-Light',
  regular: 'Montserrat-Regular',
  medium: 'Montserrat-Medium',
  semiBold: 'Montserrat-SemiBold',
  bold: 'Montserrat-Bold',
  extraBold: 'Montserrat-ExtraBold',
  black: 'Montserrat-Black',
};

/**
 * Helper: Maps a numeric fontWeight string to the correct Montserrat fontFamily.
 * Useful when you want a single call: `...fontStyle('700')`.
 */
const weightMap: Record<string, string> = {
  '100': Fonts.thin,
  '200': Fonts.extraLight,
  '300': Fonts.light,
  '400': Fonts.regular,
  '500': Fonts.medium,
  '600': Fonts.semiBold,
  '700': Fonts.bold,
  '800': Fonts.extraBold,
  '900': Fonts.black,
  normal: Fonts.regular,
  bold: Fonts.bold,
};

export const fontStyle = (
  weight: string = '400',
): {fontFamily: string; fontWeight: string} => ({
  fontFamily: weightMap[weight] || Fonts.regular,
  fontWeight: weight as any,
});
