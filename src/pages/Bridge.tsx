import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightLeft,
  ArrowDown,
  Clock,
  Zap,
  Shield,
  ExternalLink,
  AlertCircle,
  Check,
  Loader2,
  ChevronDown,
  Info
} from 'lucide-react';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

const Bridge: React.FC = () => {
  const { chains, assets, isConnected, transactions } = useStore();
  
  const [fromChain, setFromChain] = useState(chains[0]);
  const [toChain, setToChain] = useState(chains[2]); // Arbitrum
  const [selectedAsset, setSelectedAsset] = useState(assets[0]);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFromChainDropdown, setShowFromChainDropdown] = useState(false);
  const [showToChainDropdown, setShowToChainDropdown] = useState(false);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);

  // Calculate estimated values
  const estimatedGas = useMemo(() => {
    const baseGas = {
      1: 0.005, // ETH
      137: 0.0001, // MATIC
      42161: 0.0002, // ARB
    };
    return baseGas[fromChain.id as keyof typeof baseGas] || 0.001;
  }, [fromChain]);

  const estimatedTime = useMemo(() => {
    // LayerZero typically takes 1-5 minutes
    return '~2-5 min';
  }, [fromChain, toChain]);

  const bridgeFee = useMemo(() => {
    return parseFloat(amount || '0') * 0.001; // 0.1% bridge fee
  }, [amount]);

  const receiveAmount = useMemo(() => {
    const amountNum = parseFloat(amount || '0');
    return amountNum > 0 ? amountNum - bridgeFee : 0;
  }, [amount, bridgeFee]);

  const handleSwapChains = () => {
    setFromChain(toChain);
    setToChain(fromChain);
  };

  const handleBridge = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (fromChain.id === toChain.id) {
      toast.error('Please select different chains');
      return;
    }

    setIsProcessing(true);
    
    // Simulate bridging process
    toast.loading('Initiating bridge transaction...', { id: 'bridge' });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    toast.loading('Confirming on source chain...', { id: 'bridge' });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    toast.loading('Relaying via LayerZero...', { id: 'bridge' });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    toast.success(`Successfully bridged ${amount} ${selectedAsset.symbol}!`, { id: 'bridge' });
    
    setIsProcessing(false);
    setAmount('');
  };

  // Recent bridge transactions
  const bridgeTransactions = transactions.filter(tx => tx.type === 'bridge').slice(0, 5);

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <section className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-cyan/20 border border-accent-cyan/30 text-sm text-accent-cyan mb-4">
            <Zap className="w-4 h-4" />
            Powered by LayerZero V2
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Cross-Chain Bridge</h1>
          <p className="text-dark-400">
            Bridge your stablecoins between chains in minutes
          </p>
        </motion.div>
      </section>

      {/* Bridge Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        {/* From Section */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-dark-400">From</span>
            <span className="text-xs text-dark-400">Balance: 50,000 USDC</span>
          </div>

          <div className="bg-dark-800/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              {/* Chain Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowFromChainDropdown(!showFromChainDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: fromChain.color }}
                  >
                    {fromChain.icon}
                  </div>
                  <span className="font-medium">{fromChain.name}</span>
                  <ChevronDown className="w-4 h-4 text-dark-400" />
                </button>

                <AnimatePresence>
                  {showFromChainDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 mt-2 w-48 glass-card p-2 z-50"
                    >
                      {chains.map((chain) => (
                        <button
                          key={chain.id}
                          onClick={() => {
                            setFromChain(chain);
                            setShowFromChainDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-700 transition-colors"
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: chain.color }}
                          >
                            {chain.icon}
                          </div>
                          <span>{chain.name}</span>
                          {chain.id === fromChain.id && (
                            <Check className="w-4 h-4 text-accent-green ml-auto" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Asset Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowAssetDropdown(!showAssetDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
                >
                  <span className="text-xl">{selectedAsset.icon}</span>
                  <span className="font-medium">{selectedAsset.symbol}</span>
                  <ChevronDown className="w-4 h-4 text-dark-400" />
                </button>

                <AnimatePresence>
                  {showAssetDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 mt-2 w-48 glass-card p-2 z-50"
                    >
                      {assets.map((asset) => (
                        <button
                          key={asset.symbol}
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowAssetDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-700 transition-colors"
                        >
                          <span className="text-xl">{asset.icon}</span>
                          <span>{asset.symbol}</span>
                          {asset.symbol === selectedAsset.symbol && (
                            <Check className="w-4 h-4 text-accent-green ml-auto" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Amount Input */}
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-3xl font-bold text-white placeholder-dark-500 focus:outline-none"
              />
              <button
                onClick={() => setAmount('50000')}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-accent-purple hover:text-accent-blue transition-colors"
              >
                MAX
              </button>
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <motion.button
            onClick={handleSwapChains}
            className="p-3 rounded-xl bg-dark-800 border border-dark-600 hover:border-accent-purple hover:bg-dark-700 transition-all"
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowDown className="w-5 h-5" />
          </motion.button>
        </div>

        {/* To Section */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-dark-400">To</span>
            <span className="text-xs text-dark-400">Balance: 0.00 USDC</span>
          </div>

          <div className="bg-dark-800/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              {/* To Chain Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowToChainDropdown(!showToChainDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: toChain.color }}
                  >
                    {toChain.icon}
                  </div>
                  <span className="font-medium">{toChain.name}</span>
                  <ChevronDown className="w-4 h-4 text-dark-400" />
                </button>

                <AnimatePresence>
                  {showToChainDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 mt-2 w-48 glass-card p-2 z-50"
                    >
                      {chains.map((chain) => (
                        <button
                          key={chain.id}
                          onClick={() => {
                            setToChain(chain);
                            setShowToChainDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-700 transition-colors"
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: chain.color }}
                          >
                            {chain.icon}
                          </div>
                          <span>{chain.name}</span>
                          {chain.id === toChain.id && (
                            <Check className="w-4 h-4 text-accent-green ml-auto" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-700/50">
                <span className="text-xl">{selectedAsset.icon}</span>
                <span className="font-medium">{selectedAsset.symbol}</span>
              </div>
            </div>

            {/* Receive Amount */}
            <p className="text-3xl font-bold text-white">
              {receiveAmount > 0 ? receiveAmount.toFixed(2) : '0.00'}
            </p>
          </div>
        </div>

        {/* Transaction Details */}
        {amount && parseFloat(amount) > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 p-4 bg-dark-800/30 rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-400">Bridge Fee</span>
              <span className="text-white">
                {bridgeFee.toFixed(4)} {selectedAsset.symbol} (0.1%)
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-400">Estimated Gas</span>
              <span className="text-white">~${(estimatedGas * 2000).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-400">Estimated Time</span>
              <span className="text-white flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {estimatedTime}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm pt-3 border-t border-dark-700">
              <span className="text-dark-400">You will receive</span>
              <span className="text-accent-green font-semibold">
                {receiveAmount.toFixed(2)} {selectedAsset.symbol}
              </span>
            </div>
          </motion.div>
        )}

        {/* Warning */}
        {fromChain.id === toChain.id && (
          <div className="mt-4 p-3 bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl">
            <div className="flex items-center gap-2 text-accent-yellow text-sm">
              <AlertCircle className="w-4 h-4" />
              Please select different source and destination chains
            </div>
          </div>
        )}

        {/* Bridge Button */}
        <motion.button
          onClick={handleBridge}
          disabled={
            !isConnected ||
            !amount ||
            parseFloat(amount) <= 0 ||
            fromChain.id === toChain.id ||
            isProcessing
          }
          className="w-full btn-primary mt-6 py-4 text-lg flex items-center justify-center gap-2"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Bridging...
            </>
          ) : !isConnected ? (
            'Connect Wallet'
          ) : (
            <>
              <ArrowRightLeft className="w-5 h-5" />
              Bridge {selectedAsset.symbol}
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Bridge Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="glass-card p-4 text-center">
          <Zap className="w-8 h-8 mx-auto mb-2 text-accent-yellow" />
          <h3 className="font-semibold text-white mb-1">Fast</h3>
          <p className="text-xs text-dark-400">2-5 minute transfers</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Shield className="w-8 h-8 mx-auto mb-2 text-accent-green" />
          <h3 className="font-semibold text-white mb-1">Secure</h3>
          <p className="text-xs text-dark-400">LayerZero security model</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 text-accent-blue" />
          <h3 className="font-semibold text-white mb-1">Low Fees</h3>
          <p className="text-xs text-dark-400">0.1% bridge fee</p>
        </div>
      </motion.div>

      {/* Supported Routes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-accent-blue" />
          Supported Routes
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {chains.map((from) =>
            chains
              .filter((to) => to.id !== from.id)
              .map((to) => (
                <div
                  key={`${from.id}-${to.id}`}
                  className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-xl"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: from.color }}
                  >
                    {from.icon}
                  </div>
                  <ArrowRightLeft className="w-4 h-4 text-dark-400" />
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: to.color }}
                  >
                    {to.icon}
                  </div>
                  <span className="text-sm text-dark-300 ml-2">
                    {from.name} ↔ {to.name}
                  </span>
                </div>
              ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Bridge;
