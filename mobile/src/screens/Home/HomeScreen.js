import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';

const HomeScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const { unreadAlertsCount } = useSelector((state) => state.alerts);
  const { activeAuthority } = useSelector((state) => state.authority || {});

  const quickActions = [
    {
      id: 'map',
      title: 'Track Map',
      icon: 'map-marker',
      color: COLORS.accent,
      onPress: () => navigation.navigate('Map'),
    },
    {
      id: 'authority',
      title: activeAuthority ? 'Active Authority' : 'Enter Authority',
      icon: 'clipboard-check',
      color: activeAuthority ? COLORS.authorityActive : COLORS.accent,
      onPress: () => navigation.navigate('Authority'),
    },
    {
      id: 'pins',
      title: 'Pin Drops',
      icon: 'map-marker-multiple',
      color: COLORS.accent,
      onPress: () => navigation.navigate('Pins'),
    },
    {
      id: 'alerts',
      title: 'Alerts',
      icon: 'bell',
      color: COLORS.error,
      badge: unreadAlertsCount,
      onPress: () => navigation.navigate('Alerts'),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Herzog Rail Authority</Text>
        <Text style={styles.subtitle}>Welcome, {user?.Employee_Name || 'User'}</Text>
      </View>

      {activeAuthority && (
        <View style={styles.activeAuthorityBanner}>
          <MaterialCommunityIcons name="shield-check" size={24} color={COLORS.authorityActive} />
          <View style={styles.authorityInfo}>
            <Text style={styles.authorityText}>AUTHORITY ACTIVE</Text>
            <Text style={styles.authorityDetails}>
              {activeAuthority.Subdivision} • MP {activeAuthority.Begin_Milepost}-{activeAuthority.End_Milepost}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => navigation.navigate('Authority')}
          >
            <Text style={styles.viewButtonText}>VIEW</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionCard, { borderLeftColor: action.color }]}
                onPress={action.onPress}
              >
                <View style={styles.actionIconContainer}>
                  <MaterialCommunityIcons name={action.icon} size={32} color={action.color} />
                  {action.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{action.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="calendar-check" size={24} color="#4CAF50" />
              <Text style={styles.summaryLabel}>Active Authorities</Text>
              <Text style={styles.summaryValue}>-</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="map-marker" size={24} color="#2196F3" />
              <Text style={styles.summaryLabel}>Nearby Infrastructure</Text>
              <Text style={styles.summaryValue}>-</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    paddingTop: 40,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  activeAuthorityBanner: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.authorityActive,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  authorityInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  authorityText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.authorityActive,
  },
  authorityDetails: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  viewButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  viewButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.md,
    color: COLORS.text,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.sm,
  },
  actionCard: {
    width: '50%',
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    margin: SPACING.sm,
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  actionIconContainer: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.round,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  badgeText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  actionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
});

export default HomeScreen;
