/**
 * Geospatial calculation utilities for railroad tracking
 * Uses Haversine formula for distance and implements track-based calculations
 */

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in miles
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Calculate bearing between two points
 * @returns {number} Bearing in degrees (0-360)
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = toRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
  const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
            Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);
  
  let bearing = toDegrees(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;
  
  return bearing;
}

/**
 * Find nearest point on a line segment
 * @param {object} point - {lat, lon}
 * @param {object} lineStart - {lat, lon}
 * @param {object} lineEnd - {lat, lon}
 * @returns {object} {lat, lon, distanceToLine}
 */
function findNearestPointOnLine(point, lineStart, lineEnd) {
  // Convert to simple coordinate system for calculation
  const px = point.lon;
  const py = point.lat;
  const x1 = lineStart.lon;
  const y1 = lineStart.lat;
  const x2 = lineEnd.lon;
  const y2 = lineEnd.lat;

  // Calculate the projection of point onto the line
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  if (dx === 0 && dy === 0) {
    // Line segment is actually a point
    return {
      lat: y1,
      lon: x1,
      distanceToLine: calculateDistance(point.lat, point.lon, y1, x1)
    };
  }

  // Calculate parameter t for the projection
  let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  
  // Clamp t to [0, 1] to stay on the line segment
  t = Math.max(0, Math.min(1, t));
  
  // Calculate the nearest point
  const nearestLat = y1 + t * dy;
  const nearestLon = x1 + t * dx;
  
  const distanceToLine = calculateDistance(point.lat, point.lon, nearestLat, nearestLon);
  
  return {
    lat: nearestLat,
    lon: nearestLon,
    distanceToLine,
    segmentParameter: t
  };
}

/**
 * Calculate milepost based on GPS coordinates and milepost geometry
 * @param {number} latitude
 * @param {number} longitude
 * @param {Array} milepostGeometry - Array of {MP, Latitude, Longitude}
 * @returns {object} {milepost, confidence, nearestGeometry}
 */
function calculateMilepostFromGeometry(latitude, longitude, milepostGeometry) {
  if (!milepostGeometry || milepostGeometry.length === 0) {
    return null;
  }

  // Sort milepost geometry by MP
  const sorted = [...milepostGeometry].sort((a, b) => a.MP - b.MP);
  
  let closestDistance = Infinity;
  let closestSegment = null;
  let interpolatedMP = null;

  // Check each segment between consecutive mileposts
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    
    const nearest = findNearestPointOnLine(
      { lat: latitude, lon: longitude },
      { lat: start.Latitude, lon: start.Longitude },
      { lat: end.Latitude, lon: end.Longitude }
    );
    
    if (nearest.distanceToLine < closestDistance) {
      closestDistance = nearest.distanceToLine;
      closestSegment = { start, end, nearest };
      
      // Interpolate milepost based on position along segment
      const mpDiff = end.MP - start.MP;
      interpolatedMP = start.MP + (mpDiff * nearest.segmentParameter);
    }
  }
  
  // Check distance to first and last points
  const distToFirst = calculateDistance(
    latitude, longitude,
    sorted[0].Latitude, sorted[0].Longitude
  );
  const distToLast = calculateDistance(
    latitude, longitude,
    sorted[sorted.length - 1].Latitude, sorted[sorted.length - 1].Longitude
  );
  
  if (distToFirst < closestDistance) {
    return {
      milepost: sorted[0].MP,
      confidence: 'exact',
      distanceFromTrack: distToFirst,
      nearestGeometry: sorted[0]
    };
  }
  
  if (distToLast < closestDistance) {
    return {
      milepost: sorted[sorted.length - 1].MP,
      confidence: 'exact',
      distanceFromTrack: distToLast,
      nearestGeometry: sorted[sorted.length - 1]
    };
  }
  
  // Return interpolated milepost
  return {
    milepost: Math.round(interpolatedMP * 10000) / 10000, // Round to 4 decimals
    confidence: closestDistance < 0.05 ? 'high' : closestDistance < 0.1 ? 'medium' : 'low',
    distanceFromTrack: closestDistance,
    nearestGeometry: closestSegment
  };
}

/**
 * Calculate track distance between two mileposts
 * This uses the actual track geometry, not straight-line distance
 * @param {number} mp1
 * @param {number} mp2
 * @param {Array} milepostGeometry
 * @returns {number} Distance in miles along the track
 */
function calculateTrackDistance(mp1, mp2, milepostGeometry) {
  const startMP = Math.min(mp1, mp2);
  const endMP = Math.max(mp1, mp2);
  
  // Simple case: direct milepost difference
  if (!milepostGeometry || milepostGeometry.length === 0) {
    return Math.abs(mp2 - mp1);
  }
  
  const sorted = [...milepostGeometry].sort((a, b) => a.MP - b.MP);
  
  let totalDistance = 0;
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    // Skip segments outside our range
    if (next.MP < startMP || current.MP > endMP) {
      continue;
    }
    
    // Calculate segment distance
    const segmentDistance = calculateDistance(
      current.Latitude, current.Longitude,
      next.Latitude, next.Longitude
    );
    
    // If segment is entirely within range, add full distance
    if (current.MP >= startMP && next.MP <= endMP) {
      totalDistance += segmentDistance;
    }
    // Partial segment at start
    else if (current.MP < startMP && next.MP > startMP) {
      const fraction = (next.MP - startMP) / (next.MP - current.MP);
      totalDistance += segmentDistance * fraction;
    }
    // Partial segment at end
    else if (current.MP < endMP && next.MP > endMP) {
      const fraction = (endMP - current.MP) / (next.MP - current.MP);
      totalDistance += segmentDistance * fraction;
    }
  }
  
  // If no geometry found in range, fall back to milepost difference
  return totalDistance > 0 ? totalDistance : Math.abs(mp2 - mp1);
}

/**
 * Check if a point is within a certain distance of a track segment
 * @param {number} latitude
 * @param {number} longitude
 * @param {object} trackSegment - {start: {lat, lon}, end: {lat, lon}}
 * @param {number} maxDistance - Maximum distance in miles
 * @returns {boolean}
 */
function isNearTrack(latitude, longitude, trackSegment, maxDistance = 0.05) {
  const nearest = findNearestPointOnLine(
    { lat: latitude, lon: longitude },
    trackSegment.start,
    trackSegment.end
  );
  
  return nearest.distanceToLine <= maxDistance;
}

/**
 * Calculate distance to milepost boundary
 * @param {number} currentMP
 * @param {number} boundaryMP
 * @param {Array} milepostGeometry
 * @returns {number} Distance in miles
 */
function calculateDistanceToBoundary(currentMP, boundaryMP, milepostGeometry) {
  return calculateTrackDistance(currentMP, boundaryMP, milepostGeometry);
}

module.exports = {
  calculateDistance,
  calculateBearing,
  findNearestPointOnLine,
  calculateMilepostFromGeometry,
  calculateTrackDistance,
  calculateDistanceToBoundary,
  isNearTrack,
  toRadians,
  toDegrees
};
