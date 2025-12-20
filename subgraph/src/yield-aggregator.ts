import {
  BigInt,
  Address,
  Bytes,
  log
} from "@graphprotocol/graph-ts";

import {
  ProtocolAdded,
  ProtocolRemoved,
  Deposited,
  Withdrawn,
  Rebalanced,
  StrategyUpdated
} from "../generated/YieldAggregator/YieldAggregator";

import {
  Protocol,
  User,
  Asset,
  UserPosition,
  Deposit,
  Withdrawal,
  Rebalance,
  DailyStats,
  GlobalStats
} from "../generated/schema";

// Constants
const GLOBAL_STATS_ID = "global";
const ZERO = BigInt.fromI32(0);
const ONE = BigInt.fromI32(1);

// Helper function to get or create GlobalStats
function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load(GLOBAL_STATS_ID);
  if (stats == null) {
    stats = new GlobalStats(GLOBAL_STATS_ID);
    stats.totalValueLocked = ZERO;
    stats.totalDeposits = ZERO;
    stats.totalWithdrawals = ZERO;
    stats.totalYieldGenerated = ZERO;
    stats.totalBridgeVolume = ZERO;
    stats.totalUsers = ZERO;
    stats.activeProtocols = 0;
    stats.supportedChains = 3; // Ethereum, Polygon, Arbitrum
    stats.lastUpdate = ZERO;
  }
  return stats;
}

// Helper function to get or create User
function getOrCreateUser(address: Address): User {
  let id = address.toHexString();
  let user = User.load(id);
  if (user == null) {
    user = new User(id);
    user.totalDeposited = ZERO;
    user.totalWithdrawn = ZERO;
    user.totalYieldEarned = ZERO;
    user.save();
    
    // Update global stats
    let stats = getOrCreateGlobalStats();
    stats.totalUsers = stats.totalUsers.plus(ONE);
    stats.save();
  }
  return user;
}

// Helper function to get or create Asset
function getOrCreateAsset(address: Address): Asset {
  let id = address.toHexString();
  let asset = Asset.load(id);
  if (asset == null) {
    asset = new Asset(id);
    asset.symbol = "UNKNOWN";
    asset.decimals = 18;
    asset.totalDeposited = ZERO;
    asset.supported = true;
    asset.save();
  }
  return asset;
}

// Helper function to get or create UserPosition
function getOrCreateUserPosition(user: User, asset: Asset): UserPosition {
  let id = user.id + "-" + asset.id;
  let position = UserPosition.load(id);
  if (position == null) {
    position = new UserPosition(id);
    position.user = user.id;
    position.asset = asset.id;
    position.deposited = ZERO;
    position.shares = ZERO;
    position.depositTimestamp = ZERO;
    position.lastUpdate = ZERO;
    position.currentValue = ZERO;
    position.unrealizedYield = ZERO;
  }
  return position;
}

// Helper function to get daily stats
function getOrCreateDailyStats(timestamp: BigInt): DailyStats {
  let dayTimestamp = timestamp.div(BigInt.fromI32(86400)).times(BigInt.fromI32(86400));
  let id = dayTimestamp.toString();
  let stats = DailyStats.load(id);
  if (stats == null) {
    stats = new DailyStats(id);
    stats.date = dayTimestamp;
    stats.totalDeposits = ZERO;
    stats.totalWithdrawals = ZERO;
    stats.totalYieldGenerated = ZERO;
    stats.totalBridgeVolume = ZERO;
    stats.uniqueUsers = ZERO;
    stats.depositCount = 0;
    stats.withdrawalCount = 0;
    stats.rebalanceCount = 0;
  }
  return stats;
}

// Event Handler: ProtocolAdded
export function handleProtocolAdded(event: ProtocolAdded): void {
  let id = event.params.protocolId.toHexString();
  
  let protocol = new Protocol(id);
  protocol.adapter = event.params.adapter;
  protocol.name = event.params.name;
  protocol.chainId = BigInt.fromI32(1); // Default to Ethereum mainnet
  protocol.active = true;
  protocol.totalDeposited = ZERO;
  protocol.currentAPY = ZERO;
  protocol.lastUpdate = event.block.timestamp;
  protocol.save();
  
  // Update global stats
  let stats = getOrCreateGlobalStats();
  stats.activeProtocols = stats.activeProtocols + 1;
  stats.lastUpdate = event.block.timestamp;
  stats.save();
  
  log.info("Protocol added: {} - {}", [id, event.params.name]);
}

