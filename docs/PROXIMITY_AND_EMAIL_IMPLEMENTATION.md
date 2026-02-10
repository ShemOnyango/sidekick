# Proximity Monitoring & Email Notifications - Implementation Summary

## Features Implemented

### 1. Real-Time Proximity Monitoring Service
**File**: `src/services/proximityMonitoringService.js`

#### Features:
- **Background Monitoring**: Runs every 30 seconds checking all active authorities
- **Track-Based Distance Calculation**: Uses milepost geometry for accurate distance
- **Escalating Alert Thresholds**:
  - 🔵 **Info** - 1.0 mile, 0.75 mile
  - 🟡 **Warning** - 0.5 mile  
  - 🔴 **Critical** - 0.25 mile
- **Alert Cooldown**: 60-second minimum between same alert pairs
- **Real-Time Broadcasting**: Socket.IO alerts to both workers and authority rooms
- **Database Logging**: All alerts logged to Alert_Logs table

#### API Methods:
```javascript
proximityMonitoringService.start(io)           // Start monitoring
proximityMonitoringService.stop()              // Stop monitoring
proximityMonitoringService.getProximityStatus(authorityId)  // Get current status
```

#### Alert Data Structure:
```javascript
{
  type: 'PROXIMITY_ALERT',
  level: 'Critical',           // Critical, Warning, Info
  color: '#C70039',           // Red, Yellow, Blue
  distance: 0.25,             // Distance in miles
  worker1: { name, contact, authorityId, subdivision, track, milepost },
  worker2: { name, contact, authorityId, subdivision, track, milepost },
  message: 'Workers within 0.25 miles',
  timestamp: Date
}
```

---

### 2. Email Notification System
**File**: `src/services/emailService.js` (Enhanced)

#### New Email Methods:

##### A. Authority Overlap Email
Sent when a new authority overlaps with existing authorities.

**Recipients**: All supervisors and administrators
**Trigger**: Authority creation with overlap detection
**Content**:
- New authority details (employee, track, milepost range)
- List of conflicting authorities
- Contact information for coordination
- Visual table layout with priority styling

```javascript
await emailService.sendAuthorityOverlapEmail({
  newAuthority,
  conflictingAuthorities,
  user,
  agency
}, adminEmails);
```

##### B. Daily Alert Summary Email
Comprehensive daily digest of all system alerts.

**Recipients**: Configurable (supervisors, admins, specific users)
**Trigger**: Scheduled or manual via API
**Content**:
- Summary statistics (total alerts by type)
- Proximity alerts with severity levels
- Boundary violation alerts
- Authority overlap incidents
- Grouped by subdivision and track

```javascript
await emailService.sendAlertSummaryEmail({
  date,
  agency,
  proximityAlerts,
  boundaryAlerts,
  authorityOverlaps,
  totalAlerts
}, recipients);
```

---

### 3. API Endpoints

#### Proximity Monitoring
**Base URL**: `/api/proximity`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status/:authorityId` | Get proximity status for specific authority |
| GET | `/service-status` | Get monitoring service status and configuration |

**Example Response**:
```json
{
  "success": true,
  "data": {
    "authorityId": 123,
    "nearbyAuthorities": [
      {
        "authorityId": 124,
        "employeeName": "John Doe",
        "distance": 0.35,
        "alertLevel": "Warning"
      }
    ],
    "lastChecked": "2024-01-15T10:30:00Z"
  }
}
```

#### Email Management
**Base URL**: `/api/email`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/send-alert-summary` | Send alert summary email |
| GET | `/test-connection` | Test SMTP configuration |
| GET | `/logs` | Get email sending logs |

**Send Alert Summary Request**:
```json
{
  "agencyId": 1,
  "date": "2024-01-15",
  "recipients": ["admin@example.com", "supervisor@example.com"]
}
```

---

### 4. Authority Controller Integration
**File**: `src/controllers/authorityController.js`

#### Enhanced Authority Creation:
When a new authority is created with overlaps:

1. ✅ Authority is created and validated
2. ✅ Overlap detection runs automatically
3. ✅ Real-time Socket.IO alerts sent to both workers
4. ✅ Email notification sent to all supervisors/admins
5. ✅ Overlap details included in response

**Response Example**:
```json
{
  "success": true,
  "data": {
    "authorityId": 123,
    "hasOverlap": true,
    "overlapDetails": [
      {
        "Authority_ID": 122,
        "Employee_Name_Display": "Jane Smith",
        "Employee_Contact_Display": "555-0102",
        "Begin_MP": 10.5,
        "End_MP": 15.2
      }
    ]
  },
  "message": "Authority created with overlap warnings"
}
```

---

### 5. Server Integration
**File**: `src/server.js`

#### Automatic Service Startup:
```javascript
// Proximity monitoring starts automatically with server
const io = initializeSocket(server);
proximityMonitoringService.start(io);
console.log('✅ Proximity monitoring service started');

// Graceful shutdown stops monitoring
gracefulShutdown = async () => {
  proximityMonitoringService.stop();
  // ... other cleanup
}
```

