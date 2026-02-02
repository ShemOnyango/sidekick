import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { deletePin } from '../../store/slices/pinSlice';
import theme from '../../constants/theme';

const PinsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { pins } = useSelector((state) => state.pins);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Scrap-Rail', 'Scrap-Ties', 'Monitor Location', 'Defect', 'Obstruction'];

  const filteredPins = selectedCategory === 'All' 
    ? pins 
    : pins.filter(pin => pin.category === selectedCategory);

  const handleDeletePin = (pinId) => {
    Alert.alert(
      'Delete Pin',
      'Are you sure you want to delete this pin?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(deletePin(pinId));
          },
        },
      ]
    );
  };

  const handleDropNewPin = () => {
    navigation.navigate('PinForm');
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Scrap-Rail':
        return 'train-car-flatbed';
      case 'Scrap-Ties':
        return 'pine-tree';
      case 'Monitor Location':
        return 'eye';
      case 'Defect':
        return 'alert-circle';
      case 'Obstruction':
        return 'alert-octagon';
      default:
        return 'map-marker';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Scrap-Rail':
        return '#2196F3';
      case 'Scrap-Ties':
        return '#4CAF50';
      case 'Monitor Location':
        return '#FF9800';
      case 'Defect':
        return '#F44336';
      case 'Obstruction':
        return '#9C27B0';
      default:
        return theme.colors.accent;
    }
  };

  const renderPin = ({ item }) => (
    <View style={styles.pinCard}>
      <View style={styles.pinHeader}>
        <View style={styles.categoryBadge}>
          <Icon 
            name={getCategoryIcon(item.category)} 
            size={20} 
            color={getCategoryColor(item.category)} 
          />
          <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
            {item.category}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleDeletePin(item.id)}>
          <MaterialCommunityIcons name="delete" size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      {item.photoUri && (
        <Image source={{ uri: item.photoUri }} style={styles.pinImage} />
      )}

      {item.notes && (
        <Text style={styles.pinNotes}>{item.notes}</Text>
      )}

      <View style={styles.pinDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>
            {item.latitude?.toFixed(6)}, {item.longitude?.toFixed(6)}
          </Text>
        </View>

        {item.trackType && item.trackNumber && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="train-car-autorack" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>
              {item.trackType} {item.trackNumber}
            </Text>
          </View>
        )}

        {item.milepost && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="map-marker-distance" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>
              MP {item.milepost}
            </Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>

        {item.syncPending && (
          <View style={styles.syncPendingBadge}>
            <MaterialCommunityIcons name="sync" size={14} color={theme.colors.warning} />
            <Text style={styles.syncPendingText}>Pending Sync</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="map-marker-off" size={80} color={theme.colors.textSecondary} />
      <Text style={styles.emptyTitle}>No Pins Dropped</Text>
      <Text style={styles.emptyText}>
        {selectedCategory === 'All' 
          ? 'Drop your first pin to track locations and issues.'
          : `No pins in the ${selectedCategory} category.`}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pin Drops ({filteredPins.length})</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleDropNewPin}>
          <MaterialCommunityIcons name="plus" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedCategory === item && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === item && styles.filterChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredPins}
        keyExtractor={(item) => item.id}
        renderItem={renderPin}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  addButton: {
    backgroundColor: theme.colors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  filterContainer: {
    backgroundColor: theme.colors.cardBackground,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  filterChipText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: theme.spacing.lg,
  },
  pinCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },
  pinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryText: {
    marginLeft: theme.spacing.xs,
    fontSize: 14,
    fontWeight: 'bold',
  },
  pinImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.border,
  },
  pinNotes: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    lineHeight: 22,
  },
  pinDetails: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  syncPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  syncPendingText: {
    fontSize: 12,
    color: theme.colors.warning,
    marginLeft: 4,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: theme.spacing.xl,
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
  },
});

export default PinsScreen;
