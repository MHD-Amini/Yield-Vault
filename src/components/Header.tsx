import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Wallet, 
  Layers, 
  ArrowRightLeft, 
  BarChart3,
  ChevronDown,
  Loader2,
  Check,
  ExternalLink
} from 'lucide-react';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: 'dashboard' | 'portfolio' | 'protocols' | 'bridge' | 'analytics') => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  const { isConnected, address, chainId, chains, setWalletState } = useStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showChainDropdown, setShowChainDropdown] = useState(false);

  const currentChain = chains.find(c => c.id === chainId);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
    { id: 'protocols', label: 'Protocols', icon: Layers },
    { id: 'bridge', label: 'Bridge', icon: ArrowRightLeft },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const handleConnect = async () => {
    setIsConnecting(true);
    
    // Simulate wallet connection
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock connected state
    setWalletState(
      true,
      '0x742d35Cc6634C0532925a3b844Bc9e7595f3bD58',
      1
    );
    
    setIsConnecting(false);
    toast.success('Wallet connected successfully!');
  };

  const handleDisconnect = () => {
    setWalletState(false, null, null);
    toast.success('Wallet disconnected');
  };

  const handleChainSwitch = (chain: typeof chains[0]) => {
    setWalletState(true, address, chain.id);
    setShowChainDropdown(false);
    toast.success(`Switched to ${chain.name}`);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-dark-800/50 backdrop-blur-xl bg-dark-950/80">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onNavigate('dashboard')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
                <span className="text-xl">🔷</span>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue blur-lg opacity-40" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-xl gradient-text">YieldVault</h1>
              <p className="text-[10px] text-dark-400 -mt-0.5">Cross-Chain Aggregator</p>
            </div>
          </motion.div>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onNavigate(item.id as any)}
                  className={`
                    relative px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2
                    transition-colors duration-200
                    ${isActive 
                      ? 'text-white' 
                      : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
                    }
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="navIndicator"
                      className="absolute inset-0 rounded-lg bg-dark-800 -z-10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                {/* Chain Selector */}
                <div className="relative">
                  <motion.button
                    onClick={() => setShowChainDropdown(!showChainDropdown)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-800 border border-dark-700 hover:border-dark-600 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-lg">{currentChain?.icon || '⟠'}</span>
                    <span className="hidden sm:inline text-sm font-medium">
                      {currentChain?.name || 'Unknown'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-dark-400" />
                  </motion.button>

                  {showChainDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full right-0 mt-2 w-48 glass-card p-2 z-50"
                    >
                      {chains.map((chain) => (
                        <button
                          key={chain.id}
                          onClick={() => handleChainSwitch(chain)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-700 transition-colors"
                        >
                          <span className="text-lg">{chain.icon}</span>
                          <span className="font-medium">{chain.name}</span>
                          {chain.id === chainId && (
                            <Check className="w-4 h-4 text-accent-green ml-auto" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Wallet Button */}
                <motion.button
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-accent-purple/20 to-accent-blue/20 border border-accent-purple/30 hover:border-accent-purple/50 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                  <span className="font-mono text-sm">{formatAddress(address!)}</span>
                  <ExternalLink className="w-3 h-3 text-dark-400" />
                </motion.button>
              </>
            ) : (
              <motion.button
                onClick={handleConnect}
                disabled={isConnecting}
                className="btn-primary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    Connect Wallet
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="lg:hidden flex items-center gap-1 pb-3 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as any)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5
                  whitespace-nowrap transition-colors
                  ${isActive 
                    ? 'text-white bg-dark-800' 
                    : 'text-dark-400 hover:text-white'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Header;
