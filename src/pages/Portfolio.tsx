import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plus,
  Minus,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import toast from 'react-hot-toast';

const Portfolio: React.FC = () => {
  const { isConnected, positions, chains, assets, balance, selectedAsset, setSelectedAsset } = useStore();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<typeof positions[0] | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Calculate totals
  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalDeposited = positions.reduce((sum, p) => sum + p.deposited, 0);
  const totalYield = positions.reduce((sum, p) => sum + p.unrealizedYield, 0);
  const avgApy = positions.length > 0
    ? positions.reduce((sum, p) => sum + p.apy, 0) / positions.length
    : 0;

  // Pie chart data
  const pieData = positions.map((p) => ({
    name: `${p.asset.symbol} on ${p.chain.name}`,
    value: p.currentValue,
    color: p.chain.color,
  }));

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    toast.success('Address copied!');
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleDeposit = () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    toast.success(`Depositing ${depositAmount} ${selectedAsset?.symbol}...`);
    setShowDepositModal(false);
    setDepositAmount('');
  };

  const handleWithdraw = () => {
    if (!selectedPosition) return;
    toast.success(`Withdrawing from ${selectedPosition.protocol.name}...`);
    setShowWithdrawModal(false);
    setSelectedPosition(null);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 flex items-center justify-center">
            <Wallet className="w-10 h-10 text-accent-purple" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
          <p className="text-dark-400 mb-6">
            Connect your wallet to view your portfolio and start earning yield across multiple chains.
          </p>
          <button className="btn-primary w-full">
            Connect Wallet
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Portfolio Overview */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Value Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 glass-card p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-dark-400 mb-1">Total Portfolio Value</p>
              <h2 className="text-4xl font-bold gradient-text">{formatCurrency(totalValue)}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-accent-green flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" />
                  +{formatCurrency(totalYield)}
                </span>
                <span className="text-dark-400">unrealized yield</span>
              </div>
            </div>
            <div className="flex gap-3">
              <motion.button
                onClick={() => setShowDepositModal(true)}
                className="btn-primary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-4 h-4" />
                Deposit
              </motion.button>
              <motion.button
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw className="w-4 h-4" />
                Rebalance
              </motion.button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-dark-800/50 rounded-xl p-4">
              <p className="text-xs text-dark-400 mb-1">Total Deposited</p>
              <p className="text-lg font-semibold text-white">{formatCurrency(totalDeposited)}</p>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4">
              <p className="text-xs text-dark-400 mb-1">Total Yield</p>
              <p className="text-lg font-semibold text-accent-green">+{formatCurrency(totalYield)}</p>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4">
              <p className="text-xs text-dark-400 mb-1">Average APY</p>
              <p className="text-lg font-semibold text-accent-purple">{avgApy.toFixed(2)}%</p>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4">
              <p className="text-xs text-dark-400 mb-1">Active Positions</p>
              <p className="text-lg font-semibold text-white">{positions.length}</p>
            </div>
          </div>
        </motion.div>

        {/* Allocation Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Chain Allocation</h3>
          
          {positions.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(71, 85, 105, 0.5)',
                      borderRadius: '12px',
                    }}
                    formatter={(value) => value !== undefined ? formatCurrency(Number(value)) : ''}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="space-y-2 mt-4">
                {pieData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-dark-300">{item.name}</span>
                    </div>
                    <span className="text-white font-medium">
                      {((item.value / totalValue) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <AlertCircle className="w-12 h-12 text-dark-500 mb-3" />
              <p className="text-dark-400">No positions yet</p>
            </div>
          )}
        </motion.div>
      </section>

      {/* Positions Table */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-6 border-b border-dark-700">
          <h3 className="text-lg font-semibold text-white">Your Positions</h3>
          <p className="text-sm text-dark-400">Manage your yield-generating positions</p>
        </div>

        {positions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-dark-800/50">
                  <th className="table-header text-left px-6 py-4">Asset</th>
                  <th className="table-header text-left px-6 py-4">Protocol</th>
                  <th className="table-header text-left px-6 py-4">Chain</th>
                  <th className="table-header text-right px-6 py-4">Deposited</th>
                  <th className="table-header text-right px-6 py-4">Current Value</th>
                  <th className="table-header text-right px-6 py-4">APY</th>
                  <th className="table-header text-right px-6 py-4">Yield</th>
                  <th className="table-header text-right px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position, index) => (
                  <motion.tr
                    key={position.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-dark-800 hover:bg-dark-800/30 transition-colors"
                  >
                    <td className="table-cell px-6">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{position.asset.icon}</span>
                        <div>
                          <p className="font-medium text-white">{position.asset.symbol}</p>
                          <p className="text-xs text-dark-400">{position.asset.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell px-6">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{position.protocol.icon}</span>
                        <span className="text-dark-300">{position.protocol.name}</span>
                      </div>
                    </td>
                    <td className="table-cell px-6">
                      <div 
                        className="chain-badge"
                        style={{ 
                          backgroundColor: `${position.chain.color}20`,
                          color: position.chain.color 
                        }}
                      >
                        <span>{position.chain.icon}</span>
                        {position.chain.name}
                      </div>
                    </td>
                    <td className="table-cell px-6 text-right text-dark-300">
                      {formatCurrency(position.deposited)}
                    </td>
                    <td className="table-cell px-6 text-right font-medium text-white">
                      {formatCurrency(position.currentValue)}
                    </td>
                    <td className="table-cell px-6 text-right">
                      <span className="text-accent-green font-semibold">
                        {position.apy.toFixed(2)}%
                      </span>
                    </td>
                    <td className="table-cell px-6 text-right">
                      <span className="text-accent-green">
                        +{formatCurrency(position.unrealizedYield)}
                      </span>
                    </td>
                    <td className="table-cell px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedPosition(position);
                            setShowWithdrawModal(true);
                          }}
                          className="btn-ghost text-sm"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <button className="btn-ghost text-sm">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-800 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-dark-500" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">No Active Positions</h4>
            <p className="text-dark-400 mb-6 max-w-sm">
              Start earning yield by depositing your stablecoins into the best protocols.
            </p>
            <button 
              onClick={() => setShowDepositModal(true)}
              className="btn-primary"
            >
              Make Your First Deposit
            </button>
          </div>
        )}
      </motion.section>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDepositModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-6">Deposit Funds</h3>
              
              {/* Asset Selector */}
              <div className="mb-4">
                <label className="text-sm text-dark-400 mb-2 block">Select Asset</label>
                <div className="relative">
                  <select 
                    className="input-field appearance-none cursor-pointer"
                    value={selectedAsset?.symbol || ''}
                    onChange={(e) => {
                      const asset = assets.find(a => a.symbol === e.target.value);
                      if (asset) setSelectedAsset(asset);
                    }}
                  >
                    {assets.map((asset) => (
                      <option key={asset.symbol} value={asset.symbol}>
                        {asset.icon} {asset.symbol} - {asset.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 pointer-events-none" />
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-4">
                <label className="text-sm text-dark-400 mb-2 block">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="input-field pr-20"
                  />
                  <button 
                    onClick={() => setDepositAmount(balance.toString())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-accent-purple hover:text-accent-blue transition-colors"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-xs text-dark-400 mt-1">
                  Balance: {formatCurrency(balance)}
                </p>
              </div>

              {/* Protocol Selection Info */}
              <div className="bg-dark-800/50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-accent-green" />
                  <span className="text-sm font-medium text-white">Auto-Optimization Enabled</span>
                </div>
                <p className="text-xs text-dark-400">
                  Your funds will be automatically deposited into the highest yielding protocol
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeposit}
                  className="btn-primary flex-1"
                >
                  Deposit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdrawModal && selectedPosition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowWithdrawModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-6">Withdraw Funds</h3>
              
              {/* Position Summary */}
              <div className="bg-dark-800/50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{selectedPosition.asset.icon}</span>
                  <div>
                    <p className="font-medium text-white">{selectedPosition.asset.symbol}</p>
                    <p className="text-xs text-dark-400">
                      {selectedPosition.protocol.name} on {selectedPosition.chain.name}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-dark-400">Current Value</p>
                    <p className="font-semibold text-white">
                      {formatCurrency(selectedPosition.currentValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">Yield Earned</p>
                    <p className="font-semibold text-accent-green">
                      +{formatCurrency(selectedPosition.unrealizedYield)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-accent-yellow flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-dark-200">
                    Withdrawing will trigger any unrealized yield to be harvested and transferred to your wallet.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  className="btn-primary flex-1 bg-gradient-to-r from-accent-orange to-accent-red"
                >
                  Withdraw All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Portfolio;
