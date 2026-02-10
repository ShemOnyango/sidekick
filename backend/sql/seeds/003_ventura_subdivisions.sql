-- Insert VENTURA subdivision data from Metro Link Excel file
-- This assumes Agency METRLK exists with Agency_ID = 1

-- First, ensure we have the METRLK agency
IF NOT EXISTS (SELECT 1 FROM Agencies WHERE Agency_Code = 'METRLK')
BEGIN
    INSERT INTO Agencies (Agency_Code, Agency_Name, Contact_Email, Contact_Phone, Is_Active)
    VALUES ('METRLK', 'Metro Link Rail Authority', 'info@metrolinktrains.com', '800-371-5465', 1);
END

DECLARE @AgencyId INT = (SELECT Agency_ID FROM Agencies WHERE Agency_Code = 'METRLK');

-- Insert VENTURA subdivision
IF NOT EXISTS (SELECT 1 FROM Subdivisions WHERE Subdivision_Code = 'VENTURA' AND Agency_ID = @AgencyId)
BEGIN
    INSERT INTO Subdivisions (Agency_ID, Subdivision_Code, Subdivision_Name, Is_Active, Created_Date, Updated_Date)
    VALUES (@AgencyId, 'VENTURA', 'Ventura County Line', 1, GETDATE(), GETDATE());
    
    PRINT 'Created VENTURA subdivision';
END
ELSE
BEGIN
    PRINT 'VENTURA subdivision already exists';
END

-- Insert MONTALVO subdivision
IF NOT EXISTS (SELECT 1 FROM Subdivisions WHERE Subdivision_Code = 'MONTALVO' AND Agency_ID = @AgencyId)
BEGIN
    INSERT INTO Subdivisions (Agency_ID, Subdivision_Code, Subdivision_Name, Is_Active, Created_Date, Updated_Date)
    VALUES (@AgencyId, 'MONTALVO', 'Montalvo Line', 1, GETDATE(), GETDATE());
    
    PRINT 'Created MONTALVO subdivision';
END
ELSE
BEGIN
    PRINT 'MONTALVO subdivision already exists';
END

-- Display created subdivisions
SELECT 
    s.Subdivision_ID,
    a.Agency_Code,
    s.Subdivision_Code,
    s.Subdivision_Name,
    s.Is_Active
FROM Subdivisions s
INNER JOIN Agencies a ON s.Agency_ID = a.Agency_ID
WHERE a.Agency_Code = 'METRLK';
