import React from 'react';
import Svg, { Circle, Polygon, G } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
  innerColor?: string;
}

export default function BottleCap({ size = 48, color = '#c9a844', innerColor = '#111d4a' }: Props) {
  const center = size / 2;
  const outerR = size / 2 - 1;
  const innerR = outerR * 0.72;
  const toothCount = 21;
  const toothDepth = outerR * 0.14;

  // Build the crimped edge polygon points
  const points: string[] = [];
  for (let i = 0; i < toothCount * 2; i++) {
    const angle = (i * Math.PI) / toothCount - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : outerR - toothDepth;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    points.push(`${x},${y}`);
  }

  return (
    <Svg width={size} height={size}>
      {/* Crimped outer edge */}
      <Polygon
        points={points.join(' ')}
        fill={color}
      />
      {/* Inner disc */}
      <Circle cx={center} cy={center} r={innerR} fill={innerColor} />
      {/* Center shine dot */}
      <Circle cx={center - innerR * 0.2} cy={center - innerR * 0.2} r={innerR * 0.18} fill={color} opacity={0.3} />
    </Svg>
  );
}