// Event Handler: ProtocolRemoved
export function handleProtocolRemoved(event: ProtocolRemoved): void {
  let id = event.params.protocolId.toHexString();
  let protocol = Protocol.load(id);
  
  if (protocol != null) {
    protocol.active = false;
    protocol.lastUpdate = event.block.timestamp;
    protocol.save();
    
    // Update global stats
    let stats = getOrCreateGlobalStats();
    stats.activeProtocols = stats.activeProtocols - 1;
    stats.lastUpdate = event.block.timestamp;
    stats.save();
  }
  
  log.info("Protocol removed: {}", [id]);
}

// Event Handler: Deposited
export function handleDeposited(event: Deposited): void {
  let user = getOrCreateUser(event.params.user);
  let asset = getOrCreateAsset(event.params.asset);
  let protocolId = event.params.protocolId.toHexString();
  let protocol = Protocol.load(protocolId);
  
  // Create deposit record
  let depositId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let deposit = new Deposit(depositId);
  deposit.user = user.id;
  deposit.asset = asset.id;
  deposit.protocol = protocolId;
  deposit.amount = event.params.amount;
  deposit.shares = ZERO; // Would need to track from return value
  deposit.timestamp = event.block.timestamp;
  deposit.blockNumber = event.block.number;
  deposit.transactionHash = event.transaction.hash;
  deposit.save();
  
  // Update user
  user.totalDeposited = user.totalDeposited.plus(event.params.amount);
  user.save();
  
  // Update user position
  let position = getOrCreateUserPosition(user, asset);
  position.deposited = position.deposited.plus(event.params.amount);
  position.currentProtocol = protocolId;
  position.depositTimestamp = event.block.timestamp;
  position.lastUpdate = event.block.timestamp;
  position.currentValue = position.deposited;
  position.save();
  
  // Update asset
  asset.totalDeposited = asset.totalDeposited.plus(event.params.amount);
  asset.save();
  
  // Update protocol
  if (protocol != null) {
    protocol.totalDeposited = protocol.totalDeposited.plus(event.params.amount);
    protocol.lastUpdate = event.block.timestamp;
    protocol.save();
  }
  
  // Update daily stats
  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.totalDeposits = dailyStats.totalDeposits.plus(event.params.amount);
  dailyStats.depositCount = dailyStats.depositCount + 1;
  dailyStats.save();
  
  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalValueLocked = globalStats.totalValueLocked.plus(event.params.amount);
  globalStats.totalDeposits = globalStats.totalDeposits.plus(event.params.amount);
  globalStats.lastUpdate = event.block.timestamp;
  globalStats.save();
  
  log.info("Deposit: {} deposited {} to {}", [
    user.id,
    event.params.amount.toString(),
    protocolId
  ]);
}

