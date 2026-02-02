# Follow-Me Mode with Real-Time Milepost Display

## Overview
Real-time GPS tracking with dynamic milepost calculation and Socket.IO broadcasting for "Follow-Me" functionality.

---

## Architecture

### Components
1. **Mobile App** - Sends GPS updates via Socket.IO
2. **Backend GPS Service** - Calculates mileposts from GPS coordinates
3. **Socket.IO Server** - Broadcasts real-time location updates
4. **Admin Portal** - Displays worker locations on map

### Flow
```
Mobile App → Socket.IO → GPS Service → Milepost Calculation
                ↓
         Broadcast to:
         - User (Follow-Me display)
         - Authority room (other workers)
         - Admin portal (supervisor view)
```

---

## Socket.IO Events

### Client → Server Events

#### 1. Join Authority Room
**Event:** `join-authority`  
**Payload:**
```javascript
{
  authorityId: 123
}
```
**Description:** Join authority-specific room to receive updates from other workers on same authority.

#### 2. GPS Update
**Event:** `gps-update`  
**Payload:**
```javascript
{
  userId: 5,
  authorityId: 123,
  latitude: 35.1234567,
  longitude: -106.5678901,
  accuracy: 10.5,        // meters
  heading: 180.0,        // degrees (0-360)
  speed: 25.5            // mph
}
```
**Description:** Send current GPS position. Backend calculates milepost and broadcasts to relevant rooms.

#### 3. Request Location
**Event:** `request-location`  
**Payload:**
```javascript
{
  userId: 5
}
```
**Description:** Request another user's current location (supervisor/admin only).

---

### Server → Client Events

