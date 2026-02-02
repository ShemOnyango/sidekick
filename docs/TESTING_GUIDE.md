# Herzog Rail Authority System - Testing Guide

## Overview
This guide covers comprehensive testing for both Backend (Node.js/Express) and Admin Portal (React) applications.

---

## Backend Testing

### Test Structure
```
backend/
├── tests/
│   ├── unit/                    # Unit tests (isolated component testing)
│   │   ├── controllers/         # Controller tests
│   │   ├── middleware/          # Middleware tests
│   │   ├── models/              # Model tests
│   │   ├── services/            # Service tests
│   │   ├── utils/               # Utility function tests
│   │   └── setup.js            # Global test setup
│   └── integration/             # Integration tests (API endpoint testing)
│       └── basic.test.js
├── jest.unit.config.js          # Jest configuration for unit tests
└── coverage/                    # Test coverage reports
```

### Running Backend Tests

#### 1. Unit Tests (Test individual functions/components)
```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode (re-runs on file changes)
npm run test:unit:watch

# Run specific test file
npm run test:unit -- tests/unit/controllers/alertController.test.js

# Run with verbose output
npm run test:unit -- --verbose
```

#### 2. Integration Tests (Test API endpoints)
```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm test -- tests/integration/basic.test.js
```

#### 3. All Tests
```bash
# Run all tests (unit + integration) with coverage
npm run test:all

# Run all tests with coverage
npm test
```

#### 4. Watch Mode (Development)
```bash
# Auto-rerun tests when files change
npm run test:watch
```

### Test Coverage Goals
- **Branches**: 70%
- **Functions**: 75%
- **Lines**: 80%
- **Statements**: 80%

Coverage reports are generated in `coverage/` folder and can be viewed at `coverage/lcov-report/index.html`

---

## Admin Portal Testing

### Test Structure
```
admin-portal/
├── src/
│   ├── __tests__/               # Test files
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── setupTests.js            # Test setup
```

### Running Admin Portal Tests

#### 1. Run Tests
```bash
# Navigate to admin-portal
cd admin-portal

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/__tests__/pages/Settings.test.js
```

#### 2. Update Snapshots (for snapshot testing)
```bash
npm test -- -u
```

---

## Writing Tests

### Backend Unit Test Example

**File**: `tests/unit/controllers/alertController.test.js`

```javascript
const alertController = require('../../../src/controllers/alertController');

describe('Alert Controller', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
  });

  describe('createAlert', () => {
    it('should create alert successfully', async () => {
      mockReq.params = { agencyId: '1' };
      mockReq.body = {
        alertType: 'PROXIMITY',
        alertLevel: 'warning',
        message: 'Test alert'
      };

      await alertController.createAlert(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.any(String)
        })
      );
    });

    it('should return 400 for missing required fields', async () => {
      mockReq.params = { agencyId: '1' };
      mockReq.body = {}; // Missing required fields

      await alertController.createAlert(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });
  });
});
```

### Backend Integration Test Example

**File**: `tests/integration/alerts.test.js`

```javascript
const request = require('supertest');
const app = require('../../src/server');

describe('Alert API Endpoints', () => {
  let authToken;

  beforeAll(async () => {
    // Login and get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    authToken = res.body.data.token;
  });

  describe('POST /api/alerts/:agencyId', () => {
    it('should create new alert', async () => {
      const res = await request(app)
        .post('/api/alerts/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          alertType: 'PROXIMITY',
          alertLevel: 'warning',
          message: 'Test proximity alert',
          userId: 1
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('alertId');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/alerts/1')
        .send({
          alertType: 'PROXIMITY',
          message: 'Test'
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/alerts/:agencyId/history', () => {
    it('should fetch alert history', async () => {
      const res = await request(app)
        .get('/api/alerts/1/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
```

### React Component Test Example

**File**: `admin-portal/src/__tests__/components/AlertHistory.test.js`

