import React, { useState } from "react";
import {
  View,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleSheet,
} from "react-native";
import { theme } from "../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CarouselProps {
  children: React.ReactNode[];
  itemWidth?: number;
  gap?: number;
}

export function Carousel({
  children,
  itemWidth = SCREEN_WIDTH * 0.85,
  gap = 12,
}: CarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / (itemWidth + gap));
    setActiveIndex(Math.min(index, children.length - 1));
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth + gap}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ gap }}
        onMomentumScrollEnd={handleScroll}
      >
        {children.map((child, index) => (
          <View key={index} style={{ width: itemWidth }}>
            {child}
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {children.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                width: index === activeIndex ? 8 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  index === activeIndex
                    ? theme.colors.primary
                    : theme.colors.border,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {},
});
