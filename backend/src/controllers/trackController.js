const db = require('../config/database');
const { sql } = require('../config/database');

/**
 * Track and Milepost Controller
 * Handles track-based distance calculations and milepost interpolation
 */

/**
 * Get milepost reference data for a subdivision
 * GET /tracks/mileposts/:subdivisionId
 */
exports.getMileposts = async (req, res) => {
  try {
    const { subdivisionId } = req.params;

    const request = new db.Request();
    const result = await request
      .input('Subdivision_ID', db.Int, subdivisionId)
      .query(`
        SELECT 
          Track_Milepost_ID,
          Subdivision_ID,
          Track_Type,
          Track_Number,
          Milepost,
          Latitude,
          Longitude,
          Elevation
        FROM Track_Mileposts
        WHERE Subdivision_ID = @Subdivision_ID
        ORDER BY Track_Type, Track_Number, Milepost
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Get mileposts error:', error);
    res.status(500).json({ error: 'Failed to get mileposts' });
  }
};

/**
 * Calculate track-based distance between two points
 * POST /tracks/calculate-distance
 * Body: { lat1, lon1, lat2, lon2, subdivisionId, trackType, trackNumber }
 */
exports.calculateDistance = async (req, res) => {
  try {
    const { lat1, lon1, lat2, lon2, subdivisionId, trackType, trackNumber } = req.body;

    // Get track geometry
    const request = new db.Request();
    const result = await request
      .input('Subdivision_ID', db.Int, subdivisionId)
      .input('Track_Type', db.VarChar, trackType)
      .input('Track_Number', db.VarChar, trackNumber)
      .query(`
        SELECT 
          Milepost,
          Latitude,
          Longitude
        FROM Track_Mileposts
        WHERE Subdivision_ID = @Subdivision_ID
          AND Track_Type = @Track_Type
          AND Track_Number = @Track_Number
        ORDER BY Milepost
      `);

    const mileposts = result.recordset;

    if (mileposts.length < 2) {
      return res.json({ distance: 0, method: 'straight-line' });
    }

    // Find closest mileposts to each point
    const mp1 = findClosestMilepost(lat1, lon1, mileposts);
    const mp2 = findClosestMilepost(lat2, lon2, mileposts);

    if (!mp1 || !mp2) {
      return res.json({ distance: 0, method: 'not-on-track' });
    }

    // Calculate distance along track
    const trackDistance = calculateTrackDistance(
      parseFloat(mp1.Milepost),
      parseFloat(mp2.Milepost),
      mileposts
    );

    res.json({
      distance: trackDistance,
      method: 'track-based',
      mp1: mp1.Milepost,
      mp2: mp2.Milepost,
    });
  } catch (error) {
    console.error('Calculate distance error:', error);
    res.status(500).json({ error: 'Failed to calculate distance' });
  }
};

/**
 * Interpolate milepost from GPS coordinates
 * POST /tracks/interpolate-milepost
 * Body: { latitude, longitude, subdivisionId }
 */
exports.interpolateMilepost = async (req, res) => {
  try {
    const { latitude, longitude, subdivisionId } = req.body;

    // Validate inputs
    if (!latitude || !longitude || !subdivisionId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required parameters: latitude, longitude, subdivisionId' 
      });
    }

    const request = new db.Request();
    const result = await request
      .input('Subdivision_ID', db.Int, subdivisionId)
      .input('Latitude', sql.Float, latitude)
      .input('Longitude', sql.Float, longitude)
      .query(`
        SELECT TOP 10
          Milepost,
          Latitude,
          Longitude,
          (
            6371 * 2 * ASIN(
              SQRT(
                POWER(SIN((RADIANS(Latitude) - RADIANS(@Latitude)) / 2), 2) +
                COS(RADIANS(@Latitude)) * COS(RADIANS(Latitude)) *
                POWER(SIN((RADIANS(Longitude) - RADIANS(@Longitude)) / 2), 2)
              )
            )
          ) * 0.621371 AS Distance_Miles
        FROM Track_Mileposts
        WHERE Subdivision_ID = @Subdivision_ID
        ORDER BY Distance_Miles
      `);

    const nearbyPoints = result.recordset;

    if (nearbyPoints.length === 0) {
      return res.status(404).json({ error: 'No track data found' });
    }

    const closest = nearbyPoints[0];

    // If very close to a reference point, use it directly
    if (closest.Distance_Miles < 0.01) {
      return res.json({
        milepost: parseFloat(closest.Milepost),
        distance: closest.Distance_Miles,
        method: 'exact',
      });
    }

    // Weighted interpolation using 2 closest points
    if (nearbyPoints.length >= 2) {
      const p1 = nearbyPoints[0];
      const p2 = nearbyPoints[1];
      
      const weight1 = 1 / p1.Distance_Miles;
      const weight2 = 1 / p2.Distance_Miles;
      const totalWeight = weight1 + weight2;
      
      const interpolated = 
        (parseFloat(p1.Milepost) * weight1 + parseFloat(p2.Milepost) * weight2) / totalWeight;

      return res.json({
        milepost: Math.round(interpolated * 100) / 100,
        distance: closest.Distance_Miles,
        method: 'interpolated',
      });
    }

    // Fallback to closest point
    res.json({
      milepost: parseFloat(closest.Milepost),
      distance: closest.Distance_Miles,
      method: 'closest',
    });
  } catch (error) {
    console.error('Interpolate milepost error:', error);
    res.status(500).json({ error: 'Failed to interpolate milepost' });
  }
};

// Helper functions
function findClosestMilepost(lat, lon, mileposts) {
  let closest = null;
  let minDistance = Infinity;

  mileposts.forEach(mp => {
    const distance = calculateGPSDistance(lat, lon, mp.Latitude, mp.Longitude);
    if (distance < minDistance) {
      minDistance = distance;
      closest = { ...mp, distance };
    }
  });

  return closest;
}

function calculateGPSDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function calculateTrackDistance(mp1, mp2, trackGeometry) {
  if (!trackGeometry || trackGeometry.length < 2) {
    return Math.abs(mp2 - mp1);
  }

  const start = Math.min(mp1, mp2);
  const end = Math.max(mp1, mp2);

  const relevantPoints = trackGeometry
    .filter(point => {
      const mp = parseFloat(point.Milepost);
      return mp >= start && mp <= end;
    })
    .sort((a, b) => parseFloat(a.Milepost) - parseFloat(b.Milepost));

  if (relevantPoints.length < 2) {
    return Math.abs(mp2 - mp1);
  }

  let totalDistance = 0;
  for (let i = 0; i < relevantPoints.length - 1; i++) {
    const p1 = relevantPoints[i];
    const p2 = relevantPoints[i + 1];
    
    totalDistance += calculateGPSDistance(
      p1.Latitude,
      p1.Longitude,
      p2.Latitude,
      p2.Longitude
    );
  }

  return Math.round(totalDistance * 100) / 100;
}
