import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { clearAuthority } from '../../store/slices/authoritySlice';
import theme from '../../constants/theme';

const AuthorityScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { activeAuthority } = useSelector((state) => state.authority);

  const handleClearAuthority = () => {
    Alert.alert(
      'Clear Authority',
      'Are you sure you want to clear this authority? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(clearAuthority()).unwrap();
              Alert.alert('Success', 'Authority cleared successfully');
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to clear authority');
            }
          },
        },
      ]
    );
  };

  const handleCreateAuthority = () => {
    navigation.navigate('AuthorityForm');
  };

  if (!activeAuthority) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="clipboard-off-outline" size={80} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Active Authority</Text>
          <Text style={styles.emptyText}>
            You don't have an active authority. Create one to start tracking your work.
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateAuthority}
          >
            <MaterialCommunityIcons name="plus" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.createButtonText}>Create Authority</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="clipboard-check" size={40} color={theme.colors.accent} />
        <Text style={styles.headerTitle}>Active Authority</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="account" size={24} color={theme.colors.accent} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Employee Name</Text>
            <Text style={styles.infoValue}>{activeAuthority.employeeName}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="phone" size={24} color={theme.colors.accent} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Contact</Text>
            <Text style={styles.infoValue}>{activeAuthority.contactNumber}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map" size={24} color={theme.colors.accent} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Subdivision</Text>
            <Text style={styles.infoValue}>
              {activeAuthority.subdivisionName || `ID: ${activeAuthority.subdivisionId}`}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map-marker-distance" size={24} color={theme.colors.accent} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Track Range</Text>
            <Text style={styles.infoValue}>
              MP {activeAuthority.beginMilepost} to MP {activeAuthority.endMilepost}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="train-car-autorack" size={24} color={theme.colors.accent} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Track</Text>
            <Text style={styles.infoValue}>
              {activeAuthority.trackType} {activeAuthority.trackNumber}
            </Text>
          </View>
        </View>

        {activeAuthority.notes && (
          <>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="note-text" size={24} color={theme.colors.accent} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Notes</Text>
                <Text style={styles.infoValue}>{activeAuthority.notes}</Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.accent} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>
              {new Date(activeAuthority.createdAt).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.clearButton}
        onPress={handleClearAuthority}
      >
        <MaterialCommunityIcons name="close-circle" size={24} color={theme.colors.background} />
        <Text style={styles.clearButtonText}>Clear Authority</Text>
      </TouchableOpacity>

      <View style={styles.warningContainer}>
        <MaterialCommunityIcons name="alert" size={20} color={theme.colors.warning} />
        <Text style={styles.warningText}>
          Only clear authority when work is complete and all personnel are clear of the track.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.medium,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  infoContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xl,
    ...theme.shadows.medium,
  },
  clearButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.background,
    marginLeft: theme.spacing.sm,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.sm,
  },
});

export default AuthorityScreen;
