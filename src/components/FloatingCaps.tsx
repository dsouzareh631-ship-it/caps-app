import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Dimensions } from 'react-native';
import BottleCap from './BottleCap';

const { width, height } = Dimensions.get('window');

const CAP_COLORS = ['#c9a844', '#b22234', '#1e2d6b', '#a08030', '#8b1a1a'];

function FloatingCap({ delay, startX, size, colorIndex }: { delay: number; startX: number; size: number; colorIndex: number }) {
  const translateY = useRef(new Animated.Value(height + 100)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(height + 100);
      rotate.setValue(0);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -150,
          duration: 9000 + Math.random() * 4000,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 9000 + Math.random() * 4000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
          Animated.delay(7000),
          Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
      ]).start(() => animate());
    };

    const timeout = setTimeout(animate, delay);
    return () => clearTimeout(timeout);
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const color = CAP_COLORS[colorIndex % CAP_COLORS.length];

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        transform: [{ translateY }, { rotate: spin }],
        opacity,
      }}
      pointerEvents="none"
    >
      <BottleCap size={size} color={color} />
    </Animated.View>
  );
}

function Bubble({ delay, startX }: { delay: number; startX: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const size = 5 + Math.random() * 12;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(0);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -(120 + Math.random() * 220),
          duration: 2500 + Math.random() * 2500,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.55, duration: 400, useNativeDriver: true }),
          Animated.delay(1800),
          Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      ]).start(() => animate());
    };

    const timeout = setTimeout(animate, delay);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 60,
        left: startX,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#f0c040',
        borderWidth: 0.5,
        borderColor: '#c9a844',
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

export function FloatingCaps() {
  const caps = Array.from({ length: 7 }, (_, i) => ({
    delay: i * 1300,
    startX: 10 + Math.random() * (width - 70),
    size: 34 + Math.random() * 26,
    colorIndex: i,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {caps.map((c, i) => (
        <FloatingCap key={i} {...c} />
      ))}
    </View>
  );
}

export function FloatingBubbles() {
  const bubbles = Array.from({ length: 10 }, (_, i) => ({
    delay: i * 450,
    startX: 15 + Math.random() * (width - 30),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {bubbles.map((b, i) => (
        <Bubble key={i} {...b} />
      ))}
    </View>
  );
}
