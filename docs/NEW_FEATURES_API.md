# New API Endpoints Documentation

## Offline Data Download APIs

### 1. Get Available Downloads
**Endpoint:** `GET /api/offline/downloads/available`  
**Authentication:** Required  
**Description:** Get list of all subdivisions and data packages available for download for the user's agency.

**Response:**
```json
{
  "success": true,
  "data": {
    "agency": {
      "Agency_ID": 1,
      "Agency_Name": "Herzog Railroad Services"
    },
    "subdivisions": [
      {
        "Subdivision_ID": 1,
        "Subdivision_Code": "MEDLIN",
        "Subdivision_Name": "Medlin Subdivision",
        "Region": "Southwest",
        "Track_Count": 12,
        "Milepost_Count": 245,
        "Min_MP": 0.0,
        "Max_MP": 125.5
      }
    ],
    "downloadTypes": [
      {
        "type": "Agency_Data",
        "description": "Basic agency and subdivision list"
      },
      {
        "type": "Subdivision_Data",
        "description": "Full subdivision with tracks and milepost geometry"
      }
    ]
  }
}
```

---

### 2. Download Agency Data
**Endpoint:** `GET /api/offline/agency/:agencyId`  
**Authentication:** Required  
**Description:** Download basic agency data package including subdivisions list.

**Response:**
```json
{
  "success": true,
  "data": {
    "agency": {
      "Agency_ID": 1,
      "Agency_Name": "Herzog Railroad Services",
      "subdivisions": [...]
    },
    "downloadedAt": "2026-01-29T10:00:00.000Z",
    "expiresAt": "2026-02-28T10:00:00.000Z"
  }
}
```

---

### 3. Download Subdivision Data
**Endpoint:** `GET /api/offline/agency/:agencyId/subdivision/:subdivisionId`  
**Authentication:** Required  
**Description:** Download complete subdivision data including all milepost geometry and track data for offline use.

**Response:**
```json
{
  "success": true,
  "data": {
    "subdivision": {
      "Subdivision_ID": 1,
      "Subdivision_Code": "MEDLIN",
      "Subdivision_Name": "Medlin Subdivision",
      "Region": "Southwest"
    },
    "milepostGeometry": [
      {
        "MP": 0.0,
        "Latitude": 35.1234,
        "Longitude": -106.5678,
        "Track_Type": "Main",
        "Track_Number": "1"
      }
    ],
    "tracks": [
      {
        "Track_ID": 1,
        "Track_Type": "Main",
        "Track_Number": "1",
        "Begin_MP": 0.0,
        "End_MP": 125.5
      }
    ],
    "metadata": {
      "totalMileposts": 245,
      "totalTracks": 12,
      "trackTypes": ["Main", "Siding", "Yard"]
    },
    "downloadedAt": "2026-01-29T10:00:00.000Z",
    "expiresAt": "2026-02-28T10:00:00.000Z"
  }
}
```

---

### 4. Check Download Status
**Endpoint:** `GET /api/offline/downloads/status?downloadType=Subdivision_Data&subdivisionId=1`  
**Authentication:** Required  
**Headers:** `X-Device-ID: device-unique-id`  
**Description:** Check if previously downloaded data needs to be updated (older than 30 days).

**Response:**
```json
{
  "success": true,
  "data": {
    "hasDownload": true,
    "needsUpdate": false,
    "lastDownload": "2026-01-15T10:00:00.000Z",
    "daysOld": 14,
    "isFresh": true
  }
}
```

---

### 5. Get Download History
**Endpoint:** `GET /api/offline/downloads/history`  
**Authentication:** Required  
**Headers:** `X-Device-ID: device-unique-id` (optional)  
**Description:** Get user's download history.

**Response:**
```json
{
  "success": true,
  "data": {
    "downloads": [
      {
        "Download_ID": 1,
        "Agency_Name": "Herzog Railroad Services",
        "Subdivision_Name": "Medlin Subdivision",
        "Download_Type": "Subdivision_Data",
        "Downloaded_Date": "2026-01-15T10:00:00.000Z",
        "Data_Size_MB": 2.5,
        "Days_Since_Download": 14
      }
    ],
    "count": 1
  }
}
```

---

## Branding & White-Labeling APIs

### 1. Get Branding Configuration
**Endpoint:** `GET /api/branding/agency/:agencyId`  
**Authentication:** Required  
**Description:** Get complete branding configuration for an agency including colors, logos, and terminology.

**Response:**
```json
{
  "success": true,
  "data": {
    "branding": {
      "Agency_ID": 1,
      "App_Name": "Sidekick",
      "Primary_Color": "#000000",
      "Secondary_Color": "#FFFFFF",
      "Accent_Color": "#FFD100",
      "Logo_URL": "/uploads/branding/agency-1-logo.png",
      "Icon_URL": "/uploads/branding/agency-1-icon.png",
      "Custom_Terminology": {
        "authority": "Authority",
        "subdivision": "Subdivision",
        "milepost": "Milepost",
        "fieldWorker": "Field Worker"
      }
    }
  }
}
```

---

### 2. Update Branding Configuration
**Endpoint:** `PUT /api/branding/agency/:agencyId`  
**Authentication:** Required (Administrator only)  
**Description:** Update branding configuration for an agency.

**Request Body:**
```json
{
  "appName": "Sidekick",
  "primaryColor": "#000000",
  "secondaryColor": "#FFFFFF",
  "accentColor": "#FFD100",
  "customTerminology": {
    "authority": "Work Authority",
    "milepost": "Mile Post"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "branding": {...}
  },
  "message": "Branding configuration updated successfully"
}
```