---

## Database Schema

### Alert_Logs Table
Stores all proximity and boundary alerts:
```sql
Alert_Log_ID (PK)
Authority_ID (FK)
Alert_Type ('proximity', 'boundary', 'overlap')
Alert_Level ('Info', 'Warning', 'Critical')
Message
Alert_Time
Metadata (JSON)
```

### Email_Logs Table
Tracks all sent emails:
```sql
Email_Log_ID (PK)
Email_Type ('authority_overlap', 'alert_summary', 'trip_report')
Authority_ID (FK)
User_ID (FK)
Recipients
Message_ID
Sent_At
Status
```

---

## Configuration

### Environment Variables Required:
```env
# SMTP Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your_password

# Email Settings
EMAIL_FROM_NAME=Sidekick System
EMAIL_FROM_ADDRESS=noreply@example.com
```

---

## Usage Examples

### 1. Monitor Proximity in Real-Time (Client Side)
```javascript
socket.on('proximity_alert', (alert) => {
  console.log(`⚠️ ${alert.level} Alert: ${alert.message}`);
  console.log(`Distance: ${alert.distance} miles`);
  
  // Show notification
  showNotification({
    title: `${alert.level} Proximity Alert`,
    message: alert.message,
    color: alert.color,
    priority: alert.level === 'Critical' ? 'high' : 'normal'
  });
});
```

### 2. Send Daily Alert Summary
```javascript
// Schedule daily at 6 PM
cron.schedule('0 18 * * *', async () => {
  await fetch('/api/email/send-alert-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agencyId: 1,
      date: new Date().toISOString().split('T')[0],
      recipients: ['supervisors@company.com']
    })
  });
});
```

### 3. Check Proximity Status
```javascript
const response = await fetch(`/api/proximity/status/${authorityId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { data } = await response.json();
console.log(`Nearby workers: ${data.nearbyAuthorities.length}`);
```

---

## Testing Checklist

- ✅ Proximity monitoring starts with server
- ✅ Alerts sent at correct thresholds (0.25, 0.5, 0.75, 1.0 miles)
- ✅ Cooldown prevents alert spam
- ✅ Socket.IO broadcasts to correct user rooms
- ✅ Overlap emails sent to supervisors on authority creation
- ✅ Alert summary email includes all alert types
- ✅ Email logs stored in database
- ✅ Service stops gracefully on shutdown
- ✅ SMTP connection can be tested via API

---

## Alert Severity Matrix

| Distance | Level | Color | Socket Event | Email |
|----------|-------|-------|--------------|-------|
| ≤ 0.25 mi | Critical | 🔴 Red | ✅ Yes | ✅ First occurrence only |
| ≤ 0.50 mi | Warning | 🟡 Yellow | ✅ Yes | ❌ No |
| ≤ 0.75 mi | Warning | 🟡 Yellow | ✅ Yes | ❌ No |
| ≤ 1.00 mi | Info | 🔵 Blue | ✅ Yes | ❌ No |

---

## Performance Considerations

- **Monitoring Interval**: 30 seconds (configurable)
- **Query Optimization**: Only checks authorities with GPS updated in last 5 minutes
- **Alert Cooldown**: 60 seconds per unique worker pair per threshold
- **Email Throttling**: Only first Critical alert triggers email per overlap
- **Database Indexing**: Required on (Subdivision_Code, Track_Number, Track_Type, Status)

---

## Future Enhancements

1. **Scheduled Reports**: Automatic daily/weekly summaries
2. **SMS Alerts**: Critical proximity alerts via SMS
3. **Alert History Dashboard**: Visual analytics of alert patterns
4. **Configurable Thresholds**: Per-agency or per-subdivision settings
5. **Geofencing**: Additional boundary monitoring zones
6. **Alert Acknowledgment**: Require workers to acknowledge critical alerts

---

## Files Modified/Created

### New Files:
- `src/services/proximityMonitoringService.js` (445 lines)
- `src/controllers/proximityController.js` (64 lines)
- `src/controllers/emailController.js` (187 lines)
- `src/routes/proximityRoutes.js` (12 lines)
- `src/routes/emailRoutes.js` (15 lines)

### Modified Files:
- `src/services/emailService.js` - Added 2 new email methods
- `src/controllers/authorityController.js` - Added overlap email integration
- `src/routes/index.js` - Added proximity and email routes
- `src/server.js` - Added proximity service startup/shutdown

**Total Lines Added**: ~900+ lines of production code

---

## Support & Maintenance

For issues or questions:
1. Check service status: `GET /api/proximity/service-status`
2. Test email configuration: `GET /api/email/test-connection`
3. Review logs: `GET /api/email/logs`
4. Monitor database: Check Alert_Logs and Email_Logs tables
