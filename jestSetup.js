



jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Animated.timing = () => ({ start: jest.fn() });
  RN.Animated.spring = () => ({ start: jest.fn() });
  RN.Animated.parallel = () => ({ start: jest.fn() });
  RN.Animated.sequence = () => ({ start: jest.fn() });
  RN.Animated.loop = () => ({ start: jest.fn() });
  return RN;
});
