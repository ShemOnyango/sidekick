const BaseModel = require('./BaseModel');

class Agency extends BaseModel {
  constructor() {
    super('Agencies');
  }

  async findAll({ page = 1, limit = 20, search = '' }) {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT * FROM Agencies
      WHERE Is_Active = 1
    `;
    
    const params = {};
    
    if (search) {
      query += ' AND (Agency_CD LIKE @search OR Agency_Name LIKE @search)';
      params.search = `%${search}%`;
    }
    
    query += `
      ORDER BY Agency_Name
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;
    
    params.offset = offset;
    params.limit = limit;
    
    const result = await this.executeQuery(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM Agencies WHERE Is_Active = 1';
    if (search) {
      countQuery += ' AND (Agency_CD LIKE @search OR Agency_Name LIKE @search)';
    }
    
    const countResult = await this.executeQuery(countQuery, search ? { search: `%${search}%` } : {});
    
    return {
      agencies: result.recordset,
      total: countResult.recordset[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult.recordset[0].total / limit)
    };
  }

  async findById(agencyId) {
    const query = 'SELECT * FROM Agencies WHERE Agency_ID = @agencyId AND Is_Active = 1';
    
    const result = await this.executeQuery(query, { agencyId });
    return result.recordset[0];
  }

  async findByCode(agencyCode) {
    const query = 'SELECT * FROM Agencies WHERE Agency_CD = @agencyCode AND Is_Active = 1';
    
    const result = await this.executeQuery(query, { agencyCode });
    return result.recordset[0];
  }

  async create(agencyData) {
    const { agencyCD, agencyName, region, contactEmail, contactPhone } = agencyData;
    
    const query = `
      INSERT INTO Agencies (Agency_CD, Agency_Name, Region, Contact_Email, Contact_Phone)
      OUTPUT INSERTED.*
      VALUES (@agencyCD, @agencyName, @region, @contactEmail, @contactPhone)
    `;
    
    const result = await this.executeQuery(query, {
      agencyCD,
      agencyName,
      region,
      contactEmail,
      contactPhone
    });
    
    return result.recordset[0];
  }

  async update(agencyId, updateData) {
    const allowedFields = [
      'Agency_Name',
      'Region',
      'Contact_Email',
      'Contact_Phone',
      'Is_Active'
    ];
    
    const updates = [];
    const params = { agencyId };
    
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
      UPDATE Agencies
      SET ${updates.join(', ')}
      OUTPUT INSERTED.*
      WHERE Agency_ID = @agencyId
    `;
    
    const result = await this.executeQuery(query, params);
    return result.recordset[0];
  }

  async deactivate(agencyId) {
    const query = `
      UPDATE Agencies
      SET Is_Active = 0, Modified_Date = GETDATE()
      WHERE Agency_ID = @agencyId
    `;
    
    await this.executeQuery(query, { agencyId });
    return true;
  }
}

module.exports = new Agency();