#### 1. Current Location (Follow-Me)
**Event:** `current-location`  
**Payload:**
```javascript
{
  latitude: 35.1234567,
  longitude: -106.5678901,
  accuracy: 10.5,
  heading: 180.0,
  speed: 25.5,
  milepost: 12.5432,
  trackType: "Main",
  trackNumber: "1",
  confidence: "high",              // 'exact', 'high', 'medium', 'low'
  distanceFromTrack: 0.02,        // miles
  timestamp: "2026-01-29T10:15:30.000Z"
}
```
**Description:** Real-time location update with calculated milepost (sent to user's own room).

#### 2. User Location Update (Authority Room)
**Event:** `user-location-update`  
**Payload:**
```javascript
{
  userId: 5,
  latitude: 35.1234567,
  longitude: -106.5678901,
  accuracy: 10.5,
  heading: 180.0,
  speed: 25.5,
  timestamp: "2026-01-29T10:15:30.000Z"
}
```
**Description:** Broadcast to authority room when any worker updates location (other workers receive this).

#### 3. Location Request
**Event:** `location-request`  
**Payload:** (none)  
**Description:** Server requests user to send their current location.

---

## REST API Endpoints

### 1. Update GPS Position (HTTP)
**Endpoint:** `POST /api/gps/position`  
**Authentication:** Required  
**Description:** Alternative to Socket.IO for updating GPS position.

**Request Body:**
```json
{
  "authorityId": 123,
  "latitude": 35.1234567,
  "longitude": -106.5678901,
  "accuracy": 10.5,
  "heading": 180.0,
  "speed": 25.5
}
```

**Response:**
```json
{
  "success": true,
  "message": "GPS position updated",
  "data": {
    "logged": true,
    "milepost": {
      "milepost": 12.5432,
      "trackType": "Main",
      "trackNumber": "1",
      "confidence": "high",
      "distanceFromTrack": 0.02
    },
    "boundaryDistances": {
      "distanceToBegin": 0.75,
      "distanceToEnd": 2.30,
      "nearestBoundary": 0.75,
      "isApproachingBegin": true,
      "isApproachingEnd": false
    }
  }
}
```

### 2. Get My Current Position
**Endpoint:** `GET /api/gps/my-position`  
**Authentication:** Required  
**Description:** Get last known position for current user.

**Response:**
```json
{
  "success": true,
  "data": {
    "position": {
      "userId": 5,
      "latitude": 35.1234567,
      "longitude": -106.5678901,
      "timestamp": 1738155930000
    },
    "timestamp": "2026-01-29T10:15:30.000Z"
  }
}
```

### 3. Get All Active Positions
**Endpoint:** `GET /api/gps/active-positions`  
**Authentication:** Required (Supervisor/Administrator only)  
**Description:** Get all active worker positions.

**Response:**
```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "userId": 5,
        "latitude": 35.1234567,
        "longitude": -106.5678901,
        "timestamp": 1738155930000,
        "user": {
          "employeeName": "John Smith",
          "employeeContact": "555-123-4567",
          "role": "Field Worker"
        },
        "authority": {
          "authorityId": 123,
          "trackType": "Main",
          "trackNumber": "1",
          "subdivision": "MEDLIN"
        }
      }
    ],
    "count": 1
  }
}
```

---

## Milepost Calculation

### Algorithm
1. **Query Geometry:** Fetch milepost geometry for subdivision
2. **Find Nearest Point:** Calculate distance to all geometry points using Haversine formula
3. **Interpolate Milepost:** If between two points, interpolate based on distance ratio
4. **Determine Confidence:** Based on distance from track centerline

### Confidence Levels
- **exact:** GPS position exactly matches a geometry point (< 10m)
- **high:** Within 50m of track centerline
- **medium:** 50m - 200m from track
- **low:** > 200m from track

### Example Calculation
```javascript
// GPS Coordinates
latitude: 35.1234567
longitude: -106.5678901

// Nearest geometry points
Point A: MP 12.5, Lat 35.1234000, Lon -106.5678000
Point B: MP 12.6, Lat 35.1235000, Lon -106.5679000

// Distance calculations
Distance to A: 0.015 miles
Distance to B: 0.025 miles

// Interpolated milepost
Ratio: 0.015 / (0.015 + 0.025) = 0.375
MP = 12.5 + (0.6 - 0.5) * 0.375 = 12.5375

// Confidence
Distance from track: 0.02 miles (105 feet)
Confidence: "high"
```

---

## Mobile App Integration

### React Native Example
```javascript
import io from 'socket.io-client';
import Geolocation from '@react-native-community/geolocation';

// Initialize Socket.IO
const socket = io('https://api.example.com', {
  auth: {
    token: userToken
  }
});

// Join user room
socket.emit('join-user', userId);

// Join authority room
socket.emit('join-authority', authorityId);

// Listen for current location updates (Follow-Me)
socket.on('current-location', (data) => {
  console.log('Milepost:', data.milepost);
  console.log('Track:', `${data.trackType} ${data.trackNumber}`);
  console.log('Speed:', data.speed, 'mph');
  
  // Update UI
  updateFollowMeDisplay({
    milepost: data.milepost,
    track: `${data.trackType} ${data.trackNumber}`,
    speed: data.speed,
    confidence: data.confidence
  });
});

// Listen for other workers' locations
socket.on('user-location-update', (data) => {
  updateWorkerMarker(data.userId, {
    lat: data.latitude,
    lon: data.longitude
  });
});

// Send GPS updates
const watchId = Geolocation.watchPosition(
  (position) => {
    const gpsData = {
      userId,
      authorityId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading,
      speed: position.coords.speed * 2.237 // m/s to mph
    };
    
    socket.emit('gps-update', gpsData);
  },
  (error) => console.error(error),
  { 
    enableHighAccuracy: true,
    distanceFilter: 10, // meters
    interval: 5000 // 5 seconds
  }
);
```

### Follow-Me UI Component
```javascript
function FollowMeDisplay({ location }) {
  const getConfidenceColor = (confidence) => {
    switch(confidence) {
      case 'exact': return '#00FF00';
      case 'high': return '#FFD100';
      case 'medium': return '#FFA500';
      case 'low': return '#FF0000';
      default: return '#999999';
    }
  };

  return (
    <View style={styles.followMe}>
      <Text style={styles.title}>Current Location</Text>
      
      <View style={styles.milepostContainer}>
        <Text style={styles.label}>Milepost:</Text>
        <Text style={styles.milepost}>{location.milepost.toFixed(4)}</Text>
        <View style={[
          styles.confidenceBadge,
          { backgroundColor: getConfidenceColor(location.confidence) }
        ]}>
          <Text style={styles.confidenceText}>
            {location.confidence.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={styles.trackInfo}>
        <Text style={styles.label}>Track:</Text>
        <Text style={styles.track}>
          {location.trackType} {location.trackNumber}
        </Text>
      </View>
      
      {location.speed && (
        <View style={styles.speedInfo}>
          <Text style={styles.label}>Speed:</Text>
          <Text style={styles.speed}>{location.speed.toFixed(1)} mph</Text>
        </View>
      )}
      
      <Text style={styles.timestamp}>
        Updated: {new Date(location.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );
}
```

---

## Admin Portal Integration

### Real-Time Map Display
```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

function WorkerTrackingMap({ agencyId }) {
  const [workers, setWorkers] = useState([]);
  
  useEffect(() => {
    const socket = io('https://api.example.com', {
      auth: { token: adminToken }
    });
    
    // Join agency room
    socket.emit('join-agency', agencyId);
    
    // Listen for location updates
    socket.on('user-location-update', (data) => {
      setWorkers(prev => {
        const index = prev.findIndex(w => w.userId === data.userId);
        if (index >= 0) {
          // Update existing worker
          const updated = [...prev];
          updated[index] = { ...updated[index], ...data };
          return updated;
        } else {
          // Add new worker
          return [...prev, data];
        }
      });
    });
    
    return () => socket.disconnect();
  }, [agencyId]);
  
  return (
    <MapContainer center={[35.1234, -106.5678]} zoom={13}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {workers.map(worker => (
        <Marker 
          key={worker.userId}
          position={[worker.latitude, worker.longitude]}
        >
          <Popup>
            <strong>{worker.user.employeeName}</strong><br/>
            Authority: {worker.authority.trackType} {worker.authority.trackNumber}<br/>
            Speed: {worker.speed.toFixed(1)} mph<br/>
            Updated: {new Date(worker.timestamp).toLocaleTimeString()}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

---

## Performance Considerations

### GPS Update Frequency
- **Recommended:** Every 5-10 seconds
- **High accuracy mode:** Every 3-5 seconds
- **Battery saving:** Every 30-60 seconds

### Socket.IO Optimization
```javascript
// Throttle GPS updates
const throttledGPSUpdate = throttle((data) => {
  socket.emit('gps-update', data);
}, 5000); // Max once per 5 seconds
```

### Database Logging
- GPS updates are logged to `GPS_Logs` table
- Indexes on `User_ID` and `Timestamp` for query performance
- Consider archiving old logs (>30 days)

---

## Security

### Authentication
```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    // Verify JWT
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.userId = decoded.userId;
      next();
    });
  } else {
    next(new Error('Authentication error'));
  }
});
```

### Authorization
- Users can only send GPS updates for themselves
- Only supervisors/admins can view all positions
- Authority room access requires active authority

---

## Troubleshooting

### No Milepost Displayed
1. Check if milepost geometry exists for subdivision
2. Verify GPS accuracy (< 100m recommended)
3. Check confidence level (may be "low" if far from track)

### Delayed Updates
1. Check Socket.IO connection status
2. Verify network connectivity
3. Increase GPS update frequency

### Incorrect Milepost
1. Verify milepost geometry data accuracy
2. Check GPS coordinates are correct
3. Review interpolation logic for edge cases

---

## Future Enhancements

1. **Offline Milepost Calculation:**
   - Cache milepost geometry on device
   - Calculate mileposts locally
   - Sync when connection restored

2. **Track Visualization:**
   - Draw track centerline on map
   - Show milepost markers
   - Highlight authority boundaries

3. **Historical Playback:**
   - Replay worker movements
   - Analyze work patterns
   - Generate time-on-track reports
