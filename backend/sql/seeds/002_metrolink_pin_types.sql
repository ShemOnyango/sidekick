-- Metro Link Pin Types Seed Data
-- Description: Pin types specific to Metro Link infrastructure
-- Date: 2024
USE [HerzogRailAuthority]
GO

PRINT 'Seeding Metro Link pin types...';
GO

-- Get Metro Link Agency ID
DECLARE @MetroLinkAgencyID INT;
SELECT @MetroLinkAgencyID = Agency_ID FROM Agencies WHERE Agency_CD = 'METRLK';
GO

-- Only proceed if Metro Link agency exists
IF @MetroLinkAgencyID IS NOT NULL
BEGIN
    -- Metro Link Infrastructure Pin Types
    IF NOT EXISTS (SELECT 1 FROM Pin_Types WHERE Agency_ID = @MetroLinkAgencyID)
    BEGIN
        INSERT INTO Pin_Types (Agency_ID, Pin_Category, Pin_Subtype, Color, Sort_Order)
        VALUES 
            -- Switch Types
            (@MetroLinkAgencyID, 'Switch', 'HT Switch', '#FF6B6B', 1),
            (@MetroLinkAgencyID, 'Switch', 'PWR Switch', '#4ECDC4', 2),
            
            -- Track Types
            (@MetroLinkAgencyID, 'Track', 'Storage Track', '#95E1D3', 3),
            (@MetroLinkAgencyID, 'Track', 'Crossover', '#FFE66D', 4),
            (@MetroLinkAgencyID, 'Track', 'Main Line', '#3498DB', 5),
            (@MetroLinkAgencyID, 'Track', 'Siding', '#F39C12', 6),
            
            -- Infrastructure
            (@MetroLinkAgencyID, 'Infrastructure', 'Signal', '#9B59B6', 7),
            (@MetroLinkAgencyID, 'Infrastructure', 'Grade Crossing', '#E74C3C', 8),
            (@MetroLinkAgencyID, 'Infrastructure', 'Bridge', '#34495E', 9),
            (@MetroLinkAgencyID, 'Infrastructure', 'Tunnel', '#7F8C8D', 10),
            (@MetroLinkAgencyID, 'Infrastructure', 'Platform', '#16A085', 11),
            (@MetroLinkAgencyID, 'Infrastructure', 'Station', '#2ECC71', 12),
            
            -- Maintenance
            (@MetroLinkAgencyID, 'Maintenance', 'Inspection Point', '#E67E22', 13),
            (@MetroLinkAgencyID, 'Maintenance', 'Work Zone', '#D35400', 14),
            
            -- Safety
            (@MetroLinkAgencyID, 'Safety', 'Speed Restriction', '#C0392B', 15),
            (@MetroLinkAgencyID, 'Safety', 'Clearance Point', '#27AE60', 16);
        
        PRINT '✅ Created Metro Link pin types';
    END
    ELSE
        PRINT 'Metro Link pin types already exist';
END
ELSE
    PRINT '⚠️  Metro Link agency not found - run import script first';
GO

PRINT '✅ Metro Link pin types seeding completed!';
GO
