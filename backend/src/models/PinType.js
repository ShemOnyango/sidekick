const BaseModel = require('./BaseModel');

class PinType extends BaseModel {
  constructor() {
    super('Pin_Types');
  }

  async findByAgency(agencyId) {
    const query = `
      SELECT * 
      FROM Pin_Types 
      WHERE Agency_ID = @agencyId 
        AND Is_Active = 1
      ORDER BY Sort_Order, Pin_Category, Pin_Subtype
    `;
    
    const result = await this.executeQuery(query, { agencyId });
    return result.recordset;
  }

  async create(pinTypeData) {
    const { agencyId, pinCategory, pinSubtype, color, iconUrl = null, sortOrder = 0 } = pinTypeData;
    
    const query = `
      INSERT INTO Pin_Types (Agency_ID, Pin_Category, Pin_Subtype, Color, Icon_URL, Sort_Order)
      OUTPUT INSERTED.*
      VALUES (@agencyId, @pinCategory, @pinSubtype, @color, @iconUrl, @sortOrder)
    `;
    
    const result = await this.executeQuery(query, {
      agencyId,
      pinCategory,
      pinSubtype,
      color,
      iconUrl,
      sortOrder
    });
    
    return result.recordset[0];
  }

  async update(pinTypeId, updateData) {
    const allowedFields = [
      'Pin_Category',
      'Pin_Subtype',
      'Color',
      'Icon_URL',
      'Sort_Order',
      'Is_Active'
    ];
    
    const updates = [];
    const params = { pinTypeId };
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updates.push(`${key} = @${key}`);
        params[key] = updateData[key];
      }
    });
    
    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    updates.push('Modified_Date = GETDATE()');
    
    const query = `
      UPDATE Pin_Types
      SET ${updates.join(', ')}
      OUTPUT INSERTED.*
      WHERE Pin_Type_ID = @pinTypeId
    `;
    
    const result = await this.executeQuery(query, params);
    return result.recordset[0];
  }
}

module.exports = new PinType();