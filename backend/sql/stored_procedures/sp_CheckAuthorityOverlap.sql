-- backend/sql/stored_procedures/sp_CheckAuthorityOverlap.sql
CREATE OR ALTER PROCEDURE sp_CheckAuthorityOverlap
    @User_ID INT,
    @Authority_Type VARCHAR(20),
    @Subdivision_ID INT,
    @Begin_MP DECIMAL(10,4),
    @End_MP DECIMAL(10,4),
    @Track_Type VARCHAR(20),
    @Track_Number VARCHAR(20),
    @Employee_Name_Display NVARCHAR(100),
    @Employee_Contact_Display VARCHAR(20),
    @Authority_ID INT OUTPUT,
    @Has_Overlap BIT OUTPUT,
    @Overlap_Details NVARCHAR(MAX) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @NewAuthorityID INT;
    DECLARE @OverlapDetected BIT = 0;
    DECLARE @OverlapData TABLE (
        Overlap_Authority_ID INT,
        Overlap_User_ID INT,
        Overlap_Employee_Name NVARCHAR(100),
        Overlap_Employee_Contact VARCHAR(20),
        Overlap_Begin_MP DECIMAL(10,4),
        Overlap_End_MP DECIMAL(10,4),
        Overlap_Track_Type VARCHAR(20),
        Overlap_Track_Number VARCHAR(20),
        Overlap_Type VARCHAR(50)
    );
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Insert the new authority
        INSERT INTO Authorities (
            User_ID,
            Authority_Type,
            Subdivision_ID,
            Begin_MP,
            End_MP,
            Track_Type,
            Track_Number,
            Employee_Name_Display,
            Employee_Contact_Display,
            Start_Time,
            Is_Active,
            Created_Date,
            Modified_Date
        )
        VALUES (
            @User_ID,
            @Authority_Type,
            @Subdivision_ID,
            @Begin_MP,
            @End_MP,
            @Track_Type,
            @Track_Number,
            @Employee_Name_Display,
            @Employee_Contact_Display,
            GETDATE(),
            1,
            GETDATE(),
            GETDATE()
        );
        
        SET @NewAuthorityID = SCOPE_IDENTITY();
        
        -- Check for overlaps
        INSERT INTO @OverlapData
        SELECT 
            a.Authority_ID,
            a.User_ID,
            a.Employee_Name_Display,
            a.Employee_Contact_Display,
            a.Begin_MP,
            a.End_MP,
            a.Track_Type,
            a.Track_Number,
            CASE 
                WHEN @Begin_MP BETWEEN a.Begin_MP AND a.End_MP 
                    AND @End_MP BETWEEN a.Begin_MP AND a.End_MP 
                    THEN 'Completely Within'
                WHEN a.Begin_MP BETWEEN @Begin_MP AND @End_MP 
                    AND a.End_MP BETWEEN @Begin_MP AND @End_MP 
                    THEN 'Completely Contains'
                WHEN @Begin_MP BETWEEN a.Begin_MP AND a.End_MP 
                    THEN 'Overlaps at Beginning'
                WHEN @End_MP BETWEEN a.Begin_MP AND a.End_MP 
                    THEN 'Overlaps at End'
                WHEN a.Begin_MP BETWEEN @Begin_MP AND @End_MP 
                    THEN 'Existing Begins Within'
                WHEN a.End_MP BETWEEN @Begin_MP AND @End_MP 
                    THEN 'Existing Ends Within'
                ELSE 'Partial Overlap'
            END AS Overlap_Type
        FROM Authorities a
        WHERE a.Subdivision_ID = @Subdivision_ID
            AND a.Track_Type = @Track_Type
            AND a.Track_Number = @Track_Number
            AND a.Is_Active = 1
            AND a.Authority_ID != @NewAuthorityID
            AND (
                (a.Begin_MP BETWEEN @Begin_MP AND @End_MP) OR
                (a.End_MP BETWEEN @Begin_MP AND @End_MP) OR
                (@Begin_MP BETWEEN a.Begin_MP AND a.End_MP) OR
                (@End_MP BETWEEN a.Begin_MP AND a.End_MP)
            );
        
        IF EXISTS (SELECT 1 FROM @OverlapData)
        BEGIN
            SET @OverlapDetected = 1;
            
            -- Insert into overlap log
            INSERT INTO Authority_Overlaps (
                Authority1_ID,
                Authority2_ID,
                Overlap_Detected_Time
            )
            SELECT 
                @NewAuthorityID,
                Overlap_Authority_ID,
                GETDATE()
            FROM @OverlapData;
        END
        
        -- Create trip record for this authority
        INSERT INTO Trips (
            Authority_ID,
            User_ID,
            Start_Time,
            Trip_Notes,
            Created_Date,
            Modified_Date
        )
        VALUES (
            @NewAuthorityID,
            @User_ID,
            GETDATE(),
            'Authority started: ' + @Track_Type + ' ' + @Track_Number + 
            ' from MP ' + CAST(@Begin_MP AS VARCHAR) + ' to ' + CAST(@End_MP AS VARCHAR),
            GETDATE(),
            GETDATE()
        );
        
        COMMIT TRANSACTION;
        
        -- Set output parameters
        SET @Authority_ID = @NewAuthorityID;
        SET @Has_Overlap = @OverlapDetected;
        
        SELECT @Overlap_Details = (
            SELECT 
                Overlap_Authority_ID,
                Overlap_User_ID,
                Overlap_Employee_Name,
                Overlap_Employee_Contact,
                Overlap_Begin_MP,
                Overlap_End_MP,
                Overlap_Track_Type,
                Overlap_Track_Number,
                Overlap_Type
            FROM @OverlapData
            FOR JSON PATH
        );
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        -- Rethrow the error
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END