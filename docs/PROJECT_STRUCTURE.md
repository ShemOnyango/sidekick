# Sidekick System - Project Structure

## Root Directory

herzog-rail-authority/
├── backend/ # Node.js/Express backend
├── admin-portal/ # React.js admin portal
├── mobile/ # React Native mobile app (coming soon)
├── docs/ # Documentation
├── docker/ # Docker configurations
└── scripts/ # Deployment and utility scripts


## Backend Structure

backend/
├── src/
│ ├── config/ # Configuration files
│ │ ├── database.js # Database connection
│ │ ├── socket.js # Socket.IO setup
│ │ ├── logger.js # Winston logger
│ │ └── constants.js # Application constants
│ ├── controllers/ # Route controllers
│ │ ├── authController.js
│ │ ├── agencyController.js
│ │ ├── authorityController.js
│ │ └── alertController.js
│ ├── models/ # Database models
│ │ ├── User.js
│ │ ├── Agency.js
│ │ └── Authority.js
│ ├── routes/ # API routes
│ │ ├── authRoutes.js
│ │ ├── agencyRoutes.js
│ │ └── index.js
│ ├── middleware/ # Custom middleware
│ │ ├── auth.js
│ │ ├── validation.js
│ │ └── errorHandler.js
│ ├── services/ # Business logic
│ │ ├── authorityService.js
│ │ ├── alertService.js
│ │ └── gpsService.js
│ └── utils/ # Utility functions
│ ├── validators.js
│ ├── formatters.js
│ └── distanceCalculator.js
├── sql/
│ ├── migrations/ # Database migrations
│ └── seeds/ # Seed data
├── tests/ # Test files
│ ├── unit/
│ └── integration/
├── public/ # Static files
│ └── uploads/
├── logs/ # Application logs
├── .env # Environment variables
├── server.js # Main server file
└── package.json


## Admin Portal Structure
admin-portal/
├── src/
│ ├── components/ # Reusable components
│ │ ├── common/ # Common UI components
│ │ ├── forms/ # Form components
│ │ ├── tables/ # Data table components
│ │ └── charts/ # Chart components
│ ├── layouts/ # Layout components
│ │ ├── MainLayout.js
│ │ └── AuthLayout.js
│ ├── pages/ # Page components
│ │ ├── Dashboard/
│ │ ├── Agencies/
│ │ └── Users/
│ ├── services/ # API services
│ │ ├── api.js
│ │ ├── authService.js
│ │ └── agencyService.js
│ ├── store/ # Redux store
│ │ ├── slices/
│ │ └── index.js
│ ├── utils/ # Utility functions
│ ├── hooks/ # Custom React hooks
│ ├── contexts/ # React contexts
│ └── routes/ # Route definitions
├── public/ # Static assets
│ └── static/
│ └── logos/
├── .env # Environment variables
└── package.json


## Development Workflow

### 1. Environment Setup
1. Install Node.js (v18 or higher)
2. Install SQL Server 2019 or higher
3. Run `npm install` in both backend and admin-portal
4. Configure `.env` files
5. Run migrations: `cd backend && npm run db:migrate`

### 2. Development
- Backend: `cd backend && npm run dev`
- Admin Portal: `cd admin-portal && npm start`

### 3. Testing
- Run tests: `npm test`
- Test coverage: `npm test -- --coverage`

## Key Features Implemented

### Phase 1 Complete:
✅ Project structure setup
✅ Backend with Express.js
✅ SQL Server database schema
✅ Socket.IO for real-time alerts
✅ Admin portal with Material-UI
✅ Herzog branding (Black, White, Yellow FFD100)
✅ Environment configuration
✅ Logging and error handling
✅ Database migration system

