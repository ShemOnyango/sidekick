import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getActiveAuthority } from '../../store/slices/authoritySlice';
import { saveGPSLog } from '../../store/slices/gpsSlice';
import socketService from '../../services/socket/SocketService';
import apiService from '../../services/api/ApiService';
import gpsTrackingService from '../../services/gps/GPSTrackingService';
import MilepostDisplay from '../../components/map/MilepostDisplay';
import BoundaryIndicator from '../../components/map/BoundaryIndicator';
import OfflineIndicator from '../../components/common/OfflineIndicator';
import GPSAccuracyIndicator from '../../components/map/GPSAccuracyIndicator';
import {
  getCurrentTrack,
  checkAuthorityBoundaries,
  calculateBearing,
  interpolateMilepost
} from '../../utils/trackGeometry';
import { CONFIG } from '../../constants/config';
import { getMapStyleById } from '../../constants/mapStyles';
import permissionManager from '../../utils/permissionManager';
import logger from '../../utils/logger';
import { setLayerVisibility } from '../../store/slices/mapSlice';
import { useIsFocused } from '@react-navigation/native';
import { 
  COLORS, 
  SPACING, 
  FONT_SIZES, 
  FONT_WEIGHTS, 
  BORDER_RADIUS,
  ALERT_DISTANCES 
} from '../../constants/theme';

const { width, height } = Dimensions.get('window');

// Dark map style to match screenshots
const customMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#746855" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#38414e" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#212a37" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#17263c" }]
  }
];

