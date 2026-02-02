/**
 * Geometry utilities for projecting a point onto a polyline.
 * All coordinates are [latitude, longitude] or objects {latitude, longitude}.
 */

function toPoint(coord) {
  if (Array.isArray(coord)) return { lat: coord[0], lng: coord[1] };
  return { lat: coord.latitude, lng: coord.longitude };

}

function sq(n) { return n * n; }

// Projects point P onto segment AB. Returns nearest point and fraction t along AB.
function projectPointToSegment(P, A, B) {
  // convert to simple x/y using lat/lng as planar approx (good for small distances)
  const Ax = A.lng, Ay = A.lat;
  const Bx = B.lng, By = B.lat;
  const Px = P.lng, Py = P.lat;

  const vx = Bx - Ax;
  const vy = By - Ay;
  const wx = Px - Ax;
  const wy = Py - Ay;

  const len2 = vx * vx + vy * vy;
  if (len2 === 0) return { point: { latitude: A.lat, longitude: A.lng }, t: 0 };

  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
  const projX = Ax + t * vx;
  const projY = Ay + t * vy;

  return { point: { latitude: projY, longitude: projX }, t };
}

// Compute haversine distance (meters) between two lat/lng points
function haversineMeters(a, b) {
  const R = 6371000; // meters
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aHarv = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv));
  return R * c;
}

/**
 * Projects a point onto a polyline (array of coordinates [longitude, latitude] or objects).
 * Returns nearest projected point, distance (meters), index of segment and fraction t.
 */
function projectPointOntoPolyline(point, polyline) {
  if (!polyline || polyline.length === 0) return null;

  const P = toPoint(point);
  let best = { distance: Infinity, point: null, segIndex: -1, t: 0 };

  for (let i = 0; i < polyline.length - 1; i++) {
    const A = toPoint(polyline[i]);
    const B = toPoint(polyline[i + 1]);
    const { point: proj, t } = projectPointToSegment(P, A, B);
    const d = haversineMeters(P, proj);
    if (d < best.distance) {
      best = { distance: d, point: proj, segIndex: i, t };
    }
  }

  return best;
}

module.exports = { projectPointOntoPolyline, haversineMeters };
