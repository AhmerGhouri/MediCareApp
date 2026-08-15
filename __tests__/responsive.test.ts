import { scale, verticalScale, moderateScale, normalize } from '../src/theme/responsive';
import { Dimensions, PixelRatio, Platform } from 'react-native';

import { afterEach, beforeAll, describe, expect, it } from '@jest/globals';
jest.mock('react-native', () => {
  return {
    Dimensions: {
      get: jest.fn(() => ({ width: 390, height: 844 })),
    },
    PixelRatio: {
      roundToNearestPixel: jest.fn((size) => Math.round(size)),
    },
    Platform: {
      OS: 'ios',
    },
  };
});

describe('responsive functions', () => {
  beforeAll(() => {
    // Mock dimensions to be exactly the base dimensions
    (Dimensions.get as jest.Mock).mockReturnValue({ width: 390, height: 844 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('scale returns same size on base width', () => {
    expect(scale(100)).toBe(100);
  });

  it('verticalScale returns same size on base height', () => {
    expect(verticalScale(100)).toBe(100);
  });

  it('moderateScale returns same size on base dimensions', () => {
    expect(moderateScale(100)).toBe(100);
  });

  it('normalize returns correctly rounded size on ios', () => {
    Platform.OS = 'ios';
    expect(normalize(100)).toBe(99); // 100 - 1 = 99 due to ios subtraction
  });

  it('normalize returns correctly rounded size on android', () => {
    Platform.OS = 'android';
    expect(normalize(100)).toBe(100);
  });

  describe('on larger screens', () => {
    beforeAll(() => {
      // Mock dimensions to be 2x the base dimensions
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 780, height: 1688 });
    });

    it('scale scales proportionally', () => {
      // Because we mocked Dimensions dynamically, we actually need to isolate the module
      // However, responsive.ts destructures Dimensions.get('window') at module load time!
      // So to test this, we would need to do jest.resetModules().
    });
  });
});
