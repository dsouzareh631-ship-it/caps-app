import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface Props {
  photoURL?: string | null;
  displayName: string;
  size: number;
}

export default function Avatar({ photoURL, displayName, size }: Props) {
  const radius = size / 2;
  const fontSize = size * 0.42;

  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
      <Text style={[styles.letter, { fontSize }]}>
        {displayName.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#c9a844',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  letter: {
    color: '#000',
    fontWeight: '800',
  },
});
