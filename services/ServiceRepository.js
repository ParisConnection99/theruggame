// ServiceRepository.js
const { supabase } = require('@/lib/supabaseClient');
const BetUnitService = require('./BetUnitService');
const MatchingService = require('./MatchingFunnel');
const MarketService = require('./MarketService');
const PostgresDatabase = require('./PostgresDatabase');
const StatusUpdateService = require('./StatusUpdateService');
const ExpiryService = require('./MarketExpiryService');
const RefundService = require('./RefundService');
const PayoutService = require('./PayoutService');
const MarketResolveService = require('./MarketResolveService');
const BettingService = require('./BettingService');
const OddsService = require('./OddsService');
const TokenService = require('./TokenService');
const MarketCreationService = require('./MarketCreationService');
const UserService = require('./UserService');
const CashoutService = require('./CashoutService');
const SessionDataService = require('./SessionDataService');
const dbConfig = require('@/utils/db-config');


class ServiceRepository {
  constructor() {
    this.services = {};
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return this;

    // Database connections
    this.register('supabase', supabase);
    this.register('pool', dbConfig.pool);
    this.register('db', new PostgresDatabase(this.get('pool')));

    // Independent services (services with minimal dependencies)
    this.register('sessionDataService', new SessionDataService(this.get('supabase')));
    this.register('userService', new UserService(this.get('supabase')));
    this.register('oddsService', new OddsService(this.get('supabase')));
    this.register('statusUpdateService', new StatusUpdateService(this.get('db')));
    this.register('betUnitService', new BetUnitService(
      this.get('db'), 
      { platformFee: 0.02 }
    ));
    
    // First level dependent services
    this.register('refundService', new RefundService(
      this.get('supabase'), 
      {},
      this.get('userService')
    ));
    this.register('payoutService', new PayoutService(
      this.get('supabase'), 
      this.get('userService')
    ));
    this.register('tokenService', new TokenService(
      this.get('supabase'), 
      this.get('pool')
    ));
    this.register('marketResolveService', new MarketResolveService(
      this.get('supabase')
    ));
    this.register('cashoutService', new CashoutService(
      this.get('supabase'),
      this.get('userService')
    ));
    
    // Second level dependent services
    this.register('expiryService', new ExpiryService(
      this.get('supabase'), 
      this.get('refundService'), 
      this.get('db'),
      this.get('marketResolveService'),
      this.get('payoutService'),
    ));
    
    // Third level dependent services
    this.register('marketService', new MarketService(
      this.get('supabase'), 
      this.get('pool'), 
      this.get('expiryService')
    ));

    this.register('marketCreationService', new MarketCreationService(
      this.get('tokenService'),
      this.get('marketService'),
      {},
      this.get('supabase')
    ));

    // Complete the circular dependency by setting marketCreationService on expiryService
    this.get('expiryService').setMarketCreationService(this.get('marketCreationService'));
    
    // Fourth level dependent services
    this.register('matchingService', new MatchingService(
      this.get('db'),
      {},
      this.get('marketService'),
      this.get('statusUpdateService'),
      this.get('betUnitService')
    ));
    
    // Final level dependent services
    this.register('bettingService', new BettingService(
      { platformFee: 0.02 },
      this.get('matchingService'),
      this.get('oddsService'),
      this.get('supabase'),
      this.get('betUnitService'),
      this.get('db'),
      this.get('marketService')
    ));

    this.initialized = true;
    return this;
  }

  register(name, service) {
    this.services[name] = service;
    return this;
  }

  get(name) {
    if (!this.services[name]) {
      throw new Error(`Service ${name} not found in repository`);
    }
    return this.services[name];
  }

  // Convenience getters for commonly used services
  get userService() { return this.get('userService'); }
  get bettingService() { return this.get('bettingService'); }
  get marketService() { return this.get('marketService'); }
  get matchingService() { return this.get('matchingService'); }
  get statusUpdateService() { return this.get('statusUpdateService'); }
  get marketCreationService() { return this.get('marketCreationService'); }
  get oddsService() { return this.get('oddsService'); }
  get tokenService() { return this.get('tokenService'); }
  get cashoutService() { return this.get('cashoutService'); }
  get expiryService() { return this.get('expiryService'); }
  get database() { return this.get('db'); }
}

// Create and export a singleton instance
const serviceRepo = new ServiceRepository().initialize();

module.exports = {
  ServiceRepository,
  serviceRepo
}