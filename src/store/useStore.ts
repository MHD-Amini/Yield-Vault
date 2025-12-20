import { create } from 'zustand';

// Types
export interface Chain {
  id: number;
  name: string;
  icon: string;
  color: string;
  rpcUrl: string;
  explorerUrl: string;
}

export interface Protocol {
  id: string;
  name: string;
  icon: string;
  color: string;
  chainId: number;
  apy: number;
  tvl: number;
  risk: 'low' | 'medium' | 'high';
  type: 'lending' | 'liquidity' | 'staking';
}

export interface Asset {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  icon: string;
  price: number;
}

export interface Position {
  id: string;
  asset: Asset;
  protocol: Protocol;
  chain: Chain;
  deposited: number;
  currentValue: number;
  apy: number;
  unrealizedYield: number;
  depositTimestamp: number;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'rebalance' | 'bridge';
  asset: Asset;
  amount: number;
  fromChain?: Chain;
  toChain?: Chain;
  fromProtocol?: Protocol;
  toProtocol?: Protocol;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  txHash?: string;
}

export interface GlobalStats {
  totalValueLocked: number;
  totalYieldGenerated: number;
  totalUsers: number;
  activeProtocols: number;
  avgApy: number;
}

interface AppState {
  // Wallet state
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  balance: number;

  // Data
  chains: Chain[];
  protocols: Protocol[];
  assets: Asset[];
  positions: Position[];
  transactions: Transaction[];
  globalStats: GlobalStats;

  // UI State
  selectedChain: Chain | null;
  selectedAsset: Asset | null;
  selectedProtocol: Protocol | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setWalletState: (isConnected: boolean, address: string | null, chainId: number | null) => void;
  setSelectedChain: (chain: Chain | null) => void;
  setSelectedAsset: (asset: Asset | null) => void;
  setSelectedProtocol: (protocol: Protocol | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addTransaction: (tx: Transaction) => void;
  updateTransactionStatus: (id: string, status: Transaction['status'], txHash?: string) => void;
  refreshData: () => Promise<void>;
}

// Mock data
const mockChains: Chain[] = [
  {
    id: 1,
    name: 'Ethereum',
    icon: '⟠',
    color: '#627EEA',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
  },
  {
    id: 137,
    name: 'Polygon',
    icon: '⬡',
    color: '#8247E5',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
  },
  {
    id: 42161,
    name: 'Arbitrum',
    icon: '◈',
    color: '#28A0F0',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
  },
];

const mockProtocols: Protocol[] = [
  {
    id: 'aave-eth',
    name: 'Aave V3',
    icon: '🔮',
    color: '#B6509E',
    chainId: 1,
    apy: 4.82,
    tvl: 8420000000,
    risk: 'low',
    type: 'lending',
  },
  {
    id: 'aave-poly',
    name: 'Aave V3',
    icon: '🔮',
    color: '#B6509E',
    chainId: 137,
    apy: 5.24,
    tvl: 1230000000,
    risk: 'low',
    type: 'lending',
  },
  {
    id: 'aave-arb',
    name: 'Aave V3',
    icon: '🔮',
    color: '#B6509E',
    chainId: 42161,
    apy: 5.67,
    tvl: 890000000,
    risk: 'low',
    type: 'lending',
  },
  {
    id: 'compound-eth',
    name: 'Compound V3',
    icon: '🧪',
    color: '#00D395',
    chainId: 1,
    apy: 4.15,
    tvl: 2100000000,
    risk: 'low',
    type: 'lending',
  },
  {
    id: 'compound-poly',
    name: 'Compound V3',
    icon: '🧪',
    color: '#00D395',
    chainId: 137,
    apy: 4.89,
    tvl: 450000000,
    risk: 'low',
    type: 'lending',
  },
  {
    id: 'compound-arb',
    name: 'Compound V3',
    icon: '🧪',
    color: '#00D395',
    chainId: 42161,
    apy: 5.12,
    tvl: 320000000,
    risk: 'low',
    type: 'lending',
  },
];

const mockAssets: Asset[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    icon: '💵',
    price: 1.0,
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    icon: '💲',
    price: 1.0,
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0x6B175474E89094C44Da98b954EescdeCB5bE3bec3', // DAI address on Ethereum mainnet
    decimals: 18,
    icon: '🟡',
    price: 1.0,
  },
];

const mockGlobalStats: GlobalStats = {
  totalValueLocked: 13410000000,
  totalYieldGenerated: 892000000,
  totalUsers: 284521,
  activeProtocols: 6,
  avgApy: 4.98,
};

export const useStore = create<AppState>((set, get) => ({
  // Initial wallet state
  isConnected: false,
  address: null,
  chainId: null,
  balance: 0,

  // Initial data
  chains: mockChains,
  protocols: mockProtocols,
  assets: mockAssets,
  positions: [],
  transactions: [],
  globalStats: mockGlobalStats,

  // Initial UI state
  selectedChain: null,
  selectedAsset: mockAssets[0],
  selectedProtocol: null,
  isLoading: false,
  error: null,

  // Actions
  setWalletState: (isConnected, address, chainId) => {
    set({ isConnected, address, chainId });
    
    // If connected, set mock positions
    if (isConnected && address) {
      const mockPositions: Position[] = [
        {
          id: '1',
          asset: mockAssets[0],
          protocol: mockProtocols[2], // Aave on Arbitrum
          chain: mockChains[2],
          deposited: 25000,
          currentValue: 25892.45,
          apy: 5.67,
          unrealizedYield: 892.45,
          depositTimestamp: Date.now() - 30 * 24 * 60 * 60 * 1000,
        },
        {
          id: '2',
          asset: mockAssets[1],
          protocol: mockProtocols[1], // Aave on Polygon
          chain: mockChains[1],
          deposited: 15000,
          currentValue: 15421.78,
          apy: 5.24,
          unrealizedYield: 421.78,
          depositTimestamp: Date.now() - 45 * 24 * 60 * 60 * 1000,
        },
        {
          id: '3',
          asset: mockAssets[0],
          protocol: mockProtocols[3], // Compound on Ethereum
          chain: mockChains[0],
          deposited: 10000,
          currentValue: 10215.32,
          apy: 4.15,
          unrealizedYield: 215.32,
          depositTimestamp: Date.now() - 60 * 24 * 60 * 60 * 1000,
        },
      ];
      set({ positions: mockPositions, balance: 50000 });
    }
  },

  setSelectedChain: (chain) => set({ selectedChain: chain }),
  setSelectedAsset: (asset) => set({ selectedAsset: asset }),
  setSelectedProtocol: (protocol) => set({ selectedProtocol: protocol }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  addTransaction: (tx) => {
    set((state) => ({
      transactions: [tx, ...state.transactions],
    }));
  },

  updateTransactionStatus: (id, status, txHash) => {
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.id === id ? { ...tx, status, txHash: txHash || tx.txHash } : tx
      ),
    }));
  },

  refreshData: async () => {
    set({ isLoading: true });
    try {
      // In production, fetch real data from The Graph and RPC
      // For now, simulate a refresh with randomized APYs
      const { protocols } = get();
      const updatedProtocols = protocols.map((p) => ({
        ...p,
        apy: p.apy + (Math.random() - 0.5) * 0.2,
      }));
      
      set({ protocols: updatedProtocols, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to refresh data', isLoading: false });
    }
  },
}));
