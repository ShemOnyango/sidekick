// Global test setup for unit tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_EXPIRE = '7d';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASSWORD = 'test-password';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Common test utilities
global.createMockRequest = (overrides = {}) => ({
  params: {},
  body: {},
  query: {},
  user: null,
  header: jest.fn(),
  ...overrides
});

global.createMockResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    setHeader: jest.fn()
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.send.mockReturnValue(res);
  return res;
};

global.createMockNext = () => jest.fn();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
