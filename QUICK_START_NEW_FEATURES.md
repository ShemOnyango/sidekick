# Quick Start Guide - Audit Logs & Analytics

## Installation (One-Time Setup)

### 1. Backend Dependencies
```bash
cd backend
npm install exceljs
```

### 2. Frontend Dependencies (Should already be installed)
```bash
cd admin-portal
npm install
```

## Running the Application

### 1. Start Backend Server
```bash
cd backend
npm start
```
Backend will run on http://localhost:5000

### 2. Start Admin Portal
```bash
cd admin-portal
npm start
```
Admin portal will run on http://localhost:3000

## Accessing New Features

### Audit Logs
1. Open browser: http://localhost:3000
2. Login with Administrator account
3. Navigate to: http://localhost:3000/audit-logs
4. Features:
   - View all system audit logs
   - Filter by date range, action type, table name, user
   - Export to Excel
   - See statistics dashboard

### Analytics Dashboard
1. Open browser: http://localhost:3000
2. Login with Administrator account
3. Navigate to: http://localhost:3000/ (Dashboard)
4. Features:
   - Real-time statistics (users, authorities, alerts, GPS)
   - Safety metrics (proximity alerts, overlaps, violations)
   - Historical trend charts (24h, 7d, 30d, 90d)
   - Recent activity table

## Verify Installation

### Test Backend Endpoints
```bash
# Replace :agencyId with actual agency ID (e.g., 1)
curl http://localhost:5000/api/audit/1/logs
curl http://localhost:5000/api/analytics/1/dashboard
```

### Expected Response
```json
{
  "success": true,
  "data": { ... }
}
```

## Common Issues

### Backend won't start
- Check Node.js version: `node --version` (needs v14+)
- Run: `npm install` in backend folder
- Check SQL Server connection in `.env` file

### Frontend won't start
- Run: `npm install` in admin-portal folder
- Clear cache: `npm cache clean --force`
- Delete `node_modules` and reinstall

### Audit Logs empty
- Database needs System_Audit_Logs table (check migration 005)
- No audit logs created yet (perform some actions like create/update users)

### Dashboard shows zeros
- Backend analyticsService needs real data
- Check database has Users, Authorities, Alert_Logs tables populated

## Next Steps

1. Add navigation menu item for Audit Logs
2. Set up email notifications for critical events
3. Configure auto-refresh for dashboard
4. Add more audit logging to other controllers
5. Create admin settings UI for configurations

## Support

See IMPLEMENTATION_COMPLETE.md for detailed documentation.
