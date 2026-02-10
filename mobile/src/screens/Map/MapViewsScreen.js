import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { MAP_STYLES, getMapStyleById } from '../../constants/mapStyles';
import { setMapStyleId } from '../../store/slices/mapSlice';

const MapViewsScreen = () => {
  const dispatch = useDispatch();
  const mapStyleId = useSelector((state) => state.map.mapStyleId);
  const selectedStyle = getMapStyleById(mapStyleId);

  const [region, setRegion] = useState({
    latitude: 39.8283,
    longitude: -98.5795,
    latitudeDelta: 50,
    longitudeDelta: 50,
  });

  const previewRegion = useMemo(
    () => ({
      latitude: 34.0522,
      longitude: -118.2437,
      latitudeDelta: 0.5,
      longitudeDelta: 0.5,
    }),
    []
  );

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        onRegionChangeComplete={setRegion}
        mapType={selectedStyle.mapType}
        customMapStyle={selectedStyle.customStyle || undefined}
        showsUserLocation
        showsMyLocationButton={false}
      />

      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>Map Views</Text>
        <FlatList
          data={MAP_STYLES}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                mapStyleId === item.id && styles.cardActive,
              ]}
              onPress={() => dispatch(setMapStyleId(item.id))}
              activeOpacity={0.85}
            >
              <View style={styles.thumbnail}>
                <MapView
                  pointerEvents="none"
                  style={styles.thumbnailMap}
                  provider={PROVIDER_GOOGLE}
                  region={previewRegion}
                  mapType={item.mapType}
                  customMapStyle={item.customStyle || undefined}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  toolbarEnabled={false}
                />
              </View>
              <Text style={styles.cardLabel} numberOfLines={2}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlayTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 16,
    marginBottom: 8,
  },
  grid: {
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  card: {
    width: '31.5%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardActive: {
    borderColor: '#FF8A00',
    backgroundColor: 'rgba(255,138,0,0.15)',
  },
  thumbnail: {
    height: 70,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 6,
    overflow: 'hidden',
  },
  thumbnailMap: {
    width: '100%',
    height: '100%',
  },
  cardLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
});

export default MapViewsScreen;
