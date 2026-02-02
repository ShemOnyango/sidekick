const { projectPointOntoPolyline, haversineMeters } = require('../src/utils/geometry');

test('project point onto simple polyline returns nearest point on segment', () => {
  const polyline = [
    { latitude: 40.0, longitude: -75.0 },
    { latitude: 40.0, longitude: -74.9 }
  ];

  const point = { latitude: 40.0005, longitude: -74.95 };
  const res = projectPointOntoPolyline(point, polyline);

  expect(res).toBeDefined();
  expect(typeof res.distance).toBe('number');
  expect(res.segIndex).toBeGreaterThanOrEqual(0);
  expect(res.point).toHaveProperty('latitude');
  expect(res.point).toHaveProperty('longitude');
});

test('haversine distance between identical points is zero', () => {
  const a = { latitude: 40, longitude: -75 };
  const b = { latitude: 40, longitude: -75 };
  expect(haversineMeters(a, b)).toBeCloseTo(0, 6);
});
