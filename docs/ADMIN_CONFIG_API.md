# Admin Portal Configuration APIs Documentation

## Overview
This document covers the new admin portal configuration endpoints for pin types, alert configurations, and authority field customization.

---

## Pin Type Management

### 1. Get Pin Types for Agency
**Endpoint:** `GET /api/config/agencies/:agencyId/pin-types`  
**Authentication:** Required  
**Description:** Get all active pin types for an agency, grouped by category.

**Response:**
```json
{
  "success": true,
  "data": {
    "pinTypes": {
      "Work Zone": [
        {
          "pinTypeId": 1,
          "category": "Work Zone",
          "subtype": "Equipment",
          "color": "#FF5733",
          "iconUrl": "/icons/equipment.png",
          "sortOrder": 1,
          "isActive": true
        }
      ],
      "Safety": [
        {
          "pinTypeId": 2,
          "category": "Safety",
          "subtype": "Hazard",
          "color": "#C70039",
          "iconUrl": "/icons/hazard.png",
          "sortOrder": 1,
          "isActive": true
        }
      ]
    },
    "total": 2
  }
}
```

---

### 2. Get Pin Categories
**Endpoint:** `GET /api/config/agencies/:agencyId/pin-types/categories`  
**Authentication:** Required  
**Description:** Get list of unique pin categories for an agency.

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": ["Work Zone", "Safety", "Infrastructure", "Landmarks"]
  }
}
```

---

### 3. Create Pin Type
**Endpoint:** `POST /api/config/agencies/:agencyId/pin-types`  
**Authentication:** Required (Administrator only)  
**Description:** Create a new pin type for the agency.

**Request Body:**
```json
{
  "category": "Work Zone",
  "subtype": "Welder",
  "color": "#FFD100",
  "iconUrl": "/icons/welder.png",
  "sortOrder": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pinType": {
      "pinTypeId": 15,
      "category": "Work Zone",
      "subtype": "Welder",
      "color": "#FFD100",
      "iconUrl": "/icons/welder.png",
      "sortOrder": 5
    }
  },
  "message": "Pin type created successfully"
}
```

**Validation:**
- Category, subtype, and color are required
- Color must be in hex format (e.g., #FFD100)

---

### 4. Update Pin Type
**Endpoint:** `PUT /api/config/agencies/:agencyId/pin-types/:pinTypeId`  
**Authentication:** Required (Administrator only)  
**Description:** Update an existing pin type.

**Request Body:**
```json
{
  "color": "#00FF00",
  "sortOrder": 10,
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pinType": {
      "pinTypeId": 15,
      "category": "Work Zone",
      "subtype": "Welder",
      "color": "#00FF00",
      "iconUrl": "/icons/welder.png",
      "sortOrder": 10,
      "isActive": true
    }
  },
  "message": "Pin type updated successfully"
}
```

---

### 5. Delete Pin Type
**Endpoint:** `DELETE /api/config/agencies/:agencyId/pin-types/:pinTypeId`  
**Authentication:** Required (Administrator only)  
**Description:** Soft delete a pin type (sets Is_Active to false).

**Response:**
```json
{
  "success": true,
  "message": "Pin type deleted successfully"
}
```

---

## Alert Configuration Management

### 1. Get All Alert Configurations
**Endpoint:** `GET /api/config/agencies/:agencyId/alert-configs`  
**Authentication:** Required  
**Description:** Get all alert configurations for an agency, grouped by type.

**Response:**
```json
{
  "success": true,
  "data": {
    "configurations": {
      "Boundary_Alert": [
        {
          "Config_ID": 1,
          "Alert_Level": "Warning",
          "Distance_Miles": 0.25,
          "Message": "Approaching authority boundary",
          "Sound_Enabled": true,
          "Vibration_Enabled": true
        }
      ],
      "Proximity_Alert": [
        {
          "Config_ID": 2,
          "Alert_Level": "Info",
          "Distance_Miles": 0.5,
          "Message": "Worker within 0.5 miles"
        }
      ]
    }
  }
}
```

---

### 2. Get Alert Configurations by Type
**Endpoint:** `GET /api/config/agencies/:agencyId/alert-configs/:configType`  
**Authentication:** Required  
**Description:** Get alert configurations for a specific type.

**Valid Config Types:**
- `Boundary_Alert`
- `Proximity_Alert`
- `Time_Alert`
- `Speed_Alert`

**Response:**
```json
{
  "success": true,
  "data": {
    "configType": "Boundary_Alert",
    "configurations": [
      {
        "Config_ID": 1,
        "Alert_Level": "Warning",
        "Distance_Miles": 0.25,
        "Message": "Approaching authority boundary"
      }
    ]
  }
}
```

---

### 3. Create Alert Configuration
**Endpoint:** `POST /api/config/agencies/:agencyId/alert-configs`  
**Authentication:** Required (Administrator only)  
**Description:** Create a new alert configuration.

**Request Body:**
```json
{
  "configType": "Boundary_Alert",
  "alertLevel": "Critical",
  "distanceMiles": 0.1,
  "message": "STOP - Authority boundary ahead",
  "soundEnabled": true,
  "vibrationEnabled": true,
  "notificationTitle": "BOUNDARY ALERT"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "configuration": {
      "Config_ID": 10,
      "Config_Type": "Boundary_Alert",
      "Alert_Level": "Critical",
      "Distance_Miles": 0.1,
      "Message": "STOP - Authority boundary ahead"
    }
  },
  "message": "Alert configuration created successfully"
}
```

**Validation:**
- Config type must be one of: Boundary_Alert, Proximity_Alert, Time_Alert, Speed_Alert
- Alert level must be: Info, Warning, or Critical
- Distance required for Boundary_Alert and Proximity_Alert
- Time required for Time_Alert
- Speed required for Speed_Alert

---

### 4. Update Alert Configuration
**Endpoint:** `PUT /api/config/agencies/:agencyId/alert-configs/:configId`  
**Authentication:** Required (Administrator only)  
**Description:** Update an existing alert configuration.

**Request Body:**
```json
{
  "distanceMiles": 0.15,
  "message": "Approaching boundary - slow down",
  "soundEnabled": true
}
```

---

### 5. Delete Alert Configuration
**Endpoint:** `DELETE /api/config/agencies/:agencyId/alert-configs/:configId`  
**Authentication:** Required (Administrator only)  
**Description:** Soft delete an alert configuration.

---

### 6. Bulk Update Alert Configurations
**Endpoint:** `PUT /api/config/agencies/:agencyId/alert-configs`  
**Authentication:** Required (Administrator only)  
**Description:** Update multiple alert configurations in a single request.

**Request Body:**
```json
{
  "configurations": [
    {
      "configId": 1,
      "distanceMiles": 0.25,
      "soundEnabled": true
    },
    {
      "configId": 2,
      "distanceMiles": 0.5,
      "vibrationEnabled": true
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "configId": 1,
        "success": true,
        "data": {...}
      },
      {
        "configId": 2,
        "success": true,
        "data": {...}
      }
    ],
    "successCount": 2,
    "totalCount": 2
  },
  "message": "2 of 2 configurations updated successfully"
}
```

---

## Authority Field Customization

### 1. Get Authority Field Configurations
**Endpoint:** `GET /api/config/agencies/:agencyId/authority-config/fields`  
**Authentication:** Required  
**Description:** Get field configuration for authority creation form.

**Response:**
```json
{
  "success": true,
  "data": {
    "fieldConfigurations": {
      "authorityType": {
        "label": "Authority Type",
        "required": true,
        "enabled": true,
        "options": ["Foul Time", "Maintenance Window", "Emergency Work"]
      },
      "subdivision": {
        "label": "Subdivision",
        "required": true,
        "enabled": true
      },
      "beginMP": {
        "label": "Begin Milepost",
        "required": true,
        "enabled": true,
        "format": "decimal",
        "minValue": 0
      },
      "equipment": {
        "label": "Equipment",
        "required": false,
        "enabled": false,
        "format": "text"
      }
    },
    "customFields": []
  }
}
```

---

### 2. Update Field Configurations
**Endpoint:** `PUT /api/config/agencies/:agencyId/authority-config/fields`  
**Authentication:** Required (Administrator only)  
**Description:** Update field configurations.

**Request Body:**
```json
{
  "fieldConfigurations": {
    "equipment": {
      "enabled": true,
      "required": true
    },
    "speedRestriction": {
      "enabled": true,
      "required": false
    }
  }
}
```

**Note:** Required fields (authorityType, subdivision, beginMP, endMP, trackType, trackNumber) cannot be disabled.

---

### 3. Get Authority Type Options
**Endpoint:** `GET /api/config/agencies/:agencyId/authority-config/types`  
**Authentication:** Required  
**Description:** Get available authority type options with colors.

**Response:**
```json
{
  "success": true,
  "data": {
    "authorityTypes": [
      { "value": "Foul Time", "label": "Foul Time", "color": "#FF5733" },
      { "value": "Maintenance Window", "label": "Maintenance Window", "color": "#FFC300" },
      { "value": "Emergency Work", "label": "Emergency Work", "color": "#C70039" }
    ]
  }
}
```

---

### 4. Add Custom Authority Type
**Endpoint:** `POST /api/config/agencies/:agencyId/authority-config/types`  
**Authentication:** Required (Administrator only)  
**Description:** Add a custom authority type option.

**Request Body:**
```json
{
  "value": "Bridge Work",
  "label": "Bridge Work",
  "color": "#3498DB"
}
```

**Validation:**
- Color must be in hex format

---

### 5. Get Validation Rules
**Endpoint:** `GET /api/config/agencies/:agencyId/authority-config/validation`  
**Authentication:** Required  
**Description:** Get validation rules for authority fields.

**Response:**
```json
{
  "success": true,
  "data": {
    "validationRules": {
      "beginMP": {
        "type": "number",
        "min": 0,
        "max": 9999.99,
        "decimalPlaces": 2,
        "required": true
      },
      "endMP": {
        "type": "number",
        "min": 0,
        "max": 9999.99,
        "decimalPlaces": 2,
        "required": true,
        "validation": "must be greater than Begin MP"
      },
      "employeeContact": {
        "type": "string",
        "pattern": "^[0-9]{3}-[0-9]{3}-[0-9]{4}$",
        "format": "phone",
        "example": "555-123-4567"
      }
    }
  }
}
```

---

## Usage Examples

### Admin Portal - Configure Pin Types
```javascript
// Get existing pin types
const pinTypes = await fetch('/api/config/agencies/1/pin-types', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Create new pin type
await fetch('/api/config/agencies/1/pin-types', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    category: 'Work Zone',
    subtype: 'Crane',
    color: '#FFD100',
    sortOrder: 10
  })
});
```

### Configure Alert Distances
```javascript
// Create boundary alert at 0.25 miles
await fetch('/api/config/agencies/1/alert-configs', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    configType: 'Boundary_Alert',
    alertLevel: 'Warning',
    distanceMiles: 0.25,
    message: 'Approaching authority boundary',
    soundEnabled: true,
    vibrationEnabled: true
  })
});
```

---

## Important Notes

1. **Authorization:**
   - All GET endpoints accessible to authenticated users
   - All POST/PUT/DELETE endpoints require Administrator role
   - Users can only access their agency's configurations

2. **Validation:**
   - All color fields must be in hex format (#RRGGBB)
   - Required fields cannot be disabled in authority configuration
   - Alert levels limited to: Info, Warning, Critical
   - Config types limited to: Boundary_Alert, Proximity_Alert, Time_Alert, Speed_Alert

3. **Soft Deletes:**
   - Delete operations set Is_Active = false
   - Records remain in database for audit trail
   - Can be reactivated by setting Is_Active = true via update endpoint
