import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getActiveAuthority } from '../../store/slices/authoritySlice';
import { saveGPSLog } from '../../store/slices/gpsSlice';
import socketService from '../../services/socket/SocketService';
import apiService from '../../services/api/ApiService';
import MilepostDisplay from '../../components/map/MilepostDisplay';
import BoundaryIndicator from '../../components/map/BoundaryIndicator';
import { 
  getCurrentTrack,
  checkAuthorityBoundaries,
  calculateBearing,
  interpolateMilepost
} from '../../utils/trackGeometry';
import { 
  COLORS, 
  SPACING, 
  FONT_SIZES, 
  FONT_WEIGHTS, 
  BORDER_RADIUS,
  ALERT_DISTANCES 
} from '../../constants/theme';

const { width, height } = Dimensions.get('window');

const MapScreen = () => {
  const dispatch = useDispatch();
  const mapRef = useRef(null);
  
  const { user } = useSelector((state) => state.auth);
  const { currentAuthority } = useSelector((state) => state.authority);
  const { currentPosition, isTracking } = useSelector((state) => state.gps);
  
  const [region, setRegion] = useState({
    latitude: 39.8283,
    longitude: -98.5795,
    latitudeDelta: 50,
    longitudeDelta: 50,
  });
  
  const [followMode, setFollowMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [trackGeometry, setTrackGeometry] = useState([]);
  const [otherWorkers, setOtherWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
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

  // Load active authority on mount
  useEffect(() => {
    loadActiveAuthority();
    
    // Setup socket listeners
    socketService.on('user_location_update', handleUserLocationUpdate);
    socketService.on('alert', handleAlert);
    
    return () => {
      socketService.off('user_location_update', handleUserLocationUpdate);
      socketService.off('alert', handleAlert);
    };
  }, []);

  // Load milepost data when authority changes
  useEffect(() => {
    if (currentAuthority && currentAuthority.Subdivision_ID) {
      loadMilepostData(currentAuthority.Subdivision_ID);
      setSubdivision(currentAuthority.Subdivision_Name);
    }
  }, [currentAuthority]);

  // Update milepost and boundaries when position changes
  useEffect(() => {
    if (currentPosition && mileposts.length > 0) {
      updateTrackingInfo();
    }
  }, [currentPosition, mileposts]);

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
      await dispatch(getActiveAuthority()).unwrap();
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load authority:', error);
      setIsLoading(false);
    }
  };

  const loadMilepostData = async (subdivisionId) => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/offline/subdivision/${subdivisionId}`
      );
      const data = await response.json();
      if (data.mileposts) {
        setMileposts(data.mileposts);
      }
    } catch (error) {
      console.error('Failed to load milepost data:', error);
    }
  };

  const updateTrackingInfo = () => {
    const { latitude, longitude } = currentPosition;
    
    // Get current track and milepost
    const trackInfo = getCurrentTrack(latitude, longitude, mileposts);
    
    if (trackInfo) {
      setCurrentMilepost(trackInfo.milepost);
      setCurrentTrack({
        type: trackInfo.trackType,
        number: trackInfo.trackNumber,
      });
      
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
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
    if (currentAuthority && currentAuthority.begin_mp && currentAuthority.end_mp) {
      // Calculate center of authority
      const centerLat = (currentAuthority.begin_lat + currentAuthority.end_lat) / 2;
      const centerLng = (currentAuthority.begin_lng + currentAuthority.end_lng) / 2;
      
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
      { latitude: currentAuthority.begin_lat || region.latitude - 0.01, 
        longitude: currentAuthority.begin_lng || region.longitude - 0.01 },
      { latitude: currentAuthority.end_lat || region.latitude + 0.01, 
        longitude: currentAuthority.end_lng || region.longitude + 0.01 },
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

  const renderControls = () => {
    if (!showControls) return null;

    return (
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, followMode && styles.controlButtonActive]}
          onPress={toggleFollowMode}
        >
          <Icon
            name={followMode ? 'crosshairs-gps' : 'crosshairs'}
            size={24}
            color={followMode ? '#000000' : '#FFFFFF'}
          />
          <Text style={[styles.controlText, followMode && styles.controlTextActive]}>
            {followMode ? 'Following' : 'Follow Me'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={centerOnCurrentLocation}
        >
          <MaterialCommunityIcons name="target" size={24} color="#FFFFFF" />
          <Text style={styles.controlText}>My Location</Text>
        </TouchableOpacity>

        {currentAuthority && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={centerOnAuthority}
          >
            <MaterialCommunityIcons name="vector-line" size={24} color="#FFFFFF" />
            <Text style={styles.controlText}>Authority</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowControls(false)}
        >
          <MaterialCommunityIcons name="chevron-down" size={24} color="#FFFFFF" />
          <Text style={styles.controlText}>Hide</Text>
        </TouchableOpacity>
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
            {currentAuthority.subdivision_code}: {currentAuthority.track_type} {currentAuthority.track_number}
          </Text>
          <Text style={styles.authorityText}>
            MP {currentAuthority.begin_mp} to {currentAuthority.end_mp}
          </Text>
          <Text style={styles.authorityText}>
            Started: {new Date(currentAuthority.start_time).toLocaleTimeString()}
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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
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

      {/* Controls */}
      {renderControls()}
      
      {/* Authority info panel */}
      {!followMode && renderAuthorityInfo()}
      
      {/* Show controls button (when hidden) */}
      {!showControls && (
        <TouchableOpacity
          style={styles.showControlsButton}
          onPress={() => setShowControls(true)}
        >
          <MaterialCommunityIcons name="chevron-up" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
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
  controlsContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 10,
    minWidth: 120,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    marginBottom: 5,
    backgroundColor: '#333333',
  },
  controlButtonActive: {
    backgroundColor: '#FFD100',
  },
  controlText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  controlTextActive: {
    color: '#000000',
  },
  showControlsButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    padding: 10,
  },
  authorityInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 10,
    padding: 15,
    borderWidth: 2,
    borderColor: '#FFD100',
  },
  authorityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorityTitle: {
    color: '#FFD100',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  authorityDetails: {
    marginBottom: 10,
  },
  authorityText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 3,
  },
  positionInfo: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 10,
  },
  positionText: {
    color: '#CCCCCC',
    fontSize: 12,
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
});

export default MapScreen;
