const BaseModel = require('./BaseModel');

class BrandingConfiguration extends BaseModel {
  constructor() {
    super('Branding_Configurations');
  }

  /**
   * Get branding configuration for an agency
   */
  async getByAgencyId(agencyId) {
    const query = `
      SELECT *
      FROM Branding_Configurations
      WHERE Agency_ID = @agencyId
    `;

    const result = await this.executeQuery(query, { agencyId });
    return result.recordset[0] || null;
  }

  /**
   * Create or update branding configuration
   */
  async upsertBranding(agencyId, brandingData) {
    const {
      appName,
      primaryColor,
      secondaryColor,
      accentColor,
      logoUrl = null,
      iconUrl = null,
      customTerminology = null
    } = brandingData;

    const query = `
      MERGE Branding_Configurations AS target
      USING (SELECT @agencyId AS Agency_ID) AS source
      ON target.Agency_ID = source.Agency_ID
      WHEN MATCHED THEN
        UPDATE SET
          App_Name = @appName,
          Primary_Color = @primaryColor,
          Secondary_Color = @secondaryColor,
          Accent_Color = @accentColor,
          Logo_URL = COALESCE(@logoUrl, Logo_URL),
          Icon_URL = COALESCE(@iconUrl, Icon_URL),
          Custom_Terminology = COALESCE(@customTerminology, Custom_Terminology),
          Modified_Date = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (Agency_ID, App_Name, Primary_Color, Secondary_Color, Accent_Color, Logo_URL, Icon_URL, Custom_Terminology)
        VALUES (@agencyId, @appName, @primaryColor, @secondaryColor, @accentColor, @logoUrl, @iconUrl, @customTerminology)
      OUTPUT inserted.*;
    `;

    const result = await this.executeQuery(query, {
      agencyId,
      appName,
      primaryColor,
      secondaryColor,
      accentColor,
      logoUrl,
      iconUrl,
      customTerminology: customTerminology ? JSON.stringify(customTerminology) : null
    });

    return result.recordset[0];
  }

  /**
   * Update logo URL
   */
  async updateLogoUrl(agencyId, logoUrl, logoType = 'logo') {
    const field = logoType === 'icon' ? 'Icon_URL' : 'Logo_URL';
    
    const query = `
      UPDATE Branding_Configurations
      SET ${field} = @logoUrl,
          Modified_Date = GETDATE()
      WHERE Agency_ID = @agencyId
    `;

    const result = await this.executeQuery(query, { agencyId, logoUrl });
    
    if (result.rowsAffected[0] === 0) {
      // Create if doesn't exist
      const insertQuery = `
        INSERT INTO Branding_Configurations (Agency_ID, ${field})
        VALUES (@agencyId, @logoUrl)
      `;
      await this.executeQuery(insertQuery, { agencyId, logoUrl });
    }

    return this.getByAgencyId(agencyId);
  }

  /**
   * Get all branding configurations (for admin)
   */
  async getAllBranding() {
    const query = `
      SELECT 
        bc.*,
        a.Agency_Name,
        a.Agency_CD
      FROM Branding_Configurations bc
      INNER JOIN Agencies a ON bc.Agency_ID = a.Agency_ID
      WHERE a.Is_Active = 1
      ORDER BY a.Agency_Name
    `;

    const result = await this.executeQuery(query);
    return result.recordset;
  }

  /**
   * Get custom terminology for an agency
   */
  async getTerminology(agencyId) {
    const branding = await this.getByAgencyId(agencyId);
    
    if (!branding || !branding.Custom_Terminology) {
      return this.getDefaultTerminology();
    }

    try {
      const custom = JSON.parse(branding.Custom_Terminology);
      return { ...this.getDefaultTerminology(), ...custom };
    } catch (error) {
      return this.getDefaultTerminology();
    }
  }

  /**
   * Default terminology
   */
  getDefaultTerminology() {
    return {
      authority: 'Authority',
      subdivision: 'Subdivision',
      milepost: 'Milepost',
      trackType: 'Track Type',
      trackNumber: 'Track Number',
      beginMP: 'Begin Milepost',
      endMP: 'End Milepost',
      fieldWorker: 'Field Worker',
      supervisor: 'Supervisor',
      administrator: 'Administrator',
      trip: 'Trip',
      pin: 'Pin',
      alert: 'Alert'
    };
  }

  /**
   * Validate color format
   */
  validateColor(color) {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
  }

  /**
   * Get branding with validation
   */
  async getBrandingWithDefaults(agencyId) {
    const branding = await this.getByAgencyId(agencyId);
    
    // Return defaults if no branding exists
    if (!branding) {
      return {
        Agency_ID: agencyId,
        App_Name: 'Rail Authority',
        Primary_Color: '#000000',
        Secondary_Color: '#FFFFFF',
        Accent_Color: '#FFD100',
        Logo_URL: null,
        Icon_URL: null,
        Custom_Terminology: this.getDefaultTerminology()
      };
    }

    // Parse terminology
    let terminology = this.getDefaultTerminology();
    if (branding.Custom_Terminology) {
      try {
        const custom = JSON.parse(branding.Custom_Terminology);
        terminology = { ...terminology, ...custom };
      } catch (error) {
        // Use defaults on parse error
      }
    }

    return {
      ...branding,
      Custom_Terminology: terminology
    };
  }
}

module.exports = new BrandingConfiguration();
