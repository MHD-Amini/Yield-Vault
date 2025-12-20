import {
  BigInt,
  Address,
  Bytes,
  log
} from "@graphprotocol/graph-ts";

import {
  BridgeInitiated,
  BridgeCompleted,
  CrossChainMessageReceived,
  RebalanceRequested
} from "../generated/CrossChainBridge/CrossChainBridge";

import {
  BridgeRequest,
  CrossChainMessage,
  ChainStats,
  User,
  Asset,
  DailyStats,
  GlobalStats
} from "../generated/schema";

// Constants
const GLOBAL_STATS_ID = "global";
const ZERO = BigInt.fromI32(0);
const ONE = BigInt.fromI32(1);

// Chain ID to name mapping
function getChainName(chainId: BigInt): string {
  if (chainId.equals(BigInt.fromI32(1))) return "Ethereum";
  if (chainId.equals(BigInt.fromI32(137))) return "Polygon";
  if (chainId.equals(BigInt.fromI32(42161))) return "Arbitrum";
  if (chainId.equals(BigInt.fromI32(10))) return "Optimism";
  if (chainId.equals(BigInt.fromI32(56))) return "BSC";
  if (chainId.equals(BigInt.fromI32(43114))) return "Avalanche";
  return "Unknown";
}

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
    stats.supportedChains = 3;
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

// Helper function to get or create ChainStats
function getOrCreateChainStats(chainId: BigInt): ChainStats {
  let id = chainId.toString();
  let stats = ChainStats.load(id);
  if (stats == null) {
    stats = new ChainStats(id);
    stats.chainId = chainId;
    stats.name = getChainName(chainId);
    stats.totalValueLocked = ZERO;
    stats.activeProtocols = 0;
    stats.totalUsers = ZERO;
    stats.lastUpdate = ZERO;
  }
  return stats;
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

// Event Handler: BridgeInitiated
export function handleBridgeInitiated(event: BridgeInitiated): void {
  let user = getOrCreateUser(event.params.sender);
  let asset = getOrCreateAsset(event.params.asset);
  
  // Create bridge request
  let id = event.params.requestId.toHexString();
  let request = new BridgeRequest(id);
  request.user = user.id;
  request.asset = asset.id;
  request.amount = event.params.amount;
  request.sourceChainId = BigInt.fromI32(1); // Assumes mainnet source
  request.destinationChainId = BigInt.fromI32(event.params.dstChainId);
  request.recipient = new Bytes(32); // Placeholder - would be decoded from event data in production
  request.timestamp = event.block.timestamp;
  request.completed = false;
  request.transactionHash = event.transaction.hash;
  request.save();
  
  // Update chain stats for source
  let sourceChainStats = getOrCreateChainStats(BigInt.fromI32(1));
  sourceChainStats.lastUpdate = event.block.timestamp;
  sourceChainStats.save();
  
  // Update chain stats for destination
  let destChainStats = getOrCreateChainStats(BigInt.fromI32(event.params.dstChainId));
  destChainStats.lastUpdate = event.block.timestamp;
  destChainStats.save();
  
  // Update daily stats
  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.totalBridgeVolume = dailyStats.totalBridgeVolume.plus(event.params.amount);
  dailyStats.save();
  
  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalBridgeVolume = globalStats.totalBridgeVolume.plus(event.params.amount);
  globalStats.lastUpdate = event.block.timestamp;
  globalStats.save();
  
  log.info("Bridge initiated: {} from {} bridging {} to chain {}", [
    id,
    user.id,
    event.params.amount.toString(),
    event.params.dstChainId.toString()
  ]);
}

// Event Handler: BridgeCompleted
export function handleBridgeCompleted(event: BridgeCompleted): void {
  let id = event.params.requestId.toHexString();
  let request = BridgeRequest.load(id);
  
  if (request != null) {
    request.completed = true;
    request.completedTimestamp = event.block.timestamp;
    request.save();
    
    log.info("Bridge completed: {} to {} amount {}", [
      id,
      event.params.recipient.toHexString(),
      event.params.amount.toString()
    ]);
  }
}

// Event Handler: CrossChainMessageReceived
export function handleCrossChainMessageReceived(event: CrossChainMessageReceived): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  
  let message = new CrossChainMessage(id);
  message.sourceChainId = BigInt.fromI32(event.params.srcChainId);
  message.destinationChainId = BigInt.fromI32(1); // Assumes mainnet destination
  message.messageType = event.params.messageType;
  message.sender = event.params.sender;
  message.data = event.params.data;
  message.timestamp = event.block.timestamp;
  message.processed = true;
  message.transactionHash = event.transaction.hash;
  message.save();
  
  // Update chain stats
  let sourceChainStats = getOrCreateChainStats(BigInt.fromI32(event.params.srcChainId));
  sourceChainStats.lastUpdate = event.block.timestamp;
  sourceChainStats.save();
  
  log.info("Cross-chain message received: type {} from chain {}", [
    event.params.messageType.toString(),
    event.params.srcChainId.toString()
  ]);
}

// Event Handler: RebalanceRequested
export function handleRebalanceRequested(event: RebalanceRequested): void {
  let asset = getOrCreateAsset(event.params.asset);
  
  // Create cross-chain message for rebalance
  let id = event.transaction.hash.toHexString() + "-rebalance-" + event.logIndex.toString();
  
  let message = new CrossChainMessage(id);
  message.sourceChainId = BigInt.fromI32(1); // Source chain
  message.destinationChainId = BigInt.fromI32(event.params.dstChainId);
  message.messageType = 2; // Rebalance
  message.sender = event.transaction.from;
  message.asset = asset.id;
  message.amount = event.params.amount;
  message.data = event.params.targetProtocol;
  message.timestamp = event.block.timestamp;
  message.processed = false;
  message.transactionHash = event.transaction.hash;
  message.save();
  
  // Update daily stats
  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.rebalanceCount = dailyStats.rebalanceCount + 1;
  dailyStats.save();
  
  log.info("Rebalance requested: {} of {} to chain {}", [
    event.params.amount.toString(),
    asset.id,
    event.params.dstChainId.toString()
  ]);
}
