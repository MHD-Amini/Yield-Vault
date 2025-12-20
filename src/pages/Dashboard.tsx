import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  Layers,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Shield,
  Clock,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const Dashboard: React.FC = () => {
  const { globalStats, protocols, chains, positions, isConnected, refreshData, isLoading } = useStore();

  // Generate mock chart data
  const yieldHistoryData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      apy: 4.5 + Math.sin(i / 5) * 0.8 + Math.random() * 0.3,
      tvl: 13000 + Math.sin(i / 3) * 500 + i * 20,
    }));
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatCompact = (num: number) => {
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  // Best protocols by APY
  const sortedProtocols = useMemo(() => {
    return [...protocols].sort((a, b) => b.apy - a.apy);
  }, [protocols]);

  const stats = [
    {
      label: 'Total Value Locked',
      value: formatNumber(globalStats.totalValueLocked),
      change: '+12.5%',
      positive: true,
      icon: DollarSign,
      color: 'from-accent-purple to-accent-blue',
    },
    {
      label: 'Total Yield Generated',
      value: formatNumber(globalStats.totalYieldGenerated),
      change: '+8.3%',
      positive: true,
      icon: TrendingUp,
      color: 'from-accent-green to-accent-cyan',
    },
    {
      label: 'Active Users',
      value: formatCompact(globalStats.totalUsers),
      change: '+15.2%',
      positive: true,
      icon: Users,
      color: 'from-accent-blue to-accent-cyan',
    },
    {
      label: 'Average APY',
      value: `${globalStats.avgApy.toFixed(2)}%`,
      change: '+0.24%',
      positive: true,
      icon: Zap,
      color: 'from-accent-yellow to-accent-orange',
    },
  ];

  const features = [
    {
      icon: Shield,
      title: 'Battle-Tested Protocols',
      description: 'Only audited, blue-chip DeFi protocols',
    },
    {
      icon: Zap,
      title: 'Auto-Optimization',
      description: 'Automatically chase the highest yields',
    },
    {
      icon: Clock,
      title: 'Real-Time Updates',
      description: 'APY updates every block via The Graph',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-purple/20 border border-accent-purple/30 text-sm text-accent-purple mb-6">
            <Sparkles className="w-4 h-4" />
            Cross-Chain Yield Optimization
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="gradient-text">Maximize Your</span>
            <br />
            <span className="text-white">Stablecoin Yields</span>
          </h1>
          
          <p className="text-dark-300 text-lg max-w-2xl mx-auto mb-8">
            Automatically move your USDC/USDT across Ethereum, Polygon, and Arbitrum 
            to capture the highest lending yields from Aave, Compound, and more.
          </p>

          {!isConnected && (
            <motion.button
              className="btn-primary text-lg px-8 py-4"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started
              <ArrowUpRight className="w-5 h-5 inline ml-2" />
            </motion.button>
          )}
        </motion.div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card p-6 card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${stat.positive ? 'text-accent-green' : 'text-accent-red'}`}>
                  {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-dark-400">{stat.label}</p>
            </motion.div>
          );
        })}
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* APY Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Average APY Trend</h3>
              <p className="text-sm text-dark-400">Last 30 days</p>
            </div>
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="btn-ghost"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={yieldHistoryData}>
              <defs>
                <linearGradient id="apyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="day" 
                stroke="#475569" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#475569" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                domain={[3.5, 6]}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '12px',
                }}
                formatter={(value) => value !== undefined ? [`${Number(value).toFixed(2)}%`, 'APY'] : ['', 'APY']}
              />
              <Area
                type="monotone"
                dataKey="apy"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#apyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* TVL Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Total Value Locked</h3>
              <p className="text-sm text-dark-400">Across all chains</p>
            </div>
            <div className="flex items-center gap-2">
              {chains.map((chain) => (
                <div
                  key={chain.id}
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: chain.color }}
                  title={chain.name}
                />
              ))}
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={yieldHistoryData}>
              <defs>
                <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="day" 
                stroke="#475569" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#475569" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}B`}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '12px',
                }}
                formatter={(value) => value !== undefined ? [`$${(Number(value) / 1000).toFixed(2)}B`, 'TVL'] : ['', 'TVL']}
              />
              <Area
                type="monotone"
                dataKey="tvl"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#tvlGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </section>

      {/* Top Yields Table */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-6 border-b border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Top Yielding Protocols</h3>
              <p className="text-sm text-dark-400">Real-time APY comparison</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-dark-400">
              <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              Live
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-800/50">
                <th className="table-header text-left px-6 py-4">Protocol</th>
                <th className="table-header text-left px-6 py-4">Chain</th>
                <th className="table-header text-right px-6 py-4">APY</th>
                <th className="table-header text-right px-6 py-4">TVL</th>
                <th className="table-header text-center px-6 py-4">Risk</th>
                <th className="table-header text-right px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedProtocols.slice(0, 6).map((protocol, index) => {
                const chain = chains.find(c => c.id === protocol.chainId);
                return (
                  <motion.tr
                    key={protocol.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-dark-800 hover:bg-dark-800/30 transition-colors"
                  >
                    <td className="table-cell px-6">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${protocol.color}20` }}
                        >
                          {protocol.icon}
                        </div>
                        <div>
                          <p className="font-medium text-white">{protocol.name}</p>
                          <p className="text-xs text-dark-400 capitalize">{protocol.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell px-6">
                      <div 
                        className={`chain-badge`}
                        style={{ 
                          backgroundColor: `${chain?.color}20`,
                          color: chain?.color 
                        }}
                      >
                        <span>{chain?.icon}</span>
                        {chain?.name}
                      </div>
                    </td>
                    <td className="table-cell px-6 text-right">
                      <span className="text-accent-green font-semibold text-lg">
                        {protocol.apy.toFixed(2)}%
                      </span>
                    </td>
                    <td className="table-cell px-6 text-right text-dark-300">
                      {formatNumber(protocol.tvl)}
                    </td>
                    <td className="table-cell px-6 text-center">
                      <span className={`
                        inline-flex px-2 py-1 rounded-full text-xs font-medium
                        ${protocol.risk === 'low' ? 'bg-accent-green/20 text-accent-green' : ''}
                        ${protocol.risk === 'medium' ? 'bg-accent-yellow/20 text-accent-yellow' : ''}
                        ${protocol.risk === 'high' ? 'bg-accent-red/20 text-accent-red' : ''}
                      `}>
                        {protocol.risk}
                      </span>
                    </td>
                    <td className="table-cell px-6 text-right">
                      <button className="btn-ghost text-accent-purple hover:text-white">
                        Deposit
                        <ArrowUpRight className="w-4 h-4 inline ml-1" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              className="glass-card p-6 card-hover text-center"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 flex items-center justify-center">
                <Icon className="w-7 h-7 text-accent-purple" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-dark-400 text-sm">{feature.description}</p>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
};

export default Dashboard;
