import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

type CircularGaugeProps = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  centerValue: string;
  centerLabel: string;
  centerSublabel?: string;
  valueColor?: string;
  labelColor?: string;
  sublabelColor?: string;
  footer?: ReactNode;
};

export function CircularGauge({
  progress,
  size = 148,
  strokeWidth = 10,
  color,
  trackColor,
  centerValue,
  centerLabel,
  centerSublabel,
  valueColor = "#111827",
  labelColor = "#6B7280",
  sublabelColor = "#9CA3AF",
  footer,
}: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference * (1 - clamped);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.ring, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={styles.center}>
          <Text
            style={[styles.centerValue, { color: valueColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {centerValue}
          </Text>
          <Text style={[styles.centerLabel, { color: labelColor }]}>{centerLabel}</Text>
          {centerSublabel ? (
            <Text style={[styles.centerSublabel, { color: sublabelColor }]}>
              {centerSublabel}
            </Text>
          ) : null}
        </View>
      </View>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  ring: {
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    paddingHorizontal: 12,
    maxWidth: "78%",
  },
  centerValue: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  centerLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  centerSublabel: {
    marginTop: 2,
    fontSize: 11,
    textAlign: "center",
  },
});