const MapScreen = () => {
  const dispatch = useDispatch();
  const mapRef = useRef(null);
  const layerFetchTimeout = useRef(null);
  const isMounted = useRef(true);
  const isFocused = useIsFocused();
  
  const { user } = useSelector((state) => state.auth);
  const { currentAuthority } = useSelector((state) => state.authority);
  const mapStyleId = useSelector((state) => state.map.mapStyleId);
  const storedLayerVisibility = useSelector((state) => state.map.layerVisibility || {});
  const { currentPosition, isTracking } = useSelector((state) => state.gps);
  
  const [region, setRegion] = useState({
    latitude: 39.8283,
    longitude: -98.5795,
    latitudeDelta: 50,
    longitudeDelta: 50,
  });
  
  const [followMode, setFollowMode] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [trackGeometry, setTrackGeometry] = useState([]);
  const [otherWorkers, setOtherWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const [compassEnabled, setCompassEnabled] = useState(false);
  const [nearestRailroadAddress, setNearestRailroadAddress] = useState('None found');
  const [loadingRailroadAddress, setLoadingRailroadAddress] = useState(false);
  const [isGpsCardMinimized, setIsGpsCardMinimized] = useState(false);
  const [layers, setLayers] = useState([]);
  const [layersLoading, setLayersLoading] = useState(false);
  const [layerData, setLayerData] = useState({});
  const [layerVisibility, setLocalLayerVisibility] = useState({});
  
  // New Follow-Me mode state
  const [currentMilepost, setCurrentMilepost] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [distanceToBegin, setDistanceToBegin] = useState(null);
  const [distanceToEnd, setDistanceToEnd] = useState(null);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(null);
  const [mileposts, setMileposts] = useState([]);
  const [subdivision, setSubdivision] = useState(null);
  const [withinBoundaries, setWithinBoundaries] = useState(true);
  const previousPosition = useRef(null);
  const hasLoadedAuthority = useRef(false);

  // Load active authority on mount
  useEffect(() => {
    // Only load authority if user is logged in
    if (!hasLoadedAuthority.current && user?.token) {
      hasLoadedAuthority.current = true;
      loadActiveAuthority();
    }
    
    // Reset flag if user logs out
    if (!user?.token) {
      hasLoadedAuthority.current = false;
    }
    
    // Setup socket listeners
    socketService.on('user_location_update', handleUserLocationUpdate);
    socketService.on('alert', handleAlert);
    
    return () => {
      socketService.off('user_location_update', handleUserLocationUpdate);
      socketService.off('alert', handleAlert);
    };
  }, []);

  // Sync GPS active state with tracking status
  useEffect(() => {
    setGpsActive(isTracking);
    
    // Verify GPS is actually enabled when tracking starts
    if (isTracking) {
      verifyGPSStatus();
    }
  }, [isTracking]);

  // Verify GPS status
  const verifyGPSStatus = async () => {
    try {
      const { granted } = await Location.getForegroundPermissionsAsync();
      
      if (!granted) {
        Alert.alert(
          'GPS Permission Required',
          'Sidekick needs location permission to track your position on the tracks.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Grant Permission',
              onPress: async () => {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission Denied', 'GPS tracking requires location permission.');
                }
              },
            },
          ]
        );
      } else {
        logger.info('GPS', 'GPS permissions verified - tracking enabled');
      }
    } catch (error) {
      logger.error('GPS', 'Failed to verify GPS status', error);
    }
  };

  // Load milepost data when authority changes
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (currentAuthority && currentAuthority.Subdivision_ID) {
      loadMilepostData(currentAuthority.Subdivision_ID);
      setSubdivision(currentAuthority.Subdivision_Name);
    }
  }, [currentAuthority]);

  // Load layer list when screen mounts or authority changes
  useEffect(() => {
    if (isFocused) {
      loadLayers();
    }
  }, [currentAuthority?.Subdivision_ID, isFocused]);

  // Sync local visibility when store visibility updates
  useEffect(() => {
    if (!storedLayerVisibility || Object.keys(storedLayerVisibility).length === 0) return;
    setLocalLayerVisibility((prev) => ({ ...prev, ...storedLayerVisibility }));
  }, [storedLayerVisibility]);

  // Load visible layers when region changes (debounced)
  useEffect(() => {
    if (!layers.length) return;
    if (layerFetchTimeout.current) {
      clearTimeout(layerFetchTimeout.current);
    }
    layerFetchTimeout.current = setTimeout(() => {
      if (isFocused) {
        loadVisibleLayerData();
      }
    }, 500);
    return () => {
      if (layerFetchTimeout.current) {
        clearTimeout(layerFetchTimeout.current);
      }
    };
  }, [region, layers, layerVisibility, storedLayerVisibility, isFocused]);

  // Update milepost and boundaries when position changes
  useEffect(() => {
    if (currentPosition && mileposts.length > 0) {
      updateTrackingInfo();
    }
    
    // Fetch nearest railroad address from API
    if (currentPosition && currentAuthority) {
      fetchNearestRailroadAddress();
    }
  }, [currentPosition, mileposts]);

  // Fetch nearest railroad address from backend API
  const fetchNearestRailroadAddress = async () => {
    try {
      // Check if we have required data
      if (!currentAuthority || !currentAuthority.Subdivision_ID) {
        setNearestRailroadAddress('No active authority');
        return;
      }

      setLoadingRailroadAddress(true);
      
      const response = await apiService.api.post('/tracks/interpolate-milepost', {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        subdivisionId: currentAuthority.Subdivision_ID,
      });
      
      if (response.data) {
        const { milepost, distance } = response.data;
        
        // Only show railroad address if within reasonable distance (e.g., 0.5 miles)
        if (distance && distance <= 0.5) {
          // Use track info from authority, milepost from API
          const trackType = currentAuthority.Track_Type || 'Track';
          const trackNumber = currentAuthority.Track_Number || '';
          const address = `${trackType} ${trackNumber}, MP ${milepost.toFixed(2)}`.trim();
          setNearestRailroadAddress(address);
          logger.info('GPS', 'Nearest railroad address found', { address, distance });
        } else {
          setNearestRailroadAddress('None found');
          logger.info('GPS', 'No railroad address nearby', { distance });
        }
      }
      
      setLoadingRailroadAddress(false);
    } catch (error) {
      logger.error('GPS', 'Failed to fetch nearest railroad address', error);
      setLoadingRailroadAddress(false);
      setNearestRailroadAddress('None found');
      
      // Fall back to local calculation if API fails
      if (currentPosition && mileposts.length > 0) {
        const trackInfo = getCurrentTrack(currentPosition.latitude, currentPosition.longitude, mileposts);
        if (trackInfo) {
          const trackType = currentAuthority.Track_Type || trackInfo.trackType || 'Track';
          const trackNumber = currentAuthority.Track_Number || trackInfo.trackNumber || '';
          const address = `${trackType} ${trackNumber}, MP ${trackInfo.milepost.toFixed(2)}`.trim();
          setNearestRailroadAddress(address);
        }
      }
    }
  };

  // Update map when position changes in follow mode
  useEffect(() => {
    if (followMode && currentPosition && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      // Send location update via socket
      if (user && currentAuthority) {
        socketService.emitLocationUpdate({
          userId: user.User_ID,
          agencyId: user.Agency_ID,
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
          authorityId: currentAuthority.authority_id || currentAuthority.id,
        });
      }
    }
  }, [currentPosition, followMode]);

  const loadActiveAuthority = async () => {
    try {
      setIsLoading(true);
      const authority = await dispatch(getActiveAuthority()).unwrap();
      
      // Start GPS tracking if authority exists and tracking not already started
      if (authority && !isTracking) {
        try {
          await gpsTrackingService.init();
          await gpsTrackingService.startTracking(authority);
          console.log('GPS tracking started for existing authority:', authority.Authority_ID);
        } catch (error) {
          console.error('Failed to start GPS tracking:', error);
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load authority:', error);
      setIsLoading(false);
    }
  };

  const loadMilepostData = async (subdivisionId) => {
    try {
      const response = await apiService.api.get(
        `/offline/subdivision/${subdivisionId}`
      );
      if (!isMounted.current) return;
      if (response.data?.data?.mileposts) {
        setMileposts(response.data.data.mileposts);
      } else if (response.data?.mileposts) {
        setMileposts(response.data.mileposts);
      }
    } catch (error) {
      console.error('Failed to load milepost data:', error);
    }
  };

  const loadLayers = async () => {
    if (layersLoading) return;
    setLayersLoading(true);
    try {
      const data = await apiService.getMapLayers({
        subdivisionId: currentAuthority?.Subdivision_ID || undefined,
      });
      const list = data?.layers || [];
      if (!isMounted.current) return;
      setLayers(list);

      const hasStored = Object.keys(storedLayerVisibility).length > 0;
      const visibility = {};
      list.forEach((layer) => {
        const defaultValue = hasStored ? Boolean(storedLayerVisibility[layer.id]) : layer.count > 0;
        visibility[layer.id] = defaultValue;
        if (!hasStored) {
          dispatch(setLayerVisibility({ layerId: layer.id, value: defaultValue }));
        }
      });
      setLocalLayerVisibility(visibility);
    } catch (error) {
      console.error('Failed to load map layers:', error);
    } finally {
      if (isMounted.current) {
        setLayersLoading(false);
      }
    }
  };

  const getLayerStyle = (layer) => {
    if (layer.id === 'mileposts') {
      return { color: '#FFD100', icon: 'numeric-9-plus-box' };
    }
    if (layer.id === 'tracks') {
      return { color: '#00C2FF', icon: 'train-variant' };
    }
    if (layer.id === 'signals') return { color: '#4CD964', icon: 'signal-variant' };
    if (layer.id === 'road-crossings') return { color: '#FF9500', icon: 'road-variant' };
    if (layer.id === 'rail-crossings') return { color: '#FF9500', icon: 'transit-connection-variant' };
    if (layer.id === 'bridges') return { color: '#5AC8FA', icon: 'bridge' };
    if (layer.id === 'tunnels') return { color: '#AF52DE', icon: 'tunnel' };
    if (layer.id === 'stations') return { color: '#34C759', icon: 'train' };
    if (layer.id === 'turnouts') return { color: '#FFD60A', icon: 'swap-horizontal' };
    if (layer.id === 'detectors') return { color: '#FF453A', icon: 'radar' };
    if (layer.id === 'derails') return { color: '#FF453A', icon: 'alert' };
    if (layer.id === 'snowsheds') return { color: '#64D2FF', icon: 'weather-snowy' };
    if (layer.id === 'arches') return { color: '#FFD60A', icon: 'arch' };
    if (layer.id === 'culverts') return { color: '#30B0C7', icon: 'pipe' };
    if (layer.id === 'depots') return { color: '#34C759', icon: 'warehouse' };
    if (layer.id === 'control-points') return { color: '#FF9F0A', icon: 'crosshairs-gps' };
    return { color: '#FF7A00', icon: 'map-marker-radius' };
  };

  const loadLayerData = async (layerId, bounds) => {
    try {
      const data = await apiService.getMapLayerData(layerId, {
        subdivisionId: currentAuthority?.Subdivision_ID || undefined,
        limit: 2000,
        ...bounds,
      });
      if (!isMounted.current) return;
      setLayerData((prev) => ({
        ...prev,
        [layerId]: data?.features || [],
      }));
    } catch (error) {
      console.error(`Failed to load layer data for ${layerId}:`, error);
    }
  };

  const loadVisibleLayerData = async () => {
    const visibility = Object.keys(storedLayerVisibility).length
      ? storedLayerVisibility
      : layerVisibility;
    const visibleLayerIds = layers
      .filter((layer) => visibility[layer.id])
      .map((layer) => layer.id);

    if (visibleLayerIds.length === 0) return;

    const latDelta = region.latitudeDelta || 0.05;
    const lngDelta = region.longitudeDelta || 0.05;
    const bounds = {
      minLat: region.latitude - latDelta * 0.6,
      maxLat: region.latitude + latDelta * 0.6,
      minLng: region.longitude - lngDelta * 0.6,
      maxLng: region.longitude + lngDelta * 0.6,
    };

    await Promise.all(
      visibleLayerIds.map((layerId) => loadLayerData(layerId, bounds))
    );
  };

  const updateTrackingInfo = () => {
    const { latitude, longitude } = currentPosition;
    
    // Get current track and milepost
    const trackInfo = getCurrentTrack(latitude, longitude, mileposts);
    
    if (trackInfo) {
      setCurrentMilepost(trackInfo.milepost);
      
      // Use track info from authority if available, otherwise from trackGeometry calculation
      const trackType = currentAuthority?.Track_Type || trackInfo.trackType || 'Track';
      const trackNumber = currentAuthority?.Track_Number || trackInfo.trackNumber || '';
      
      setCurrentTrack({
        type: trackType,
        number: trackNumber,
      });
      
      // Update nearest railroad address
      const address = `${trackType} ${trackNumber}, MP ${trackInfo.milepost.toFixed(2)}`.trim();
      setNearestRailroadAddress(address);
      
      // Calculate heading if we have previous position
      if (previousPosition.current) {
        const bearing = calculateBearing(
          previousPosition.current.latitude,
          previousPosition.current.longitude,
          latitude,
          longitude
        );
        setHeading(bearing);
        
        // Calculate speed (rough estimate)
        const timeDiff = (new Date() - new Date(previousPosition.current.timestamp)) / 1000; // seconds
        if (timeDiff > 0 && currentPosition.speed !== undefined) {
          setSpeed(currentPosition.speed * 2.237); // Convert m/s to mph
        }
      }
      
      // Check authority boundaries
      if (currentAuthority) {
        const boundaryCheck = checkAuthorityBoundaries(
          { latitude, longitude },
          currentAuthority,
          mileposts
        );
        
        setWithinBoundaries(boundaryCheck.withinBoundaries);
        setDistanceToBegin(boundaryCheck.distanceToBegin);
        setDistanceToEnd(boundaryCheck.distanceToEnd);
        
        // Alert if outside boundaries
        if (!boundaryCheck.withinBoundaries) {
          console.warn('Outside authority boundaries:', boundaryCheck.reason);
        }
      }
    } else {
      setNearestRailroadAddress('None found');
    }
    
    previousPosition.current = {
      latitude,
      longitude,
      timestamp: new Date(),
    };
  };

  const handleUserLocationUpdate = (locationData) => {
    // Update other workers positions
    setOtherWorkers(prev => {
      const existingIndex = prev.findIndex(w => w.userId === locationData.userId);
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...locationData,
          timestamp: new Date().toISOString(),
        };
        return updated;
      } else {
        return [...prev, {
          ...locationData,
          timestamp: new Date().toISOString(),
        }];
      }
    });
  };

  const handleAlert = (alertData) => {
    Alert.alert(
      alertData.level === 'critical' ? '🚨 CRITICAL ALERT' : '⚠️ ALERT',
      alertData.message,
      [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'View Details', onPress: () => handleViewAlert(alertData) },
      ]
    );
  };

  const handleViewAlert = (alertData) => {
    // Navigate to alert details or show in modal
    console.log('View alert:', alertData);
  };

  const toggleFollowMode = () => {
    setFollowMode(!followMode);
    
    if (!followMode && currentPosition) {
      // Center on current position
      mapRef.current?.animateToRegion({
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const centerOnCurrentLocation = async () => {
    try {
      const granted = await permissionManager.requestLocationPermission(false);
      
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Location permission is required to center on your position.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  const centerOnAuthority = () => {
    if (currentAuthority && currentAuthority.Begin_MP && currentAuthority.End_MP) {
      // Calculate center of authority
      const centerLat = (currentAuthority.Begin_Lat + currentAuthority.End_Lat) / 2;
      const centerLng = (currentAuthority.Begin_Lng + currentAuthority.End_Lng) / 2;
      
      mapRef.current?.animateToRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    }
  };

  const renderAuthorityBoundaries = () => {
    if (!currentAuthority) return null;

    // This would use actual track geometry data
    // For now, create a simple line
    const coordinates = [
      { latitude: currentAuthority.Begin_Lat || region.latitude - 0.01, 
        longitude: currentAuthority.Begin_Lng || region.longitude - 0.01 },
      { latitude: currentAuthority.End_Lat || region.latitude + 0.01, 
        longitude: currentAuthority.End_Lng || region.longitude + 0.01 },
    ];

    return (
      <Polyline
        coordinates={coordinates}
        strokeColor="#FFD100"
        strokeWidth={4}
        lineDashPattern={[10, 10]}
      />
    );
  };

  const renderOtherWorkers = () => {
    return otherWorkers.map((worker, index) => (
      <Marker
        key={`worker-${worker.userId}-${index}`}
        coordinate={{
          latitude: worker.latitude,
          longitude: worker.longitude,
        }}
        title={`Worker: ${worker.employeeName || 'Unknown'}`}
        description={`Last updated: ${new Date(worker.timestamp).toLocaleTimeString()}`}
      >
        <View style={styles.workerMarker}>
          <MaterialCommunityIcons name="account" size={24} color="#FF0000" />
        </View>
      </Marker>
    ));
  };

  const layerMarkers = useMemo(() => {
    const markers = [];
    const visibility = Object.keys(storedLayerVisibility).length
      ? storedLayerVisibility
      : layerVisibility;

    layers.forEach((layer) => {
      if (!visibility[layer.id]) return;
      const features = layerData[layer.id] || [];
      const style = getLayerStyle(layer);
      features.forEach((feature, index) => {
        if (feature.Latitude == null || feature.Longitude == null) return;
        markers.push({
          key: `${layer.id}-${feature.Track_ID || feature.Milepost_ID || index}`,
          latitude: Number(feature.Latitude),
          longitude: Number(feature.Longitude),
          title: feature.Asset_Name || layer.label,
          description: feature.MP ? `MP ${feature.MP}` : feature.Asset_Type || layer.label,
          color: style.color,
          icon: style.icon,
        });
      });
    });
    return markers;
  }, [layers, layerData, layerVisibility, storedLayerVisibility]);

  const renderControls = () => {
    if (!showControls) return null;

    return (
      <View style={styles.controlsCard}>
        {/* GPS Active Toggle with Minimize Button */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>GPS Active</Text>
          <View style={styles.controlRowRight}>
            <Switch
              value={gpsActive}
              onValueChange={async (value) => {
              if (value) {
                // Enable GPS tracking
                try {
                  // First check if we have location permissions
                  const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
                  
                  if (foregroundStatus !== 'granted') {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert(
                        'Permission Required',
                        'Sidekick needs location permission to track your position on the tracks. Please enable location access in your device settings.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Open Settings', onPress: () => Linking.openSettings() },
                        ]
                      );
                      return;
                    }
                  }
                  
                  // Check if we have an active authority
                  if (!currentAuthority) {
                    Alert.alert(
                      'No Active Authority',
                      'You need to enter an authority before enabling GPS tracking.',
                      [{ text: 'OK' }]
                    );
                    return;
                  }
                  
                  // Initialize and start GPS tracking
                  await gpsTrackingService.init();
                  await gpsTrackingService.startTracking(currentAuthority);
                  setGpsActive(true);
                  logger.info('GPS', 'GPS tracking enabled successfully');
                  
                  Alert.alert('GPS Enabled', 'Location tracking is now active.');
                } catch (error) {
                  logger.error('GPS', 'Failed to enable GPS tracking', error);
                  Alert.alert(
                    'GPS Error',
                    error.message || 'Failed to enable GPS tracking. Please try again.',
                    [{ text: 'OK' }]
                  );
                  setGpsActive(false);
                }
              } else {
                // Disable GPS tracking
                try {
                  await gpsTrackingService.stopTracking();
                  setGpsActive(false);
                  setNearestRailroadAddress('None found');
                  logger.info('GPS', 'GPS tracking disabled');
                  
                  Alert.alert('GPS Disabled', 'Location tracking has been stopped.');
                } catch (error) {
                  logger.error('GPS', 'Failed to stop GPS tracking', error);
                }
              }
            }}
            trackColor={{ false: '#CCCCCC', true: '#34C759' }}
            thumbColor={gpsActive ? '#FFFFFF' : '#F4F3F4'}
            ios_backgroundColor="#CCCCCC"
          />
          <TouchableOpacity 
            style={styles.minimizeButton}
            onPress={() => setIsGpsCardMinimized(!isGpsCardMinimized)}
          >
            <MaterialCommunityIcons 
              name={isGpsCardMinimized ? 'chevron-down' : 'chevron-up'} 
              size={20} 
              color="#666666" 
            />
          </TouchableOpacity>
          </View>
        </View>

        {/* Show full content only when not minimized */}
        {!isGpsCardMinimized && (
          <>
        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity 
            style={[styles.actionButton, compassEnabled && styles.actionButtonActive]}
            onPress={() => {
              setCompassEnabled(!compassEnabled);
            }}
          >
            <MaterialCommunityIcons 
              name="compass-outline" 
              size={20} 
              color={compassEnabled ? '#FFD100' : '#666666'} 
            />
            <Text style={[styles.actionButtonText, compassEnabled && styles.actionButtonTextActive]}>
              Compass
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, followMode && styles.actionButtonActive]}
            onPress={toggleFollowMode}
          >
            <MaterialCommunityIcons 
              name="crosshairs-gps" 
              size={20} 
              color={followMode ? '#FFD100' : '#666666'} 
            />
            <Text style={[styles.actionButtonText, followMode && styles.actionButtonTextActive]}>
              Follow Me
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={centerOnCurrentLocation}
          >
            <MaterialCommunityIcons 
              name="target" 
              size={20} 
              color="#666666" 
            />
            <Text style={styles.actionButtonText}>Re-center</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Coordinates Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <MaterialCommunityIcons name="map-marker" size={16} color="#666666" />
            <Text style={styles.infoLabel}>Coordinates</Text>
          </View>
          {currentPosition ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoValue}>
                {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}
              </Text>
              <TouchableOpacity style={styles.iconButton}>
                <MaterialCommunityIcons name="content-copy" size={18} color="#FFD100" />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.infoPlaceholder}>Waiting for location...</Text>
          )}
        </View>

        {/* Nearest Railroad Address Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <MaterialCommunityIcons name="train" size={16} color="#666666" />
            <Text style={styles.infoLabel}>Nearest Railroad Address</Text>
          </View>
          <View style={styles.infoRow}>
            {loadingRailroadAddress ? (
              <ActivityIndicator size="small" color="#FFD100" />
            ) : (
              <Text style={styles.infoValue}>{nearestRailroadAddress}</Text>
            )}
            {nearestRailroadAddress !== 'None found' && !loadingRailroadAddress && (
              <TouchableOpacity style={styles.iconButton}>
                <MaterialCommunityIcons name="content-copy" size={18} color="#FFD100" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        </>
        )}
      </View>
    );
  };

  const renderAuthorityInfo = () => {
    if (!currentAuthority) return null;

    return (
      <View style={styles.authorityInfo}>
        <View style={styles.authorityHeader}>
          <MaterialCommunityIcons name="clipboard-check" size={20} color="#FFD100" />
          <Text style={styles.authorityTitle}>Active Authority</Text>
        </View>
        
        <View style={styles.authorityDetails}>
          <Text style={styles.authorityText}>
            {currentAuthority.Subdivision_Code || currentAuthority.Subdivision_Name}: {currentAuthority.Track_Type} {currentAuthority.Track_Number}
          </Text>
          <Text style={styles.authorityText}>
            MP {currentAuthority.Begin_MP} to {currentAuthority.End_MP}
          </Text>
          <Text style={styles.authorityText}>
            Started: {currentAuthority.Start_Time ? new Date(currentAuthority.Start_Time).toLocaleTimeString() : 'Invalid Date'}
          </Text>
        </View>
        
        <View style={styles.positionInfo}>
          {currentPosition && (
            <>
              <Text style={styles.positionText}>
                Position: {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}
              </Text>
              <Text style={styles.positionText}>
                Accuracy: {currentPosition.accuracy?.toFixed(1) || 'Unknown'} meters
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD100" />
        <Text style={styles.loadingText}>Loading map data...</Text>
      </View>
    );
  }

  const selectedStyle = getMapStyleById(mapStyleId);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={selectedStyle.mapType}
        customMapStyle={selectedStyle.customStyle || customMapStyle}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        loadingEnabled={true}
        loadingIndicatorColor="#FFD100"
        loadingBackgroundColor="#000000"
      >
        {/* Layer markers */}
        {layerMarkers.map((marker) => (
          <Marker
            key={marker.key}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            title={marker.title}
            description={marker.description}
            pinColor={marker.color}
            tracksViewChanges={false}
          >
            <View style={[styles.layerMarker, { borderColor: marker.color }]}>
              <MaterialCommunityIcons name={marker.icon} size={16} color={marker.color} />
            </View>
          </Marker>
        ))}

        {/* Authority boundaries */}
        {renderAuthorityBoundaries()}
        
        {/* Other workers */}
        {renderOtherWorkers()}
        
        {/* Current position marker */}
        {currentPosition && (
          <Marker
            coordinate={{
              latitude: currentPosition.latitude,
              longitude: currentPosition.longitude,
            }}
            title="My Position"
            description={`Accuracy: ${currentPosition.accuracy?.toFixed(1) || 'Unknown'}m`}
          >
            <View style={styles.myMarker}>
              <MaterialCommunityIcons name="account" size={30} color="#FFD100" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Offline Indicator */}
      <View style={styles.offlineContainer}>
        <OfflineIndicator />
      </View>

      {/* GPS Accuracy Indicator */}
      <GPSAccuracyIndicator 
        accuracy={currentPosition?.coords?.accuracy || currentPosition?.accuracy}
        show={true}
      />

      {/* Milepost Display - shown in Follow-Me mode */}
      {followMode && currentPosition && (
        <MilepostDisplay
          milepost={currentMilepost}
          trackType={currentTrack?.type}
          trackNumber={currentTrack?.number}
          subdivision={subdivision}
          heading={heading}
          speed={speed}
        />
      )}

      {/* Boundary Indicator - shown when authority is active */}
      {currentAuthority && followMode && (
        <BoundaryIndicator
          distanceToBegin={distanceToBegin}
          distanceToEnd={distanceToEnd}
          withinBoundaries={withinBoundaries}
        />
      )}

      {/* GPS Controls Panel */}
      {showControls && renderControls()}
      
      {/* Authority info panel */}
      {!followMode && renderAuthorityInfo()}
      
      {/* GPS Controls Toggle Button */}
      <TouchableOpacity
        style={styles.gpsToggleButton}
        onPress={() => setShowControls((prev) => !prev)}
      >
        <MaterialCommunityIcons
          name={showControls ? 'close' : 'satellite-variant'}
          size={22}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  offlineContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 100,
    zIndex: 1000,
  },
  
  // New White Control Card Styles
  controlsCard: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    paddingBottom: 0,
  },
  controlRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlLabel: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '600',
  },
  minimizeButton: {
    padding: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
    gap: 4,
  },
  actionButtonActive: {
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#FFD100',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  actionButtonTextActive: {
    color: '#FFD100',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 10,
  },
  infoSection: {
    marginBottom: 10,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 8,
    borderRadius: 6,
  },
  infoValue: {
    fontSize: 12,
    color: '#000000',
    flex: 1,
    fontWeight: '500',
  },
  infoPlaceholder: {
    fontSize: 13,
    color: '#999999',
    fontStyle: 'italic',
    backgroundColor: '#F9F9F9',
    padding: 10,
    borderRadius: 6,
  },
  iconButton: {
    padding: 4,
    marginLeft: 8,
  },
  gpsToggleButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FFD100',
  },
  authorityInfo: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#FFD100',
  },
  authorityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorityTitle: {
    color: '#FFD100',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  authorityDetails: {
    marginBottom: 8,
  },
  authorityText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 2,
  },
  positionInfo: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 8,
  },
  positionText: {
    color: '#CCCCCC',
    fontSize: 11,
    marginBottom: 2,
  },
  myMarker: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 5,
    borderWidth: 2,
    borderColor: '#FFD100',
  },
  workerMarker: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    padding: 3,
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  layerMarker: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
});

export default MapScreen;

