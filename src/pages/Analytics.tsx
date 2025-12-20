import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Users,
  Layers,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid
} from 'recharts';

const Analytics: React.FC = () => {
  const { globalStats, protocols, chains } = useStore();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Generate mock historical data
  const historicalData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        tvl: 12000 + Math.sin(i / 5) * 1000 + i * 50 + Math.random() * 200,
        deposits: 50 + Math.floor(Math.random() * 100),
        withdrawals: 30 + Math.floor(Math.random() * 60),
        yield: 20 + Math.floor(Math.random() * 50),
        users: 1000 + Math.floor(Math.random() * 500) + i * 10,
        apy: 4.5 + Math.sin(i / 8) * 0.8 + Math.random() * 0.3,
      };
    });
  }, [timeRange]);

  // Chain TVL distribution
  const chainTvlData = useMemo(() => {
    return chains.map((chain) => {
      const chainProtocols = protocols.filter((p) => p.chainId === chain.id);
      const tvl = chainProtocols.reduce((sum, p) => sum + p.tvl, 0);
      return {
        name: chain.name,
        tvl,
        color: chain.color,
      };
    });
  }, [chains, protocols]);

  // Protocol APY comparison
  const protocolApyData = useMemo(() => {
    return protocols.map((p) => ({
      name: `${p.name} (${chains.find((c) => c.id === p.chainId)?.name.slice(0, 3)})`,
      apy: p.apy,
      color: p.color,
    }));
  }, [protocols, chains]);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  const stats = [
    {
      label: 'Total Value Locked',
      value: formatNumber(globalStats.totalValueLocked),
      change: '+12.5%',
      positive: true,
      icon: DollarSign,
    },
    {
      label: 'Total Users',
      value: globalStats.totalUsers.toLocaleString(),
      change: '+8.3%',
      positive: true,
      icon: Users,
    },
    {
      label: 'Yield Generated',
      value: formatNumber(globalStats.totalYieldGenerated),
      change: '+15.2%',
      positive: true,
      icon: TrendingUp,
    },
    {
      label: 'Active Protocols',
      value: globalStats.activeProtocols.toString(),
      change: '0%',
      positive: true,
      icon: Layers,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-dark-400">
            Comprehensive insights into protocol performance and yields
          </p>
        </motion.div>

        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center bg-dark-800 rounded-xl p-1">
            {(['7d', '30d', '90d', '1y'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-accent-purple text-white'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button className="btn-ghost flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
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
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-dark-800">
                  <Icon className="w-5 h-5 text-accent-purple" />
                </div>
                <span
                  className={`flex items-center gap-1 text-sm ${
                    stat.positive ? 'text-accent-green' : 'text-accent-red'
                  }`}
                >
                  {stat.positive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-dark-400">{stat.label}</p>
            </motion.div>
          );
        })}
      </section>

      {/* TVL & APY Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TVL Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Total Value Locked</h3>
              <p className="text-sm text-dark-400">Historical TVL trend</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold gradient-text">
                {formatNumber(globalStats.totalValueLocked)}
              </p>
              <p className="text-xs text-accent-green">+12.5% from last period</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={historicalData}>
              <defs>
                <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}B`}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '12px',
                }}
                formatter={(value) => value !== undefined ? [formatNumber(Number(value) * 1e6), 'TVL'] : ['', 'TVL']}
              />
              <Area
                type="monotone"
                dataKey="tvl"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#tvlGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* APY Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Average APY</h3>
              <p className="text-sm text-dark-400">Weighted average across protocols</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-accent-green">
                {globalStats.avgApy.toFixed(2)}%
              </p>
              <p className="text-xs text-accent-green">+0.24% from last period</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[3, 7]}
                tickFormatter={(v) => `${v.toFixed(1)}%`}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '12px',
                }}
                formatter={(value) => value !== undefined ? [`${Number(value).toFixed(2)}%`, 'APY'] : ['', 'APY']}
              />
              <Line
                type="monotone"
                dataKey="apy"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </section>

      {/* Distribution Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chain Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-accent-purple" />
            TVL by Chain
          </h3>

          <div className="flex items-center gap-8">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={chainTvlData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="tvl"
                >
                  {chainTvlData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(71, 85, 105, 0.5)',
                    borderRadius: '12px',
                  }}
                  formatter={(value) => value !== undefined ? formatNumber(Number(value)) : ''}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex-1 space-y-3">
              {chainTvlData.map((chain, index) => {
                const total = chainTvlData.reduce((sum, c) => sum + c.tvl, 0);
                const percentage = ((chain.tvl / total) * 100).toFixed(1);

                return (
                  <div key={chain.name} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: chain.color }}
                    />
                    <span className="text-dark-300 flex-1">{chain.name}</span>
                    <span className="text-white font-medium">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Protocol APY Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent-blue" />
            APY by Protocol
          </h3>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={protocolApyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis
                type="number"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 7]}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '12px',
                }}
                formatter={(value) => value !== undefined ? [`${Number(value).toFixed(2)}%`, 'APY'] : ['', 'APY']}
              />
              <Bar dataKey="apy" radius={[0, 4, 4, 0]}>
                {protocolApyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </section>

      {/* Activity Chart */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent-cyan" />
              Protocol Activity
            </h3>
            <p className="text-sm text-dark-400">Daily deposits, withdrawals, and yield</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={historicalData.slice(-14)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(71, 85, 105, 0.5)',
                borderRadius: '12px',
              }}
            />
            <Legend />
            <Bar dataKey="deposits" name="Deposits" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="withdrawals" name="Withdrawals" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Bar dataKey="yield" name="Yield Generated" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.section>

      {/* User Growth */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-pink" />
              User Growth
            </h3>
            <p className="text-sm text-dark-400">Cumulative unique users over time</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={historicalData}>
            <defs>
              <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(71, 85, 105, 0.5)',
                borderRadius: '12px',
              }}
              formatter={(value) => value !== undefined ? [Number(value).toLocaleString(), 'Users'] : ['', 'Users']}
            />
            <Area
              type="monotone"
              dataKey="users"
              stroke="#ec4899"
              strokeWidth={2}
              fill="url(#usersGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.section>
    </div>
  );
};

export default Analytics;
