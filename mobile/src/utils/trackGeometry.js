/**
 * Track Geometry Utilities
 * 
 * Provides functions for track-based distance calculations and milepost interpolation.
 * Uses track geometry data instead of straight-line GPS distance.
 */

import apiService from '../services/api/ApiService';

/**
 * Calculate the great circle distance between two GPS coordinates
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in miles
 */
export const calculateGPSDistance = (lat1, lon1, lat2, lon2) => {
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
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Find the closest milepost reference point to a GPS coordinate
 * @param {number} latitude - Current latitude
 * @param {number} longitude - Current longitude
 * @param {Array} mileposts - Array of milepost reference points
 * @returns {Object} Closest milepost with distance
 */
export const findClosestMilepost = (latitude, longitude, mileposts) => {
  if (!mileposts || mileposts.length === 0) return null;
  
  let closest = null;
  let minDistance = Infinity;
  
  mileposts.forEach((mp) => {
    const distance = calculateGPSDistance(
      latitude,
      longitude,
      mp.Latitude,
      mp.Longitude
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closest = { ...mp, distance };
    }
  });
  
  return closest;
};

/**
 * Interpolate milepost value from GPS coordinates
 * Uses weighted interpolation between nearest reference points
 * @param {number} latitude - Current latitude
 * @param {number} longitude - Current longitude
 * @param {Array} mileposts - Array of milepost reference points (sorted by MP)
 * @returns {number|null} Interpolated milepost value
 */
export const interpolateMilepost = (latitude, longitude, mileposts) => {
  if (!mileposts || mileposts.length < 2) return null;
  
  // Find the two closest mileposts
  const sorted = [...mileposts].map(mp => ({
    ...mp,
    distance: calculateGPSDistance(latitude, longitude, mp.Latitude, mp.Longitude)
  })).sort((a, b) => a.distance - b.distance);
  
  const closest = sorted[0];
  const secondClosest = sorted[1];
  
  // If very close to a reference point (within 50 feet), use its milepost directly
  if (closest.distance < 0.01) { // ~50 feet
    return parseFloat(closest.Milepost);
  }
  
  // Check if both points are on the same track
  if (closest.Track_Type !== secondClosest.Track_Type || 
      closest.Track_Number !== secondClosest.Track_Number) {
    // Use only the closest point if different tracks
    return parseFloat(closest.Milepost);
  }
  
  // Calculate weighted average based on inverse distance
  const weight1 = 1 / closest.distance;
  const weight2 = 1 / secondClosest.distance;
  const totalWeight = weight1 + weight2;
  
  const mp1 = parseFloat(closest.Milepost);
  const mp2 = parseFloat(secondClosest.Milepost);
  
  const interpolated = (mp1 * weight1 + mp2 * weight2) / totalWeight;
  
  return Math.round(interpolated * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate track-based distance between two mileposts
 * @param {number} mp1 - First milepost
 * @param {number} mp2 - Second milepost
 * @param {Array} trackGeometry - Array of track geometry points
 * @returns {number} Distance in miles along the track
 */
export const calculateTrackDistance = (mp1, mp2, trackGeometry) => {
  if (!trackGeometry || trackGeometry.length < 2) {
    // Fallback to simple difference
    return Math.abs(mp2 - mp1);
  }
  
  const start = Math.min(mp1, mp2);
  const end = Math.max(mp1, mp2);
  
  // Filter geometry points within the milepost range
  const relevantPoints = trackGeometry.filter(point => {
    const mp = parseFloat(point.Milepost);
    return mp >= start && mp <= end;
  }).sort((a, b) => parseFloat(a.Milepost) - parseFloat(b.Milepost));
  
  if (relevantPoints.length < 2) {
    return Math.abs(mp2 - mp1);
  }
  
  // Calculate cumulative distance along track segments
  let totalDistance = 0;
  for (let i = 0; i < relevantPoints.length - 1; i++) {
    const p1 = relevantPoints[i];
    const p2 = relevantPoints[i + 1];
    
    const segmentDistance = calculateGPSDistance(
      p1.Latitude,
      p1.Longitude,
      p2.Latitude,
      p2.Longitude
    );
    
    totalDistance += segmentDistance;
  }
  
  return Math.round(totalDistance * 100) / 100;
};

/**
 * Get current track information from GPS coordinates
 * @param {number} latitude - Current latitude
 * @param {number} longitude - Current longitude
 * @param {Array} mileposts - Array of milepost reference points
 * @param {number} maxDistance - Maximum distance to consider (miles), default 0.05 (264 feet)
 * @returns {Object|null} Track info (Type, Number, Milepost) or null if too far from track
 */
export const getCurrentTrack = (latitude, longitude, mileposts, maxDistance = 0.05) => {
  const closest = findClosestMilepost(latitude, longitude, mileposts);
  
  if (!closest || closest.distance > maxDistance) {
    return null; // Too far from any track
  }
  
  const milepost = interpolateMilepost(latitude, longitude, mileposts);
  
  return {
    trackType: closest.Track_Type,
    trackNumber: closest.Track_Number,
    milepost: milepost || parseFloat(closest.Milepost),
    distance: closest.distance,
    subdivision: closest.Subdivision_ID,
  };
};

/**
 * Calculate distance from current position to a target milepost along the track
 * @param {number} currentLat - Current latitude
 * @param {number} currentLon - Current longitude
 * @param {number} targetMilepost - Target milepost
 * @param {Array} trackGeometry - Array of track geometry points
 * @returns {number|null} Distance in miles, or null if cannot calculate
 */
export const distanceToMilepost = (currentLat, currentLon, targetMilepost, trackGeometry) => {
  if (!trackGeometry || trackGeometry.length === 0) return null;
  
  const currentTrack = getCurrentTrack(currentLat, currentLon, trackGeometry);
  if (!currentTrack) return null;
  
  return calculateTrackDistance(currentTrack.milepost, targetMilepost, trackGeometry);
};

/**
 * Check if position is within authority boundaries
 * @param {Object} position - Current position {latitude, longitude}
 * @param {Object} authority - Authority object with Begin_Milepost and End_Milepost
 * @param {Array} trackGeometry - Track geometry points
 * @returns {Object} Boundary check result
 */
export const checkAuthorityBoundaries = (position, authority, trackGeometry) => {
  const { latitude, longitude } = position;
  const currentTrack = getCurrentTrack(latitude, longitude, trackGeometry);
  
  if (!currentTrack) {
    return {
      withinBoundaries: false,
      reason: 'Not on track',
      currentMilepost: null,
    };
  }
  
  // Check if on correct track
  if (currentTrack.trackType !== authority.Track_Type || 
      currentTrack.trackNumber !== authority.Track_Number) {
    return {
      withinBoundaries: false,
      reason: 'Wrong track',
      currentMilepost: currentTrack.milepost,
      expectedTrack: `${authority.Track_Type} ${authority.Track_Number}`,
      actualTrack: `${currentTrack.trackType} ${currentTrack.trackNumber}`,
    };
  }
  
  const mp = currentTrack.milepost;
  const begin = parseFloat(authority.Begin_Milepost);
  const end = parseFloat(authority.End_Milepost);
  
  const withinBoundaries = mp >= begin && mp <= end;
  
  const distanceToBegin = calculateTrackDistance(mp, begin, trackGeometry);
  const distanceToEnd = calculateTrackDistance(mp, end, trackGeometry);
  
  return {
    withinBoundaries,
    currentMilepost: mp,
    distanceToBegin,
    distanceToEnd,
    reason: withinBoundaries ? 'Within bounds' : (mp < begin ? 'Before start' : 'After end'),
  };
};

/**
 * Calculate bearing (direction) between two GPS coordinates
 * @param {number} lat1 - Start latitude
 * @param {number} lon1 - Start longitude
 * @param {number} lat2 - End latitude
 * @param {number} lon2 - End longitude
 * @returns {number} Bearing in degrees (0-360)
 */
export const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);
  
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
           Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
  const θ = Math.atan2(y, x);
  const bearing = (θ * 180 / Math.PI + 360) % 360;
  
  return Math.round(bearing);
};

/**
 * Convert bearing to compass direction
 * @param {number} bearing - Bearing in degrees (0-360)
 * @returns {string} Compass direction (N, NE, E, SE, S, SW, W, NW)
 */
export const bearingToCompass = (bearing) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
};

export default {
  calculateGPSDistance,
  findClosestMilepost,
  interpolateMilepost,
  calculateTrackDistance,
  getCurrentTrack,
  distanceToMilepost,
  checkAuthorityBoundaries,
  calculateBearing,
  bearingToCompass,
};
