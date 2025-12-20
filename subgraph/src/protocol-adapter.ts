import {
  BigInt,
  Address,
  log
} from "@graphprotocol/graph-ts";

import {
  Protocol,
  APYSnapshot
} from "../generated/schema";

// Constants
const ZERO = BigInt.fromI32(0);

/**
 * Helper function to create APY snapshot
 * This template handler tracks protocol APY changes
 */
export function createAPYSnapshot(
  protocolId: string,
  apy: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  let id = protocolId + "-" + timestamp.toString();
  
  let snapshot = new APYSnapshot(id);
  snapshot.protocol = protocolId;
  snapshot.apy = apy;
  snapshot.timestamp = timestamp;
  snapshot.blockNumber = blockNumber;
  snapshot.save();
  
  // Update protocol's current APY
  let protocol = Protocol.load(protocolId);
  if (protocol != null) {
    protocol.currentAPY = apy;
    protocol.lastUpdate = timestamp;
    protocol.save();
  }
  
  log.info("APY snapshot created for protocol {}: {} bps", [
    protocolId,
    apy.toString()
  ]);
}

/**
 * Helper function to get protocol by adapter address
 */
export function getProtocolByAdapter(adapterAddress: Address): Protocol | null {
  // In production, you would need to iterate through protocols
  // or maintain a mapping. For now, return null as placeholder.
  log.warning("getProtocolByAdapter called for {}", [adapterAddress.toHexString()]);
  return null;
}
