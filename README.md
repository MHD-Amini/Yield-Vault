# 🔷 YieldVault - Cross-Chain DeFi Yield Aggregator

A sophisticated DeFi application that automatically moves stablecoins (USDC/USDT) between Ethereum, Polygon, and Arbitrum to chase the highest lending yields from Aave, Compound, and more.

![YieldVault Screenshot](https://via.placeholder.com/800x400?text=YieldVault+Cross-Chain+Yield+Aggregator)

## ✨ Features

### Currently Implemented

- **🏠 Dashboard**: Real-time overview of TVL, APY trends, and global statistics
- **📊 Portfolio Management**: View and manage positions across all chains
- **🔄 Cross-Chain Bridge**: Bridge assets between Ethereum, Polygon, and Arbitrum via LayerZero
- **📈 Protocol Comparison**: Compare yields across Aave V3 and Compound V3 on multiple chains
- **📉 Analytics**: Historical charts for TVL, APY, user growth, and protocol activity
- **🌙 Beautiful Dark Theme**: Glass morphism design with smooth animations
- **👛 Wallet Connection**: Simulated wallet connection with mock data

### Smart Contracts

| Contract | Description |
|----------|-------------|
| `YieldAggregator.sol` | Main contract managing deposits, withdrawals, and yield optimization |
| `CrossChainBridge.sol` | LayerZero V2 integration for cross-chain messaging and token transfers |
| `AaveV3Adapter.sol` | Adapter for interacting with Aave V3 lending pools |
| `CompoundV3Adapter.sol` | Adapter for interacting with Compound V3 (Comet) |

### The Graph Subgraph

Complete subgraph schema and handlers for indexing:
- Protocol APY snapshots
- User deposits and withdrawals
- Cross-chain bridge transactions
- Global statistics and daily metrics

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Tailwind CSS, Framer Motion |
| **Charts** | Recharts |
| **State** | Zustand |
| **Smart Contracts** | Solidity 0.8.20, Hardhat |
| **Cross-Chain** | LayerZero V2 |
| **Data Indexing** | The Graph |
| **Web3** | Ethers.js v6, wagmi, viem |

## 📂 Project Structure

```
webapp/
├── contracts/              # Solidity smart contracts
│   ├── YieldAggregator.sol    # Main aggregator contract
│   ├── adapters/              # Protocol adapters
│   │   ├── AaveV3Adapter.sol
│   │   └── CompoundV3Adapter.sol
│   ├── bridge/
│   │   └── CrossChainBridge.sol
│   └── interfaces/            # Contract interfaces
├── src/                    # React frontend
│   ├── components/           # Reusable components
│   ├── pages/               # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Portfolio.tsx
│   │   ├── Protocols.tsx
│   │   ├── Bridge.tsx
│   │   └── Analytics.tsx
│   ├── store/               # Zustand state management
│   ├── abi/                 # Contract ABIs
│   └── hooks/               # Custom React hooks
├── subgraph/               # The Graph subgraph
│   ├── schema.graphql
│   ├── subgraph.yaml
│   └── src/                 # AssemblyScript handlers
├── scripts/                # Deployment scripts
└── test/                   # Contract tests
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/MHD-Amini/Yield-Vault.git
cd yieldvault

# Install dependencies
npm install --legacy-peer-deps

# Compile smart contracts
npx hardhat compile

# Build frontend
npm run build

# Start development server
npm run dev
```

### Deploying Contracts

```bash
# Deploy to Sepolia testnet
npm run deploy:sepolia

# Deploy to mainnet (requires PRIVATE_KEY env)
npx hardhat run scripts/deploy.ts --network ethereum
```

## 📡 API Endpoints / URIs

### Frontend Routes

| Path | Description |
|------|-------------|
| `/` | Dashboard with global stats and APY trends |
| `/portfolio` | User portfolio management |
| `/protocols` | Protocol listing and APY comparison |
| `/bridge` | Cross-chain bridge interface |
| `/analytics` | Historical analytics and charts |

### Contract Functions

#### YieldAggregator

```solidity
// Deposit assets into best yielding protocol
function deposit(address asset, uint256 amount) external

// Withdraw assets from protocol
function withdraw(address asset, uint256 amount) external

// Rebalance to better protocol
function rebalance(address asset) external

// View functions
function findBestProtocol(address asset) external view returns (bytes32, uint256)
function getAllProtocolAPYs(address asset) external view returns (bytes32[], uint256[], string[])
function getUserPosition(address user, address asset) external view returns (UserPosition, uint256, uint256)
```

#### CrossChainBridge

```solidity
// Bridge tokens to another chain
function bridge(address asset, uint256 amount, uint32 dstChainId, bytes32 recipient) external payable

// Quote bridge fee
function quoteFee(uint32 dstChainId, bytes memory message) external view returns (uint256)
```

## 🔐 Security Considerations

- All contracts use OpenZeppelin's audited libraries
- ReentrancyGuard protection on all state-changing functions
- Pausable functionality for emergency situations
- Owner-only administrative functions
- Cross-chain message validation
- SafeERC20 with `forceApprove` for USDT-like token compatibility
- Input validation and zero address checks
- Bridge liquidity verification before transfers



## 📜 License

MIT License


