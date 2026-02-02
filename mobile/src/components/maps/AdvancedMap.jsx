// mobile/src/components/maps/AdvancedMap.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
// import MapboxGL from '@rnmapbox/maps'; // DISABLED
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import Slider from '@react-native-community/slider';
import mapboxService from '../../services/maps/MapboxService';
import { CONFIG } from '../../constants/config';

// TEMPORARY: Commenting out to test if this causes the error
console.log('⚠️ MapboxGL.setAccessToken in AdvancedMap DISABLED for debugging');
// MapboxGL.setAccessToken(CONFIG.MAP.MAPBOX_TOKEN);

const { width, height } = Dimensions.get('window');

const AdvancedMap = ({
  region,
  onRegionChange,
  showUserLocation = true,
  showControls = true,
  onDownloadPress,
  onLayerPress,
  customLayers = [],
}) => {
  const mapRef = useRef(null);
  const cameraRef = useRef(null);
  const dispatch = useDispatch();
  
  const { user } = useSelector((state) => state.auth);
  const { currentAuthority } = useSelector((state) => state.authority);
  const { currentPosition } = useSelector((state) => state.gps);
  
  const [zoomLevel, setZoomLevel] = useState(12);
  const [bearing, setBearing] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/satellite-streets-v11');
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showDownloadPanel, setShowDownloadPanel] = useState(false);
  const [activeLayers, setActiveLayers] = useState({
    tracks: true,
    mileposts: true,
    assets: true,
    boundaries: true,
    workers: true,
  });
  const [offlinePacks, setOfflinePacks] = useState([]);

  useEffect(() => {
    loadOfflinePacks();
  }, []);

  const loadOfflinePacks = async () => {
    try {
      const packs = await mapboxService.getOfflinePacks();
      setOfflinePacks(packs);
    } catch (error) {
      console.error('Failed to load offline packs:', error);
    }
  };

  const handleDownloadArea = async () => {
    try {
      const currentRegion = await getCurrentMapBounds();
      
      Alert.prompt(
        'Download Offline Map',
        'Enter a name for this offline map:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            onPress: async (name) => {
              if (!name) return;
              
              try {
                await mapboxService.downloadOfflineMap(currentRegion, {
                  name: name.trim(),
                  minZoom: 10,
                  maxZoom: 16,
                });
                loadOfflinePacks();
                Alert.alert('Success', 'Offline map download started');
              } catch (error) {
                Alert.alert('Error', 'Failed to start download: ' + error.message);
              }
            },
          },
        ],
        'plain-text',
        `map_${Date.now()}`
      );
    } catch (error) {
      console.error('Failed to download area:', error);
      Alert.alert('Error', 'Failed to download map area');
    }
  };

  const getCurrentMapBounds = async () => {
    try {
      const bounds = await mapRef.current?.getVisibleBounds();
      if (bounds) {
        const [[swLng, swLat], [neLng, neLat]] = bounds;
        return {
          latitude: (swLat + neLat) / 2,
          longitude: (swLng + neLng) / 2,
          latitudeDelta: Math.abs(neLat - swLat),
          longitudeDelta: Math.abs(neLng - swLng),
        };
      }
    } catch (error) {
      console.error('Failed to get map bounds:', error);
    }
    return region;
  };

  const toggleLayer = (layerName) => {
    setActiveLayers(prev => ({
      ...prev,
      [layerName]: !prev[layerName],
    }));
  };

  const deleteOfflinePack = async (packName) => {
    try {
      await mapboxService.deleteOfflinePack(packName);
      loadOfflinePacks();
      Alert.alert('Success', 'Offline map deleted');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete offline map');
    }
  };

  const renderLayerPanel = () => (
    <Modal
      visible={showLayerPanel}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowLayerPanel(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Map Layers</Text>
            <TouchableOpacity onPress={() => setShowLayerPanel(false)}>
              <Icon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.layerList}>
            {Object.entries(activeLayers).map(([layer, isActive]) => (
              <TouchableOpacity
                key={layer}
                style={styles.layerItem}
                onPress={() => toggleLayer(layer)}
              >
                <Icon
                  name={isActive ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={24}
                  color={isActive ? '#FFD100' : '#666'}
                />
                <Text style={styles.layerText}>
                  {layer.charAt(0).toUpperCase() + layer.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderDownloadPanel = () => (
    <Modal
      visible={showDownloadPanel}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDownloadPanel(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Offline Maps</Text>
            <TouchableOpacity onPress={() => setShowDownloadPanel(false)}>
              <Icon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.offlineList}>
            {offlinePacks.length === 0 ? (
              <Text style={styles.noDataText}>No offline maps downloaded</Text>
            ) : (
              offlinePacks.map(pack => (
                <View key={pack.name} style={styles.offlineItem}>
                  <View style={styles.offlineInfo}>
                    <Text style={styles.offlineName}>{pack.name}</Text>
                    <Text style={styles.offlineSize}>
                      Size: {Math.round(pack.metadata?.sizeEstimate / 1024 / 1024)} MB
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteOfflinePack(pack.name)}
                    style={styles.deleteButton}
                  >
                    <Icon name="delete" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownloadArea}
          >
            <Icon name="download" size={20} color="#000" />
            <Text style={styles.downloadButtonText}>Download Current Area</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // TEMPORARILY DISABLED - Mapbox removed
  return (
    <View style={styles.container}>
      <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
        <Text style={{ fontSize: 18, color: '#666', textAlign: 'center', padding: 20 }}>
          Map feature temporarily disabled{'\n'}
          (Mapbox dependencies removed for testing)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    flex: 1,
  },
  userMarker: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    padding: 5,
    borderWidth: 2,
    borderColor: '#FFD100',
  },
  controlsContainer: {
    position: 'absolute',
    right: 20,
    top: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  zoomControls: {
    marginBottom: 10,
  },
  controlButton: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  layerList: {
    maxHeight: 300,
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  layerText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  offlineList: {
    maxHeight: 300,
  },
  offlineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  offlineInfo: {
    flex: 1,
  },
  offlineName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  offlineSize: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    paddingVertical: 20,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD100',
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
  },
  downloadButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default AdvancedMap;