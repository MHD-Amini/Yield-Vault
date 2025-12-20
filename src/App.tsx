import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Protocols from './pages/Protocols';
import Bridge from './pages/Bridge';
import Analytics from './pages/Analytics';

type Page = 'dashboard' | 'portfolio' | 'protocols' | 'bridge' | 'analytics';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'portfolio':
        return <Portfolio />;
      case 'protocols':
        return <Protocols />;
      case 'bridge':
        return <Bridge />;
      case 'analytics':
        return <Analytics />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-mesh">
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'glass-card text-white',
          style: {
            background: 'rgba(15, 23, 42, 0.9)',
            color: '#fff',
            border: '1px solid rgba(71, 85, 105, 0.5)',
          },
        }}
      />
      
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent-purple/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-accent-blue/10 rounded-full blur-3xl animate-pulse-slow animation-delay-200" />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-accent-cyan/15 rounded-full blur-3xl animate-pulse-slow animation-delay-500" />
      </div>
      
      <Header currentPage={currentPage} onNavigate={setCurrentPage} />
      
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {renderPage()}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-dark-800 mt-16">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔷</span>
              <span className="font-bold gradient-text">YieldVault</span>
            </div>
            <p className="text-dark-400 text-sm">
              Cross-Chain DeFi Yield Aggregator • Built with LayerZero & The Graph
            </p>
            <div className="flex items-center gap-6 text-dark-400">
              <a href="#" className="hover:text-white transition-colors">Docs</a>
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
              <a href="#" className="hover:text-white transition-colors">Discord</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
