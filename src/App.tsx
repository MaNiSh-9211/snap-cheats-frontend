import React, { useState } from 'react';
import Login from './components/Login';
import TextMode from './components/TextMode';
import ImageMode from './components/ImageMode';
import { Layout, Type, Image as ImageIcon, LogOut, Menu, X } from 'lucide-react';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  if (!token) {
    return <Login setToken={setToken} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <nav className="border-b border-white/5 bg-slate-900/40 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                <Layout className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter text-white leading-none">SnapCheats</span>
                <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase mt-1">Admin Pro</span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-3 md:space-x-6">
              <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5 shadow-inner">
                <button
                  onClick={() => setMode('text')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                    mode === 'text' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Type className="w-4 h-4" />
                  <span className="text-sm font-bold">Text Mode</span>
                </button>
                <button
                  onClick={() => setMode('image')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                    mode === 'image' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-sm font-bold">Image Mode</span>
                </button>
              </div>
              
              <div className="h-8 w-px bg-white/5 mx-2" />
              
              <button
                onClick={handleLogout}
                className="group flex items-center space-x-2 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all border border-transparent hover:border-red-400/20"
                title="Logout"
              >
                <span className="text-xs font-bold">Logout</span>
                <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-20 inset-x-0 bg-slate-900 border-b border-white/5 shadow-2xl py-4 px-4 flex flex-col space-y-2">
            <button
              onClick={() => { setMode('text'); setIsMobileMenuOpen(false); }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                mode === 'text' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Type className="w-5 h-5" />
              <span className="font-bold">Text Mode</span>
            </button>
            <button
              onClick={() => { setMode('image'); setIsMobileMenuOpen(false); }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                mode === 'image' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ImageIcon className="w-5 h-5" />
              <span className="font-bold">Image Mode</span>
            </button>
            <div className="h-px w-full bg-white/5 my-2" />
            <button
              onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
              className="flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-bold">Logout</span>
            </button>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-80px)] overflow-y-auto overflow-x-hidden lg:overflow-hidden">
        <div className="h-full">
          {mode === 'text' ? <TextMode /> : <ImageMode />}
        </div>
      </main>
    </div>
  );
};

export default App;
