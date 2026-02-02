# Unit Tests

This directory contains comprehensive unit tests for the Herzog Rail Authority backend.

## Test Structure

```
tests/unit/
├── controllers/        # Controller unit tests
│   └── pinTypeController.test.js
├── middleware/         # Middleware unit tests
│   └── auth.test.js
├── models/            # Model unit tests
│   └── BaseModel.test.js
├── services/          # Service unit tests
│   ├── proximityMonitoringService.test.js
│   ├── emailService.test.js
│   └── gpsService.test.js
├── utils/             # Utility function tests
│   └── geoCalculations.test.js
└── setup.js           # Global test setup
```

## Running Tests

### Run All Unit Tests
```bash
npm run test:unit
```

### Run Unit Tests in Watch Mode
```bash
npm run test:unit:watch
```

### Run Integration Tests
```bash
npm run test:integration
```

### Run All Tests (Unit + Integration)
```bash
npm run test:all
```

## Test Coverage

Unit tests aim for the following coverage thresholds:
- **Statements**: 80%
- **Branches**: 70%
- **Functions**: 75%
- **Lines**: 80%

View coverage report after running tests:
```bash
open coverage/unit/index.html
```

## What Gets Tested

### Controllers
- ✅ Request/response handling
- ✅ Input validation
- ✅ Authorization checks
- ✅ Error handling
- ✅ Data transformation

### Middleware
- ✅ Authentication logic
- ✅ Token validation
- ✅ Role-based authorization
- ✅ Agency access control
- ✅ Error responses

### Services
- ✅ Business logic
- ✅ Data processing
- ✅ External API calls (mocked)
- ✅ Background jobs
- ✅ Email sending

### Models
- ✅ Database queries (mocked)
- ✅ Data validation
- ✅ CRUD operations
- ✅ SQL parameter handling

### Utilities
- ✅ Geospatial calculations
- ✅ Distance algorithms
- ✅ Coordinate conversions
- ✅ Polygon operations

## Test Patterns

### Mocking Dependencies
```javascript
jest.mock('../../../src/models/PinType');

const pinTypeModel = require('../../../src/models/PinType');
pinTypeModel.findByAgency.mockResolvedValue([/* mock data */]);
```

### Testing Async Functions
```javascript
it('should handle async operations', async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Error Handling
```javascript
it('should handle errors gracefully', async () => {
  mockFunction.mockRejectedValue(new Error('Test error'));
  
  await expect(functionUnderTest()).rejects.toThrow('Test error');
});
```

### Using Global Test Helpers
```javascript
const req = createMockRequest({ 
  params: { id: '1' },
  user: { Role: 'Administrator' }
});
const res = createMockResponse();
const next = createMockNext();
```

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Mock External Dependencies**: Database, APIs, file system
3. **Test Edge Cases**: Null values, empty arrays, invalid inputs
4. **Clear Test Names**: Describe what is being tested
5. **Arrange-Act-Assert**: Structure tests clearly
6. **Clean Up**: Use `beforeEach` and `afterEach`

## Example Test

```javascript
describe('PinType Controller', () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe('getPinTypes', () => {
    it('should get all pin types for an agency', async () => {
      // Arrange
      req.params.agencyId = '1';
      req.user = { Role: 'Administrator' };
      const mockData = [{ Pin_Type_ID: 1, Pin_Category: 'Safety' }];
      pinTypeModel.findByAgency.mockResolvedValue(mockData);

      // Act
      await pinTypeController.getPinTypes(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ total: 1 })
      });
    });
  });
});
```

## Debugging Tests

### Run Specific Test File
```bash
npm run test:unit -- controllers/pinTypeController.test.js
```

### Run Specific Test Suite
```bash
npm run test:unit -- --testNamePattern="getPinTypes"
```

### Enable Verbose Output
```bash
npm run test:unit -- --verbose
```

### View Failed Tests Only
```bash
npm run test:unit -- --onlyFailures
```

## CI/CD Integration

These tests are designed to run in continuous integration:

```yaml
# Example GitHub Actions workflow
- name: Run Unit Tests
  run: npm run test:unit
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/unit/lcov.info
```

## Coverage Reports

Coverage reports are generated in multiple formats:
- **HTML**: `coverage/unit/index.html` (human-readable)
- **LCOV**: `coverage/unit/lcov.info` (CI tools)
- **JSON**: `coverage/unit/coverage-final.json` (programmatic)
- **Text**: Console output

## Adding New Tests

When adding new functionality:

1. Create test file matching source structure
2. Follow naming convention: `*.test.js`
3. Mock all external dependencies
4. Test happy path and error cases
5. Verify coverage meets thresholds
6. Run tests before committing

```bash
npm run test:unit:watch
# Make changes...
# Tests auto-run
```

## Common Issues

### Jest Cannot Find Module
- Ensure correct relative path in `require()`
- Check jest.unit.config.js moduleNameMapper

### Async Tests Timeout
- Increase timeout: `jest.setTimeout(10000)`
- Check for unresolved promises

### Mocks Not Working
- Ensure `jest.clearAllMocks()` in beforeEach
- Mock before importing module under test

### Coverage Not Meeting Threshold
- Add missing test cases
- Remove untestable code
- Update thresholds if necessary

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [Node.js Testing Guide](https://nodejs.org/en/docs/guides/testing/)
