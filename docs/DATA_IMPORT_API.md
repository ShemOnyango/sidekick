# Data Import APIs Documentation

## Overview
APIs for bulk importing track data and milepost geometry from Excel/CSV files.

---

## Track Data Import

### 1. Upload Track Data
**Endpoint:** `POST /api/upload/track-data`  
**Authentication:** Required (Administrator only)  
**Content-Type:** multipart/form-data  
**Description:** Upload and import track data from Excel or CSV file.

**Form Data:**
- `file`: Excel (.xlsx, .xls) or CSV file
- `subdivisionId`: Subdivision ID (number)

**File Format:**
Required columns:
- `Subdivision_ID` (optional if provided in form data)
- `Track_Type` (Main, Siding, Yard, Industrial, Other)
- `Track_Number` (max 10 characters)
- `Begin_MP` (decimal, >= 0)
- `End_MP` (decimal, >= 0, must be > Begin_MP)
- `Description` (optional)
- `Is_Active` (optional, defaults to 1)

**Example Data:**
```
Subdivision_ID | Track_Type | Track_Number | Begin_MP | End_MP | Description
1             | Main       | 1            | 0.0      | 125.5  | Main Track 1
1             | Siding     | S1           | 10.5     | 11.2   | Siding at MP 10.5
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "inserted": 245,
    "total": 250,
    "warnings": [
      "Row 15: Track_Type 'Branch' is not standard"
    ],
    "errors": [
      "Row 50: Begin_MP must be less than End_MP"
    ]
  },
  "message": "Successfully imported 245 of 250 track records"
}
```

**Response (Validation Failed):**
```json
{
  "success": false,
  "message": "Data validation failed",
  "errors": [
    "Row 2: Missing required field 'Track_Type'",
    "Row 5: Begin_MP must be a non-negative number",
    "Row 10: Begin_MP (15.5) must be less than End_MP (12.3)"
  ],
  "warnings": [
    "Row 3: Track_Type 'Branch' is not standard. Valid types: Main, Siding, Yard, Industrial, Other",
    "Row 7: Duplicate track found in file"
  ]
}
```

---

### 2. Download Track Data Template
**Endpoint:** `GET /api/upload/templates/track-data`  
**Authentication:** Required (Administrator only)  
**Description:** Download Excel template for track data import.

**Response:** Excel file with sample data and proper column headers.

---

## Milepost Geometry Import

### 1. Upload Milepost Geometry
**Endpoint:** `POST /api/upload/milepost-geometry`  
**Authentication:** Required (Administrator only)  
**Content-Type:** multipart/form-data  
**Description:** Upload and import milepost geometry data.

**Form Data:**
- `file`: Excel (.xlsx, .xls) or CSV file
- `subdivisionId`: Subdivision ID (number)

**File Format:**
Required columns:
- `Subdivision_ID` (optional if provided in form data)
- `Track_Type` (Main, Siding, etc.)
- `Track_Number` (max 10 characters)
- `MP` (decimal, >= 0)
- `Latitude` (decimal, -90 to 90)
- `Longitude` (decimal, -180 to 180)
- `Elevation` (optional, decimal)

**Example Data:**
```
Subdivision_ID | Track_Type | Track_Number | MP   | Latitude  | Longitude   | Elevation
1             | Main       | 1            | 0.0  | 35.1234   | -106.5678   | 5280.0
1             | Main       | 1            | 0.1  | 35.1235   | -106.5679   | 5281.0
1             | Main       | 1            | 0.2  | 35.1236   | -106.5680   | 5282.5
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "inserted": 2450,
    "total": 2500,
    "warnings": [
      "Row 100: Elevation is not a valid number"
    ],
    "errors": [
      "Row 250: Duplicate milepost found in database"
    ]
  },
  "message": "Successfully imported 2450 of 2500 milepost geometry records"
}
```

**Response (Validation Failed):**
```json
{
  "success": false,
  "message": "Data validation failed",
  "errors": [
    "Row 5: Missing required field 'Latitude'",
    "Row 10: Latitude must be between -90 and 90",
    "Row 15: Longitude must be between -180 and 180",
    "Row 20: MP must be a non-negative number"
  ],
  "warnings": [
    "Row 25: Duplicate milepost found in file"
  ]
}
```

---

### 2. Download Milepost Geometry Template
**Endpoint:** `GET /api/upload/templates/milepost-geometry`  
**Authentication:** Required (Administrator only)  
**Description:** Download Excel template for milepost geometry import.

**Response:** Excel file with sample data and proper column headers.

---

## Data Validation Rules

### Track Data Validation

1. **Required Fields:**
   - Subdivision_ID (or provided in form)
   - Track_Type
   - Track_Number
   - Begin_MP
   - End_MP

2. **Data Type Validation:**
   - Subdivision_ID: Must be integer
   - Begin_MP, End_MP: Must be non-negative decimal numbers
   - Track_Number: Max 10 characters

