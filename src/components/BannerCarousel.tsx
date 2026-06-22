import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';
import {moderateScale, verticalScale} from '../theme/responsive';
import {Colors} from '../theme/colors';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CAROUSEL_ITEM_WIDTH = SCREEN_WIDTH - moderateScale(40);

const CAROUSEL_DATA = [
  {id: '1', image: require('../../assets/poster_kindney_day.jpg')},
  {id: '2', image: require('../../assets/poster_23_march.jpg')},
  {id: '3', image: require('../../assets/poster_autism.jpg')},
];

const BannerCarousel: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % CAROUSEL_DATA.length;
      setActiveIndex(nextIndex);
      flatListRef.current?.scrollToIndex({index: nextIndex, animated: true});
    }, 4000);

    return () => clearInterval(interval);
  }, [activeIndex]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={CAROUSEL_DATA}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / CAROUSEL_ITEM_WIDTH,
          );
          setActiveIndex(index);
        }}
        renderItem={({item}) => (
          <TouchableOpacity activeOpacity={0.9} style={styles.itemContainer}>
            <Image
              source={item.image}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
      />
      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        {CAROUSEL_DATA.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, activeIndex === i ? styles.activeDot : null]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: verticalScale(16),
  },
  itemContainer: {
    width: CAROUSEL_ITEM_WIDTH,
  },
  bannerImage: {
    width: '100%',
    height: verticalScale(200),
    borderRadius: moderateScale(20),
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: verticalScale(12),
    gap: moderateScale(6),
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  activeDot: {
    width: 20,
    backgroundColor: Colors.redPrimary,
  },
});

export default BannerCarousel;