**Validation:**
- All colors must be in hex format (e.g., #FFD100)
- App name is required
- Administrator role required

---

### 3. Upload Logo
**Endpoint:** `POST /api/branding/agency/:agencyId/logo?logoType=logo`  
**Authentication:** Required (Administrator only)  
**Content-Type:** multipart/form-data  
**Description:** Upload a logo or icon for the agency.

**Query Parameters:**
- `logoType`: 'logo' or 'icon' (default: 'logo')

**Form Data:**
- `logo`: Image file (PNG, JPEG, or SVG)

**Response:**
```json
{
  "success": true,
  "data": {
    "logoUrl": "/uploads/branding/agency-1-1738155600000-123456789.png",
    "branding": {...}
  },
  "message": "Logo uploaded successfully"
}
```

**Constraints:**
- Max file size: 5MB
- Allowed formats: PNG, JPEG, JPG, SVG
- Only administrators can upload

---

### 4. Delete Logo
**Endpoint:** `DELETE /api/branding/agency/:agencyId/logo?logoType=logo`  
**Authentication:** Required (Administrator only)  
**Description:** Delete agency logo or icon.

**Response:**
```json
{
  "success": true,
  "data": {
    "branding": {...}
  },
  "message": "Logo deleted successfully"
}
```

---

### 5. Get Custom Terminology
**Endpoint:** `GET /api/branding/agency/:agencyId/terminology`  
**Authentication:** Required  
**Description:** Get custom terminology configuration for the agency.

**Response:**
```json
{
  "success": true,
  "data": {
    "terminology": {
      "authority": "Work Authority",
      "subdivision": "Sub Division",
      "milepost": "Mile Post",
      "trackType": "Track Class",
      "trackNumber": "Track ID",
      "beginMP": "Start Milepost",
      "endMP": "End Milepost",
      "fieldWorker": "Track Worker",
      "supervisor": "Foreman",
      "administrator": "System Admin",
      "trip": "Job",
      "pin": "Marker",
      "alert": "Notification"
    }
  }
}
```

---

### 6. Update Custom Terminology
**Endpoint:** `PUT /api/branding/agency/:agencyId/terminology`  
**Authentication:** Required (Administrator only)  
**Description:** Update custom terminology for the agency.

**Request Body:**
```json
{
  "terminology": {
    "authority": "Work Permit",
    "fieldWorker": "Track Inspector"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "branding": {...}
  },
  "message": "Terminology updated successfully"
}
```

**Notes:**
- Only provided terms are updated; others retain default values
- Changes are merged with existing terminology
- Administrator notifications can be configured via environment variable `ADMIN_EMAIL`

---

### 7. Get All Branding Configurations
**Endpoint:** `GET /api/branding`  
**Authentication:** Required (Administrator only)  
**Description:** Get branding configurations for all agencies (admin only).

**Response:**
```json
{
  "success": true,
  "data": {
    "branding": [
      {
        "Agency_ID": 1,
        "Agency_Name": "Herzog Railroad Services",
        "App_Name": "Sidekick",
        "Primary_Color": "#000000",
        ...
      }
    ],
    "count": 1
  }
}
```

---

## Track-Based Distance Calculation (GPS Service Updates)

The GPS service now includes advanced track-based distance calculations using milepost geometry:

### Enhanced calculateMilepost()
Now returns detailed milepost information:
```javascript
{
  "milepost": 12.5432,
  "confidence": "high", // 'high', 'medium', 'low', or 'exact'
  "distanceFromTrack": 0.02, // miles
  "trackType": "Main",
  "trackNumber": "1"
}
```

### New calculateTrackDistanceBetween()
Calculates actual track distance (not straight-line):
```javascript
await gpsService.calculateTrackDistanceBetween(subdivisionId, mp1, mp2);
// Returns: distance in miles along the track
```

### New calculateDistanceToAuthorityBoundary()
Calculates track-based distance to authority boundaries:
```javascript
{
  "distanceToBegin": 0.75,
  "distanceToEnd": 2.30,
  "nearestBoundary": 0.75,
  "isApproachingBegin": true,
  "isApproachingEnd": false
}
```

---

## Usage Examples

### Mobile App - Download Subdivision for Offline Use
```javascript
// 1. Check if download is needed
const status = await fetch('/api/offline/downloads/status?downloadType=Subdivision_Data&subdivisionId=1', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Device-ID': deviceId
  }
});

// 2. Download if needed
if (status.needsUpdate) {
  const data = await fetch('/api/offline/agency/1/subdivision/1', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Device-ID': deviceId
    }
  });
  
  // Store in local database
  await storeOfflineData(data);
}
```

### Admin Portal - Update Branding
```javascript
// Upload logo
const formData = new FormData();
formData.append('logo', logoFile);

await fetch('/api/branding/agency/1/logo?logoType=logo', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  },
  body: formData
});

// Update colors
await fetch('/api/branding/agency/1', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    appName: 'Sidekick',
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
    accentColor: '#FFD100'
  })
});
```

---

## Important Notes

1. **Offline Downloads**
   - Downloads expire after 30 days
   - Requires `X-Device-ID` header for tracking
   - Data size is tracked in MB
   - Users can only download data for their agency (unless Administrator)

2. **Branding**
   - Only Administrators can modify branding
   - All colors must be valid hex format
   - Logo files limited to 5MB
   - Supported image formats: PNG, JPEG, SVG
   - Logo files stored in `/public/uploads/branding/`

3. **Track Distance Calculations**
   - Uses actual milepost geometry for accurate distances
   - Falls back to simple milepost difference if no geometry available
   - Confidence levels indicate accuracy based on distance from track
   - All distances are in miles

4. **Authentication**
   - All endpoints require JWT authentication
   - Some endpoints restricted to Administrator role
   - Device ID tracking for offline functionality