3. **Business Rules:**
   - Begin_MP must be less than End_MP
   - Track_Type should be one of: Main, Siding, Yard, Industrial, Other (warning if not)
   - Duplicate tracks within file generate warnings

### Milepost Geometry Validation

1. **Required Fields:**
   - Subdivision_ID
   - Track_Type
   - Track_Number
   - MP
   - Latitude
   - Longitude

2. **Data Type Validation:**
   - MP: Non-negative decimal
   - Latitude: -90 to 90
   - Longitude: -180 to 180
   - Elevation: Decimal (optional)

3. **Business Rules:**
   - Duplicate mileposts (same Subdivision, Track, MP) generate warnings
   - Invalid coordinates cause errors

---

## File Upload Constraints

1. **File Size:** Maximum 10MB
2. **File Types:** 
   - Excel: .xlsx, .xls
   - CSV: .csv
3. **Row Limit:** No hard limit, but large files may take time to process
4. **Column Order:** Flexible - columns matched by header name

---

## Error Handling

### File Upload Errors
```json
{
  "success": false,
  "message": "Invalid file",
  "errors": [
    "Invalid file type. Allowed types: .xlsx, .xls, .csv",
    "File size exceeds 10MB limit"
  ]
}
```

### Parse Errors
```json
{
  "success": false,
  "message": "Failed to parse file: Invalid Excel format"
}
```

### Transaction Rollback
If any database error occurs during bulk insert, the entire transaction is rolled back and no records are inserted.

---

## Usage Examples

### Upload Track Data (JavaScript)
```javascript
const formData = new FormData();
formData.append('file', trackFile);
formData.append('subdivisionId', 1);

const response = await fetch('/api/upload/track-data', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  },
  body: formData
});

const result = await response.json();
if (result.success) {
  console.log(`Imported ${result.data.inserted} tracks`);
  if (result.data.warnings.length > 0) {
    console.warn('Warnings:', result.data.warnings);
  }
}
```

### Download and Use Template
```javascript
// Download template
const template = await fetch('/api/upload/templates/track-data', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});

const blob = await template.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'track_template.xlsx';
a.click();

// Users fill in the template and upload it back
```

### Upload Milepost Geometry (cURL)
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@milepost_data.xlsx" \
  -F "subdivisionId=1" \
  https://api.example.com/api/upload/milepost-geometry
```

---

## Best Practices

1. **Use Templates:**
   - Always download the template first
   - Fill in data using the template structure
   - Ensures correct column names and format

2. **Validate Before Upload:**
   - Check data completeness in Excel
   - Verify Begin_MP < End_MP
   - Ensure coordinates are valid

3. **Handle Large Files:**
   - Split very large files (>5000 rows) into smaller batches
   - Upload during off-peak hours
   - Monitor progress and check for errors

4. **Review Warnings:**
   - Warnings don't stop import but indicate potential issues
   - Review and address warnings after import
   - Common warnings: non-standard track types, duplicates

5. **Test First:**
   - Test with small sample file (10-20 rows)
   - Verify data appears correctly in database
   - Then proceed with full import

---

## Database Tables

### Tracks Table
```sql
CREATE TABLE Tracks (
  Track_ID INT PRIMARY KEY IDENTITY,
  Subdivision_ID INT NOT NULL,
  Track_Type VARCHAR(50) NOT NULL,
  Track_Number VARCHAR(10) NOT NULL,
  Begin_MP DECIMAL(10,4) NOT NULL,
  End_MP DECIMAL(10,4) NOT NULL,
  Description VARCHAR(255),
  Is_Active BIT DEFAULT 1,
  Created_Date DATETIME DEFAULT GETDATE()
)
```

### Milepost_Geometry Table
```sql
CREATE TABLE Milepost_Geometry (
  Geometry_ID INT PRIMARY KEY IDENTITY,
  Subdivision_ID INT NOT NULL,
  Track_Type VARCHAR(50) NOT NULL,
  Track_Number VARCHAR(10) NOT NULL,
  MP DECIMAL(10,4) NOT NULL,
  Latitude DECIMAL(10,7) NOT NULL,
  Longitude DECIMAL(11,7) NOT NULL,
  Elevation DECIMAL(10,2),
  Created_Date DATETIME DEFAULT GETDATE()
)
```

---

## Important Notes

1. **Transaction Safety:**
   - All imports use database transactions
   - If any error occurs, entire import is rolled back
   - Partial imports are not possible

2. **Performance:**
   - Large imports (>1000 rows) may take several seconds
   - Progress is not reported in real-time
   - Consider splitting very large files

3. **Duplicate Handling:**
   - Currently, duplicates cause insert errors
   - Future: Option to update existing records
   - Check warnings for duplicate detection

4. **Data Accuracy:**
   - Critical for safety-critical railroad operations
   - Always verify imported data
   - Compare totals: rows in file vs. records inserted