// Event Handler: Withdrawn
export function handleWithdrawn(event: Withdrawn): void {
  let user = getOrCreateUser(event.params.user);
  let asset = getOrCreateAsset(event.params.asset);
  
  // Find protocol from user position
  let position = UserPosition.load(user.id + "-" + asset.id);
  let protocolId: string;
  if (position != null && position.currentProtocol != null) {
    protocolId = position.currentProtocol!;
  } else {
    // Create a placeholder protocol ID for unknown withdrawals
    protocolId = "0x0000000000000000000000000000000000000000000000000000000000000000";
    log.warning("Withdrawal from unknown protocol for user {} asset {}", [user.id, asset.id]);
  }
  
  // Create withdrawal record
  let withdrawalId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let withdrawal = new Withdrawal(withdrawalId);
  withdrawal.user = user.id;
  withdrawal.asset = asset.id;
  withdrawal.protocol = protocolId;
  withdrawal.amount = event.params.amount;
  withdrawal.yieldEarned = event.params.yield;
  withdrawal.timestamp = event.block.timestamp;
  withdrawal.blockNumber = event.block.number;
  withdrawal.transactionHash = event.transaction.hash;
  withdrawal.save();
  
  // Update user
  user.totalWithdrawn = user.totalWithdrawn.plus(event.params.amount);
  user.totalYieldEarned = user.totalYieldEarned.plus(event.params.yield);
  user.save();
  
  // Update user position
  if (position != null) {
    position.deposited = position.deposited.minus(event.params.amount);
    if (position.deposited.lt(ZERO)) {
      position.deposited = ZERO;
    }
    position.lastUpdate = event.block.timestamp;
    position.currentValue = position.deposited;
    position.unrealizedYield = ZERO;
    position.save();
  }
  
  // Update asset
  asset.totalDeposited = asset.totalDeposited.minus(event.params.amount);
  if (asset.totalDeposited.lt(ZERO)) {
    asset.totalDeposited = ZERO;
  }
  asset.save();
  
  // Update protocol
  let protocol = Protocol.load(protocolId);
  if (protocol != null) {
    protocol.totalDeposited = protocol.totalDeposited.minus(event.params.amount);
    if (protocol.totalDeposited.lt(ZERO)) {
      protocol.totalDeposited = ZERO;
    }
    protocol.lastUpdate = event.block.timestamp;
    protocol.save();
  }
  
  // Update daily stats
  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.totalWithdrawals = dailyStats.totalWithdrawals.plus(event.params.amount);
  dailyStats.totalYieldGenerated = dailyStats.totalYieldGenerated.plus(event.params.yield);
  dailyStats.withdrawalCount = dailyStats.withdrawalCount + 1;
  dailyStats.save();
  
  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalValueLocked = globalStats.totalValueLocked.minus(event.params.amount);
  if (globalStats.totalValueLocked.lt(ZERO)) {
    globalStats.totalValueLocked = ZERO;
  }
  globalStats.totalWithdrawals = globalStats.totalWithdrawals.plus(event.params.amount);
  globalStats.totalYieldGenerated = globalStats.totalYieldGenerated.plus(event.params.yield);
  globalStats.lastUpdate = event.block.timestamp;
  globalStats.save();
  
  log.info("Withdrawal: {} withdrew {} with yield {}", [
    user.id,
    event.params.amount.toString(),
    event.params.yield.toString()
  ]);
}

// Event Handler: Rebalanced
export function handleRebalanced(event: Rebalanced): void {
  let asset = getOrCreateAsset(event.params.asset);
  let fromProtocolId = event.params.fromProtocol.toHexString();
  let toProtocolId = event.params.toProtocol.toHexString();
  
  // Create rebalance record
  let rebalanceId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let rebalance = new Rebalance(rebalanceId);
  rebalance.asset = asset.id;
  rebalance.fromProtocol = fromProtocolId;
  rebalance.toProtocol = toProtocolId;
  rebalance.amount = event.params.amount;
  rebalance.timestamp = event.block.timestamp;
  rebalance.blockNumber = event.block.number;
  rebalance.transactionHash = event.transaction.hash;
  rebalance.save();
  
  // Update from protocol
  let fromProtocol = Protocol.load(fromProtocolId);
  if (fromProtocol != null) {
    fromProtocol.totalDeposited = fromProtocol.totalDeposited.minus(event.params.amount);
    if (fromProtocol.totalDeposited.lt(ZERO)) {
      fromProtocol.totalDeposited = ZERO;
    }
    fromProtocol.lastUpdate = event.block.timestamp;
    fromProtocol.save();
  }
  
  // Update to protocol
  let toProtocol = Protocol.load(toProtocolId);
  if (toProtocol != null) {
    toProtocol.totalDeposited = toProtocol.totalDeposited.plus(event.params.amount);
    toProtocol.lastUpdate = event.block.timestamp;
    toProtocol.save();
  }
  
  // Update daily stats
  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.rebalanceCount = dailyStats.rebalanceCount + 1;
  dailyStats.save();
  
  log.info("Rebalanced: {} moved from {} to {}", [
    event.params.amount.toString(),
    fromProtocolId,
    toProtocolId
  ]);
}

// Event Handler: StrategyUpdated
export function handleStrategyUpdated(event: StrategyUpdated): void {
  let asset = getOrCreateAsset(event.params.asset);
  // Strategy updates are logged but don't require separate entity
  log.info("Strategy updated for {}: autoRebalance={}, threshold={}", [
    asset.id,
    event.params.autoRebalance.toString(),
    event.params.threshold.toString()
  ]);
}
