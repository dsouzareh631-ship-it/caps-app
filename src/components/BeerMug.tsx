import React from 'react';
import Svg, { Rect, Path, Ellipse, Circle } from 'react-native-svg';

interface Props {
  size?: number;
}

export default function BeerMug({ size = 64 }: Props) {
  const s = size / 64;

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* Mug body */}
      <Path
        d="M10 22 L14 58 L46 58 L50 22 Z"
        fill="#d4880a"
        stroke="#c9a844"
        strokeWidth="1.5"
      />
      {/* Beer fill (amber) */}
      <Path
        d="M12 30 L15 58 L45 58 L48 30 Z"
        fill="#f0a500"
        opacity={0.9}
      />
      {/* Foam top */}
      <Ellipse cx="30" cy="22" rx="20" ry="7" fill="#fff" opacity={0.95} />
      <Ellipse cx="18" cy="20" rx="7" ry="5" fill="#fff" />
      <Ellipse cx="38" cy="19" rx="8" ry="5.5" fill="#fff" />
      <Ellipse cx="30" cy="18" rx="6" ry="4" fill="#fff" />
      {/* Handle */}
      <Path
        d="M50 28 Q64 28 64 38 Q64 48 50 48"
        fill="none"
        stroke="#c9a844"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Bubbles in beer */}
      <Circle cx="22" cy="42" r="2" fill="#f5c842" opacity={0.6} />
      <Circle cx="32" cy="36" r="1.5" fill="#f5c842" opacity={0.5} />
      <Circle cx="40" cy="46" r="2" fill="#f5c842" opacity={0.6} />
      <Circle cx="27" cy="50" r="1.2" fill="#f5c842" opacity={0.4} />
    </Svg>
  );
}
