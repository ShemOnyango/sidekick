AUTH:
  POST   /api/auth/login
  POST   /api/auth/register
  POST   /api/auth/logout
  GET    /api/auth/profile
  PUT    /api/auth/profile
  POST   /api/auth/change-password
  POST   /api/auth/refresh-token

AGENCIES:
  GET    /api/agencies
  POST   /api/agencies
  GET    /api/agencies/:agencyId
  PUT    /api/agencies/:agencyId
  DELETE /api/agencies/:agencyId
  GET    /api/agencies/:agencyId/stats

AUTHORITIES:
  GET    /api/authorities/active
  GET    /api/authorities/my
  POST   /api/authorities
  GET    /api/authorities/:authorityId
  POST   /api/authorities/:authorityId/end
  POST   /api/authorities/:authorityId/check-proximity
  GET    /api/authorities/stats/:agencyId

ALERTS:
  GET    /api/alerts/config/:agencyId
  PUT    /api/alerts/config/:configId
  POST   /api/alerts/config/:agencyId
  GET    /api/alerts/my
  PUT    /api/alerts/read/:alertId
  GET    /api/alerts/stats/:agencyId

GPS:
  POST   /api/gps/update
  GET    /api/gps/my-position
  GET    /api/gps/active-positions

WEBSOCKET:
  WS     / (Socket.IO connection)
  Events: alert, authority_overlap, user-location-update