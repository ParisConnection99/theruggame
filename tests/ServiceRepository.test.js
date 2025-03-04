const { jest } = require('@jest/globals');

jest.mock('@/lib/supabaseClient', () => ({
  supabase: { mock: 'supabase' }
}));
jest.mock('@/utils/db-config', () => ({ mock: 'pool' }));
jest.mock('../services/BetUnitService');
jest.mock('../services/MatchingFunnel');
jest.mock('../services/MarketService');
jest.mock('../services/PostgresDatabase');
jest.mock('../services/StatusUpdateService');
jest.mock('../services/MarketExpiryService');
jest.mock('../services/RefundService');
jest.mock('../services/PayoutService');
jest.mock('../services/MarketResolveService');
jest.mock('../services/BettingService');
jest.mock('../services/OddsService');
jest.mock('../services/TokenService');
jest.mock('../services/MarketCreationService');
jest.mock('../services/UserService');
jest.mock('../services/CashoutService');

const BetUnitService = require('../services/BetUnitService');
const MatchingService = require('../services/MatchingFunnel');
const MarketService = require('../services/MarketService');
const PostgresDatabase = require('../services/PostgresDatabase');
const StatusUpdateService = require('../services/StatusUpdateService');
const ExpiryService = require('../services/MarketExpiryService');
const RefundService = require('../services/RefundService');
const PayoutService = require('../services/PayoutService');
const MarketResolveService = require('../services/MarketResolveService');
const BettingService = require('../services/BettingService');
const OddsService = require('../services/OddsService');
const TokenService = require('../services/TokenService');
const MarketCreationService = require('../services/MarketCreationService');
const UserService = require('../services/UserService');
const CashoutService = require('../services/CashoutService');

// Use destructuring to get the ServiceRepository class
const { ServiceRepository } = require('../services/ServiceRepository');

describe('ServiceRepository', () => {
  let serviceRepo;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    // Create a new instance of ServiceRepository directly
    serviceRepo = new ServiceRepository();
  });

  test('should register a service correctly', () => {
    const mockService = { name: 'test-service' };
    serviceRepo.register('testService', mockService);
    expect(serviceRepo.services['testService']).toBe(mockService);
  });

  test('should retrieve a registered service', () => {
    const mockService = { name: 'test-service' };
    serviceRepo.register('testService', mockService);
    expect(serviceRepo.get('testService')).toBe(mockService);
  });

  test('should throw error when retrieving non-existent service', () => {
    expect(() => {
      serviceRepo.get('nonExistentService');
    }).toThrow('Service nonExistentService not found in repository');
  });

  test('should initialize all services correctly', () => {
    serviceRepo.initialize();
    expect(PostgresDatabase).toHaveBeenCalled();
    expect(BetUnitService).toHaveBeenCalled();
    expect(UserService).toHaveBeenCalled();
    expect(OddsService).toHaveBeenCalled();
    expect(serviceRepo.initialized).toBe(true);
  });

  test('should pass correct dependencies to services', () => {
    serviceRepo.initialize();
    expect(UserService).toHaveBeenCalledWith(expect.anything());
    expect(BetUnitService).toHaveBeenCalledWith(expect.anything(), { platformFee: 0.02 });
    expect(BettingService).toHaveBeenCalledWith(
      { platformFee: 0.02 },
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  test('convenience getters should return the correct service', () => {
    const mockUserService = { mock: 'userService' };
    const mockBettingService = { mock: 'bettingService' };
    serviceRepo.register('userService', mockUserService);
    serviceRepo.register('bettingService', mockBettingService);
    expect(serviceRepo.userService).toBe(mockUserService);
    expect(serviceRepo.bettingService).toBe(mockBettingService);
  });

  test('should not re-initialize if already initialized', () => {
    serviceRepo.initialize();
    jest.clearAllMocks();
    serviceRepo.initialize();
    expect(PostgresDatabase).not.toHaveBeenCalled();
  });
});