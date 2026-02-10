import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const MilepostDisplay = ({ milepost, trackType, trackNumber, subdivision, heading, speed }) => {
  const getCompassDirection = (deg) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainDisplay}>
        <Text style={styles.label}>CURRENT MILEPOST</Text>
        <Text style={styles.milepost}>
          {milepost ? `MP ${milepost.toFixed(2)}` : '--'}
        </Text>
      </View>

      <View style={styles.separator} />

      <View style={styles.trackInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="train" size={16} color={COLORS.accent} />
          <Text style={styles.trackText}>
            {trackType && trackNumber ? `${trackType} ${trackNumber}` : 'No Track'}
          </Text>
        </View>
        
        {subdivision && (
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color={COLORS.accent} />
            <Text style={styles.subdivisionText}>{subdivision}</Text>
          </View>
        )}
      </View>

      {heading !== null && (
        <View style={styles.compass}>
          <Ionicons 
            name="compass" 
            size={20} 
            color={COLORS.accent} 
            style={{ transform: [{ rotate: `${heading}deg` }] }}
          />
          <Text style={styles.compassText}>{getCompassDirection(heading)}</Text>
          {speed !== null && (
            <Text style={styles.speedText}>{speed.toFixed(1)} mph</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    minWidth: 200,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    ...SHADOWS.lg,
  },
  mainDisplay: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  milepost: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  trackInfo: {
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  trackText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  subdivisionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  compass: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  compassText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  speedText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.md,
  },
});

export default MilepostDisplay;
