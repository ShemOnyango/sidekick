# Metro Link Data Import Guide

This guide explains how to import Metro Link infrastructure data into the Herzog Rail Authority system.

## Overview

The Metro Link dataset contains:
- **Sheet1**: Infrastructure assets (switches, tracks, crossovers) with GPS coordinates
- **Sheet2 (Direct_MP)**: Milepost GPS reference grid for track subdivisions

## Files Created

### 1. Migration
- **File**: `backend/sql/migrations/007_track_mileposts_schema.sql`
- **Purpose**: Creates `Track_Mileposts` table for storing milepost GPS references
- **Schema**:
  ```sql
  Track_Mileposts:
    - Milepost_ID (PK)
    - Subdivision_ID (FK)
    - Milepost (DECIMAL)
    - Latitude/Longitude (DECIMAL)
    - Apple_Map_URL, Google_Map_URL
    - Created_Date, Updated_Date
  ```

### 2. Import Script
- **File**: `backend/scripts/import-metrolink-data.js`
- **Purpose**: Automated import of Excel data
- **Actions**:
  1. Creates METRLK agency
  2. Creates VENTURA and MONTALVO subdivisions
  3. Creates Metro Link pin types
  4. Imports infrastructure assets as Pins (Sheet1)
  5. Imports milepost references (Sheet2)

### 3. Pin Types Seed
- **File**: `backend/sql/seeds/002_metrolink_pin_types.sql`
- **Purpose**: Defines pin types for Metro Link infrastructure
- **Categories**:
  - Switch (HT Switch, PWR Switch)
  - Track (Storage, Crossover, Main Line, Siding)
  - Infrastructure (Signal, Grade Crossing, Bridge, Tunnel, Platform, Station)
  - Maintenance (Inspection Point, Work Zone)
  - Safety (Speed Restriction, Clearance Point)

### 4. Cleaned Seed File
- **File**: `backend/sql/seeds/001_default_data.sql`
- **Changed**: Removed all test data (agencies, users, subdivisions)
- **Purpose**: Clean slate for production Metro Link data

## Import Process

### Step 1: Run Migration
```powershell
# Navigate to backend directory
cd d:\Herzog\backend

# Run migrations to create Track_Mileposts table
npm run db:migrate
```

Or manually:
```powershell
sqlcmd -S localhost -U sa -P YourStrong@Passw0rd -d HerzogRailAuthority -i sql/migrations/007_track_mileposts_schema.sql
```

### Step 2: Run Import Script
```powershell
# Make sure you're in backend directory
cd d:\Herzog\backend

# Run the import script
node scripts/import-metrolink-data.js
```

The script will:
- ✅ Connect to database
- ✅ Create Metro Link agency (METRLK)
- ✅ Create subdivisions (VENTURA, MONTALVO)
- ✅ Create 16 pin types
- ✅ Import infrastructure assets from Sheet1
- ✅ Import milepost references from Sheet2

### Step 3: Verify Import
```powershell
# Check imported data
sqlcmd -S localhost -U sa -P YourStrong@Passw0rd -d HerzogRailAuthority -Q "
SELECT 
    (SELECT COUNT(*) FROM Agencies WHERE Agency_CD = 'METRLK') as Agencies,
    (SELECT COUNT(*) FROM Subdivisions WHERE Agency_ID = (SELECT Agency_ID FROM Agencies WHERE Agency_CD = 'METRLK')) as Subdivisions,
    (SELECT COUNT(*) FROM Pin_Types WHERE Agency_ID = (SELECT Agency_ID FROM Agencies WHERE Agency_CD = 'METRLK')) as PinTypes,
    (SELECT COUNT(*) FROM Pins WHERE Agency_ID = (SELECT Agency_ID FROM Agencies WHERE Agency_CD = 'METRLK')) as Pins,
    (SELECT COUNT(*) FROM Track_Mileposts) as Mileposts
"
```

## Data Structure

### Sheet1 (Infrastructure Assets)
Imported as **Pins** table records:
- Agency_CD: METRLK
- Subdivision: VENTURA, MONTALVO
- Asset_Type: HT_Switch, PWR_Switch, Storage, X_Over
- GPS Coordinates: Latitude/Longitude (decimal)
- Mileposts: BMP (Begin) and EMP (End)

### Sheet2 (Milepost References)
Imported into **Track_Mileposts** table:
- Subdivision: MONTALVO
- Milepost: Incremental (402.81, 402.82, etc.)
- GPS Coordinates: Precise lat/long
- Map URLs: Apple Maps and Google Maps links

## Troubleshooting

### Database Connection Issues
Check your `.env` file in `backend/`:
```env
DB_SERVER=localhost
DB_NAME=HerzogRailAuthority
DB_USER=sa
DB_PASSWORD=YourStrong@Passw0rd
```

### Excel File Not Found
Ensure the file is at:
```
backend/sql/seeds/Metro Link map Data.xlsx
```

### Migration Already Exists
If `Track_Mileposts` table already exists, the migration will skip creation. This is safe.

### Pin Types Already Exist
The script checks for existing data and won't create duplicates.

## Next Steps

After import:
1. **Test Mobile App**: Verify pins display on map
2. **Test Admin Portal**: Check pins management interface
3. **Verify Authorities**: Create test track authorities for Metro Link
4. **Test Milepost API**: Query milepost references for navigation

## API Endpoints

### Get Mileposts for Subdivision
```javascript
GET /api/mileposts/:subdivisionId
```

### Get Nearest Milepost
```javascript
GET /api/mileposts/nearest?lat=34.2746&lon=-119.2290
```

### Get Metro Link Pins
```javascript
GET /api/pins/agency/:agencyId
```

## Database Queries

### View All Metro Link Assets
```sql
SELECT 
    p.Title,
    p.Description,
    pt.Pin_Category,
    pt.Pin_Subtype,
    s.Subdivision_Name,
    p.Latitude,
    p.Longitude
FROM Pins p
JOIN Pin_Types pt ON p.Pin_Type_ID = pt.Pin_Type_ID
JOIN Subdivisions s ON p.Subdivision_ID = s.Subdivision_ID
JOIN Agencies a ON p.Agency_ID = a.Agency_ID
WHERE a.Agency_CD = 'METRLK'
ORDER BY s.Subdivision_Name, p.Title;
```

### View Milepost Grid
```sql
SELECT 
    s.Subdivision_Name,
    tm.Milepost,
    tm.Latitude,
    tm.Longitude
FROM Track_Mileposts tm
JOIN Subdivisions s ON tm.Subdivision_ID = s.Subdivision_ID
ORDER BY s.Subdivision_Name, tm.Milepost;
```

### Count Assets by Type
```sql
SELECT 
    pt.Pin_Category,
    pt.Pin_Subtype,
    COUNT(*) as Asset_Count
FROM Pins p
JOIN Pin_Types pt ON p.Pin_Type_ID = pt.Pin_Type_ID
JOIN Agencies a ON p.Agency_ID = a.Agency_ID
WHERE a.Agency_CD = 'METRLK'
GROUP BY pt.Pin_Category, pt.Pin_Subtype
ORDER BY pt.Pin_Category, Asset_Count DESC;
```

## Contact

For issues or questions about the import process, contact the development team.