```javascript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import AlertHistory from '../../pages/Alerts/AlertHistory';

const mockStore = configureStore([]);

describe('AlertHistory Component', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      auth: {
        user: { agencyId: 1, name: 'Test User' },
        isAuthenticated: true
      }
    });
  });

  const renderComponent = () => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <AlertHistory />
        </BrowserRouter>
      </Provider>
    );
  };

  it('should render alert history table', () => {
    renderComponent();
    expect(screen.getByText(/Alert History/i)).toBeInTheDocument();
  });

  it('should filter alerts by search term', async () => {
    renderComponent();
    
    const searchInput = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(searchInput, { target: { value: 'proximity' } });

    await waitFor(() => {
      expect(searchInput.value).toBe('proximity');
    });
  });

  it('should export to Excel when button clicked', async () => {
    renderComponent();
    
    const exportButton = screen.getByText(/Export to Excel/i);
    fireEvent.click(exportButton);

    // Assert export function was called
    await waitFor(() => {
      // Add assertion based on your implementation
    });
  });
});
```

---

## Testing Best Practices

### 1. **Test Naming Convention**
- Use descriptive test names: `should [expected behavior] when [condition]`
- Example: `should return 404 when authority not found`

### 2. **AAA Pattern** (Arrange, Act, Assert)
```javascript
it('should create authority successfully', async () => {
  // Arrange - Set up test data and mocks
  const mockAuthority = { type: 'Track Authority', subdivision: 'Main' };
  
  // Act - Execute the code being tested
  const result = await createAuthority(mockAuthority);
  
  // Assert - Verify the results
  expect(result.success).toBe(true);
  expect(result.data).toHaveProperty('id');
});
```

### 3. **Mock External Dependencies**
- Database calls
- API requests
- File system operations
- Email services

### 4. **Test Edge Cases**
- Null/undefined inputs
- Empty arrays/objects
- Invalid data types
- Boundary conditions
- Error scenarios

### 5. **Keep Tests Independent**
- Each test should run independently
- Don't rely on test execution order
- Clean up after each test

### 6. **Use beforeEach/afterEach**
```javascript
beforeEach(() => {
  // Reset mocks, clear data
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up
});
```

---

## Common Testing Commands

### Backend
```bash
# Lint code before testing
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests with coverage
npm run test:unit

# Check specific coverage
npm run test:unit -- --coverage --collectCoverageFrom='src/controllers/**'
```

### Admin Portal
```bash
# Run tests
npm test

# Coverage report
npm test -- --coverage --watchAll=false

# Update snapshots
npm test -- -u

# Run specific test suite
npm test -- --testNamePattern="Settings Page"
```

---

## Continuous Integration (CI)

### GitHub Actions Example
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend && npm install
          cd ../admin-portal && npm install
      
      - name: Run backend tests
        run: cd backend && npm test
      
      - name: Run admin portal tests
        run: cd admin-portal && npm test -- --watchAll=false
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

## Debugging Tests

### 1. Debug in VSCode
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### 2. Add console.log in tests
```javascript
it('should debug test', () => {
  console.log('Current state:', myVariable);
  expect(myVariable).toBe(expected);
});
```

### 3. Use --verbose flag
```bash
npm test -- --verbose
```

---

## Test Coverage Reports

After running tests with coverage, view reports:

### Backend
```bash
# Open coverage report in browser
start coverage/lcov-report/index.html  # Windows
open coverage/lcov-report/index.html   # Mac
```

### Admin Portal
```bash
# Generate and view coverage
npm test -- --coverage --watchAll=false
start coverage/lcov-report/index.html
```

---

## Next Steps

1. **Write Unit Tests** for new controllers:
   - `tests/unit/controllers/authorityConfigController.test.js`
   - `tests/unit/controllers/alertConfigController.test.js`
   - `tests/unit/controllers/brandingController.test.js`

2. **Write Integration Tests** for new endpoints:
   - `tests/integration/settings.test.js`
   - `tests/integration/authorities.test.js`
   - `tests/integration/alerts.test.js`

3. **Write React Component Tests**:
   - `admin-portal/src/__tests__/pages/Settings.test.js`
   - `admin-portal/src/__tests__/pages/Alerts.test.js`
   - `admin-portal/src/__tests__/pages/Authorities.test.js`

4. **Achieve Coverage Goals**:
   - Run `npm test` regularly
   - Check coverage reports
   - Add tests for uncovered code

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest (API Testing)](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
