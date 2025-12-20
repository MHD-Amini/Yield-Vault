import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  TrendingUp,
  Shield,
  ExternalLink,
  Info,
  ChevronDown,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { useStore } from '../store/useStore';

const Protocols: React.FC = () => {
  const { protocols, chains } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChainFilter, setSelectedChainFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'apy' | 'tvl' | 'name'>('apy');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort protocols
  const filteredProtocols = useMemo(() => {
    let result = [...protocols];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          chains.find((c) => c.id === p.chainId)?.name.toLowerCase().includes(query)
      );
    }

    // Chain filter
    if (selectedChainFilter !== null) {
      result = result.filter((p) => p.chainId === selectedChainFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'apy':
          comparison = a.apy - b.apy;
          break;
        case 'tvl':
          comparison = a.tvl - b.tvl;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [protocols, searchQuery, selectedChainFilter, sortBy, sortOrder, chains]);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-accent-green/20 text-accent-green border-accent-green/30';
      case 'medium':
        return 'bg-accent-yellow/20 text-accent-yellow border-accent-yellow/30';
      case 'high':
        return 'bg-accent-red/20 text-accent-red border-accent-red/30';
      default:
        return 'bg-dark-700 text-dark-300';
    }
  };

  // Group protocols by name for comparison view
  const protocolGroups = useMemo(() => {
    const groups: { [key: string]: typeof protocols } = {};
    protocols.forEach((p) => {
      if (!groups[p.name]) {
        groups[p.name] = [];
      }
      groups[p.name].push(p);
    });
    return groups;
  }, [protocols]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">Supported Protocols</h1>
          <p className="text-dark-400">
            Compare yields across protocols and chains to find the best opportunities
          </p>
        </motion.div>
      </section>

      {/* Search and Filters */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4"
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search protocols or chains..."
              className="input-field pl-12"
            />
          </div>

          {/* Chain Filter */}
          <div className="relative">
            <select
              value={selectedChainFilter ?? ''}
              onChange={(e) =>
                setSelectedChainFilter(e.target.value ? Number(e.target.value) : null)
              }
              className="input-field appearance-none cursor-pointer pr-10 min-w-[160px]"
            >
              <option value="">All Chains</option>
              {chains.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.icon} {chain.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-');
                setSortBy(sort as any);
                setSortOrder(order as any);
              }}
              className="input-field appearance-none cursor-pointer pr-10 min-w-[160px]"
            >
              <option value="apy-desc">Highest APY</option>
              <option value="apy-asc">Lowest APY</option>
              <option value="tvl-desc">Highest TVL</option>
              <option value="tvl-asc">Lowest TVL</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 pointer-events-none" />
          </div>
        </div>
      </motion.section>

      {/* Cross-Chain Comparison */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-purple" />
              Cross-Chain APY Comparison
            </h2>
            <p className="text-sm text-dark-400">Same protocol, different chains</p>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(protocolGroups).map(([name, protocolList], groupIndex) => {
            // Sort by APY within each group
            const sorted = [...protocolList].sort((a, b) => b.apy - a.apy);
            const best = sorted[0];

            return (
              <motion.div
                key={name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: groupIndex * 0.1 }}
                className="bg-dark-800/50 rounded-xl p-4"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${best.color}20` }}
                  >
                    {best.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{name}</h3>
                    <p className="text-xs text-dark-400 capitalize">{best.type} Protocol</p>
                  </div>
                  <div className={`ml-auto px-3 py-1 rounded-full text-xs font-medium border ${getRiskColor(best.risk)}`}>
                    <Shield className="w-3 h-3 inline mr-1" />
                    {best.risk} risk
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {sorted.map((protocol, index) => {
                    const chain = chains.find((c) => c.id === protocol.chainId);
                    const isBest = index === 0;

                    return (
                      <div
                        key={protocol.id}
                        className={`
                          relative p-4 rounded-xl transition-all duration-300
                          ${isBest
                            ? 'bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 border border-accent-purple/30'
                            : 'bg-dark-900/50 border border-dark-700 hover:border-dark-600'
                          }
                        `}
                      >
                        {isBest && (
                          <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-accent-purple rounded-full text-[10px] font-bold text-white">
                            BEST APY
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                            style={{ backgroundColor: chain?.color }}
                          >
                            {chain?.icon}
                          </div>
                          <span className="font-medium text-white">{chain?.name}</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-dark-400 text-sm">APY</span>
                            <span className={`font-bold ${isBest ? 'text-accent-green' : 'text-white'}`}>
                              {protocol.apy.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-dark-400 text-sm">TVL</span>
                            <span className="text-dark-300">{formatNumber(protocol.tvl)}</span>
                          </div>
                        </div>

                        <button className="w-full mt-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-sm font-medium text-white transition-colors flex items-center justify-center gap-1">
                          Deposit
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* All Protocols Grid */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl font-bold text-white mb-4">All Protocols ({filteredProtocols.length})</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProtocols.map((protocol, index) => {
            const chain = chains.find((c) => c.id === protocol.chainId);

            return (
              <motion.div
                key={protocol.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-6 card-hover"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${protocol.color}20` }}
                    >
                      {protocol.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{protocol.name}</h3>
                      <div
                        className="chain-badge text-xs mt-1"
                        style={{
                          backgroundColor: `${chain?.color}20`,
                          color: chain?.color,
                        }}
                      >
                        {chain?.icon} {chain?.name}
                      </div>
                    </div>
                  </div>
                  <button className="btn-ghost p-2">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-dark-400 mb-1">APY</p>
                    <p className="text-2xl font-bold text-accent-green">
                      {protocol.apy.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400 mb-1">TVL</p>
                    <p className="text-lg font-semibold text-white">
                      {formatNumber(protocol.tvl)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-dark-400 capitalize">{protocol.type}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRiskColor(protocol.risk)}`}>
                    {protocol.risk} risk
                  </span>
                </div>

                <button className="w-full btn-primary py-2.5 text-sm">
                  Deposit
                </button>
              </motion.div>
            );
          })}
        </div>

        {filteredProtocols.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-dark-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No protocols found</h3>
            <p className="text-dark-400">Try adjusting your search or filters</p>
          </div>
        )}
      </motion.section>

      {/* Protocol Info */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-accent-blue/20">
            <Info className="w-6 h-6 text-accent-blue" />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2">About Supported Protocols</h3>
            <p className="text-dark-300 text-sm leading-relaxed">
              YieldVault only integrates with battle-tested, audited DeFi protocols. All protocols
              listed have passed rigorous security reviews and have established track records.
              APY rates are calculated based on current supply rates and may fluctuate based on
              market conditions and utilization rates.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-3 py-1 rounded-full bg-dark-800 text-xs text-dark-300">
                🔐 Audited Smart Contracts
              </span>
              <span className="px-3 py-1 rounded-full bg-dark-800 text-xs text-dark-300">
                📊 Real-time APY Updates
              </span>
              <span className="px-3 py-1 rounded-full bg-dark-800 text-xs text-dark-300">
                🌐 Multi-chain Support
              </span>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default Protocols;
