# Herzog Rail Authority - Database Schema Documentation

## Overview

The database uses SQL Server and follows a multi-tenant architecture with agency-level data isolation. All tables include audit fields (Created_Date, Modified_Date) and support soft deletes where applicable.

## Core Tables

### 1. Agencies (`Agencies`)
Central table for multi-tenancy. Each agency has its own configuration.

**Key Fields:**
- `Agency_CD`: Unique agency code (e.g., 'HERZOG')
- `Agency_Name`: Display name
- `Region`: Geographic region
- `Is_Active`: Soft delete flag

### 2. Users (`Users`)
Users belong to agencies and have role-based permissions.

**Roles:**
- `Administrator`: Full system control
- `Supervisor`: Can manage field workers, view all authorities
- `Field_Worker`: Can create authorities, drop pins, receive alerts
- `Viewer`: Read-only access

### 3. Authorities (`Authorities`)
Core table for tracking worker authorities on tracks.

**Key Features:**
- Two authority types: `Track_Authority` and `Lone_Worker_Authority`
- Track-based constraints (Subdivision, Track Type, Track Number)
- Milepost range (Begin_MP to End_MP)
- Real-time active status tracking
- Manual end tracking with confirmation button

### 4. Authority Overlap Detection

**Function:** `fn_CheckAuthorityOverlap`
- Checks for overlapping authorities on same track
- Returns overlap type and details
- Used in `sp_CreateAuthority` stored procedure

**Table:** `Authority_Overlaps`
- Logs all detected overlaps
- Tracks resolution status
- Used for reporting and audit

### 5. GPS Tracking (`GPS_Logs`)
- Stores real-time position updates
- Supports offline mode (`Is_Offline` flag)
- Sync status tracking for offline-first architecture

### 6. Alert System

**Alert Configurations (`Alert_Configurations`):**
- Fully configurable per agency
- Three alert types: Boundary, Proximity, Overlap
- Three levels: Informational, Warning, Critical
- Configurable distances (0.25, 0.5, 0.75, 1.0 miles)

**Alert Logs (`Alert_Logs`):**
- Complete audit trail of all alerts
- Tracks delivery and read status
- Used for compliance and reporting

### 7. Pin System (`Pin_Types`, `Pins`)
- Fully configurable pin categories
- Agency-specific configurations
- Supports photos and notes
- Used for trip reporting

### 8. Trip Reporting (`Trips`)
- Automatically created with authority
- Tracks start/end times
- Generates reports in multiple formats (Excel, PDF, Email)

## Critical Stored Procedures

### `sp_CreateAuthority`
Creates a new authority with automatic overlap detection.

**Input Parameters:**
- User details
- Track information (Subdivision, Type, Number)
- Milepost range (Begin_MP, End_MP)

**Output:**
- Authority ID
- Overlap detection flag
- Overlap details (JSON)

### `sp_CheckProximity`
Checks for nearby workers within configurable distances.

**Uses:**
- Real-time GPS coordinates
- Track distance calculation (not straight-line)
- Configurable alert radii

### `sp_CalculateTrackDistance`
Calculates distance along track (not straight-line GPS).

**Note:** This is a placeholder - actual implementation requires GIS track geometry data.

## Performance Optimizations

### Indexes
1. `IX_Authorities_Active`: Optimizes active authority queries
2. `IX_GPS_Logs_Recent`: Fast access to recent positions
3. `IX_Alert_Configs_Agency`: Quick configuration lookups
4. `IX_Data_Sync_Queue_Status`: Efficient sync processing

### Views
1. `vw_ActiveAuthorities`: Consolidated view of all active authorities with user/agency details

## Data Import/Export

### Excel Data Import
The system accepts Excel files with the following sheets:
1. **Track Data**: Assets, switches, signals, crossings
2. **Milepost Geometry**: Precise milepost coordinates

### Trip Report Export
Formats supported:
1. Excel (.xlsx) - Detailed pin data
2. PDF - Summary report
3. Email - Automated distribution

## Security Considerations

### Data Isolation
- All queries include `Agency_ID` in WHERE clause
- User permissions enforced at application and database level
- Row-level security considered for future implementation

### Audit Trail
- `System_Audit_Logs`: All configuration changes
- `Alert_Logs`: All safety alerts
- `GPS_Logs`: Position history (GDPR compliant retention policies)

### Encryption
- Passwords: bcrypt hashing
- Contact information: Encryption at rest (future enhancement)
- API communication: TLS 1.3

## Backup Strategy

### Recommended Schedule:
1. **Full Backup**: Daily at 2:00 AM
2. **Transaction Log Backup**: Every 15 minutes
3. **Offsite Backup**: Weekly to cloud storage

### Retention:
1. GPS Logs: 90 days (configurable)
2. Alert Logs: 1 year
3. Audit Logs: 7 years (compliance)

## Monitoring

### Key Metrics to Monitor:
1. Active authorities count
2. GPS update frequency
3. Alert delivery latency
4. Database connection pool health
5. Query performance (slow query log)

### Alerts to Configure:
1. Database connection failures
2. High CPU/Memory usage
3. Low disk space
4. Backup failures
5. Unusually high alert rates