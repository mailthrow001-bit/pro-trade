import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { loadUser, saveUser, resetAccount, toggleWatchlist, executeTrade } from './services/store';
import { fetchQuote, fetchStockData, fetchQuotes, isMarketOpen, searchStocks } from './services/api';
import { User, StockQuote, Trade, SearchResult } from './types';
import { Icons } from './constants';
import { ResponsiveContainer, YAxis, AreaChart, Area, XAxis, Tooltip, BarChart, Bar } from 'recharts';

// --- Components ---

const Navigation = () => {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium transition-colors ${
      isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur border-t border-slate-200 flex justify-around items-center z-50 pb-safe pb-2">
      <NavLink to="/" className={navClass} end><Icons.Home size={20} /><span>Home</span></NavLink>
      <NavLink to="/watchlist" className={navClass}><Icons.List size={20} /><span>Watch</span></NavLink>
      <NavLink to="/portfolio" className={navClass}><Icons.Briefcase size={20} /><span>Port</span></NavLink>
      <NavLink to="/stats" className={navClass}><Icons.PieChart size={20} /><span>Stats</span></NavLink>
      <NavLink to="/settings" className={navClass}><Icons.Settings size={20} /><span>Set</span></NavLink>
    </nav>
  );
};

// --- Pages ---

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [marketStatus, setMarketStatus] = useState(isMarketOpen());
  const [portfolioValue, setPortfolioValue] = useState(0);

  useEffect(() => {
    // Initial calculation based on stored values (immediate render)
    const invested = user.portfolio.reduce((acc, item) => acc + (item.quantity * item.avgPrice), 0);
    setPortfolioValue(invested);
    
    // Background update of market status
    const interval = setInterval(() => setMarketStatus(isMarketOpen()), 60000);
    return () => clearInterval(interval);
  }, [user]);

  const totalValue = user.balance + portfolioValue;

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hello, {user.name.split(' ')[0]}</h1>
          <p className="text-sm text-slate-500">Welcome back to the market.</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${marketStatus ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
          <div className={`w-2 h-2 rounded-full ${marketStatus ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
          {marketStatus ? 'OPEN' : 'CLOSED'}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 shadow-sm relative overflow-hidden bg-white border border-slate-100">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-10 -mt-10 blur-2xl opacity-50"></div>
        <div className="relative z-10">
          <p className="text-slate-500 text-sm font-medium mb-1">Total Net Worth</p>
          <h2 className="text-3xl font-bold text-slate-900">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h2>
          <div className="mt-4 flex gap-4">
            <div>
              <p className="text-xs text-slate-400">Available Cash</p>
              <p className="text-lg font-semibold text-slate-700">₹{user.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Invested</p>
              <p className="text-lg font-semibold text-slate-700">₹{portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Recent Activity</h3>
        {user.trades.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-100">
            <p className="text-slate-400">No trades yet. Start watching stocks!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {user.trades.slice(0, 3).map((trade) => (
              <div key={trade.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${trade.type === 'BUY' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {trade.type === 'BUY' ? <Icons.TrendingUp size={18} /> : <Icons.TrendingDown size={18} />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{trade.symbol.replace('.NS', '')}</p>
                    <p className="text-xs text-slate-500">{new Date(trade.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">
                    {trade.quantity} @ ₹{trade.price.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-400">Total: ₹{(trade.quantity * trade.price).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Watchlist: React.FC<{ user: User, onSelect: (s: string) => void, onToggleWatch: (s: string) => void }> = ({ user, onSelect, onToggleWatch }) => {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        const results = await searchStocks(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 400); // slightly faster debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let mounted = true;
    const loadQuotes = async () => {
      if (user.watchlist.length === 0) return;
      
      // Batch fetch is much faster
      try {
        const newQuotes = await fetchQuotes(user.watchlist);
        if (mounted) {
            setQuotes(prev => ({ ...prev, ...newQuotes }));
            setLastUpdated(Date.now());
        }
      } catch (e) {
        console.error("Watchlist sync failed", e);
      }
    };

    loadQuotes();
    const interval = setInterval(loadQuotes, 5000); // Poll every 5 seconds for realtime feel
    return () => { mounted = false; clearInterval(interval); };
  }, [user.watchlist]);

  return (
    <div className="p-4 pb-24 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Watchlist</h1>
        {lastUpdated > 0 && (
            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-full">
                Updated {new Date(lastUpdated).toLocaleTimeString()}
            </span>
        )}
      </div>
      
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Icons.Search size={18} />
        </div>
        <input 
          type="text" value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search stocks (e.g., RELIANCE)..." 
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {searchQuery.length >= 2 && (
        <div className="mb-6 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-20 absolute left-4 right-4 mt-[52px]">
          {searchResults.length === 0 && !isSearching ? (
             <div className="p-4 text-center text-slate-400 text-sm">No stocks found.</div>
          ) : (
             searchResults.map((result) => {
               const isWatched = user.watchlist.includes(result.symbol);
               return (
                <div key={result.symbol} className="p-3 border-b border-slate-50 last:border-none flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { onSelect(result.symbol); setSearchQuery(''); }}>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{result.symbol.replace('.NS', '')}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{result.shortname}</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleWatch(result.symbol); }} 
                    className={`p-2 rounded-full ${isWatched ? 'text-amber-400 bg-amber-50' : 'text-slate-300 hover:text-slate-400'}`}
                  >
                    <Icons.Star size={20} fill={isWatched ? "currentColor" : "none"} />
                  </button>
                </div>
               );
             })
          )}
        </div>
      )}

      <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
        {user.watchlist.map(symbol => {
          const data = quotes[symbol];
          const isUp = (data?.change ?? 0) >= 0;
          return (
            <div key={symbol} onClick={() => onSelect(symbol)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 active:scale-95 transition-transform cursor-pointer relative group">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900">{symbol.replace('.NS', '')}</h3>
                  <p className="text-xs text-slate-400">NSE</p>
                </div>
                <div className="text-right">
                  {data ? (
                    <>
                      <p className="font-bold text-slate-800">₹{data.price.toFixed(2)}</p>
                      <p className={`text-xs font-semibold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isUp ? '+' : ''}{data.change.toFixed(2)} ({data.changePercent.toFixed(2)}%)
                      </p>
                    </>
                  ) : ( <span className="text-xs text-slate-400 animate-pulse">Loading...</span> )}
                </div>
              </div>
              <button 
                  onClick={(e) => { e.stopPropagation(); onToggleWatch(symbol); }}
                  className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Icons.Minus size={14} className="text-rose-500" />
              </button>
            </div>
          );
        })}
        {user.watchlist.length === 0 && (
             <div className="text-center py-10 text-slate-400 opacity-60">
                <Icons.List size={48} className="mx-auto mb-2 opacity-50"/>
                <p>Your watchlist is empty.</p>
             </div>
        )}
      </div>
    </div>
  );
};

const TradePage: React.FC<{ symbol: string, user: User, onTrade: (t: Trade) => Promise<boolean>, onBack: () => void }> = ({ symbol, user, onTrade, onBack }) => {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [candles, setCandles] = useState<any[]>([]);
  const [qty, setQty] = useState(1);
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [range, setRange] = useState<'1d'|'1mo'|'1y'>('1d');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const loadData = async (isPoll = false) => {
      if (!isPoll) setLoading(true);
      if (!isPoll) setError(null);
      
      try {
        // Parallel fetch for speed
        const [q, { candles: c }] = await Promise.all([
            fetchQuote(symbol),
            fetchStockData(symbol, range)
        ]);
        
        if(mounted) {
            setQuote(q);
            setCandles(c);
        }
      } catch (e) { 
        console.error(e);
        if(mounted && !isPoll) setError("Market data unavailable. Please retry.");
      } finally { 
        if(mounted && !isPoll) setLoading(false); 
      }
    };

    loadData();
    // Poll every 3 seconds for realtime price and chart
    const interval = setInterval(() => loadData(true), 3000); 

    return () => { mounted = false; clearInterval(interval); };
  }, [symbol, range]);

  if (loading && !quote) return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!quote) return <div className="p-4 text-center mt-10"><p className="text-rose-500 mb-2">{error || "Data unavailable"}</p><button onClick={onBack} className="text-blue-500 underline">Go Back</button></div>;

  const total = qty * quote.price;
  const currentHolding = user.portfolio.find(p => p.symbol === symbol)?.quantity || 0;
  const canAfford = type === 'BUY' ? user.balance >= total : true;
  const hasQty = type === 'SELL' ? currentHolding >= qty : true;
  const isUp = quote.change >= 0;
  const chartColor = isUp ? "#10b981" : "#f43f5e";

  const handleTrade = async () => {
    const success = await onTrade({
      id: Date.now().toString(),
      symbol,
      type,
      quantity: qty,
      price: quote.price,
      timestamp: Date.now(),
      total
    });
    if (success) {
      setConfirming(false);
      onBack();
    }
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="p-4 border-b border-slate-100 flex items-center gap-4 sticky top-0 bg-white z-20 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full"><Icons.ChevronLeft size={24}/></button>
        <div>
          <h1 className="font-bold text-xl">{symbol.replace('.NS', '')}</h1>
          <p className="text-xs text-slate-500 flex items-center gap-1">
             {isMarketOpen() ? <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> : <span className="w-2 h-2 rounded-full bg-slate-300"/>}
             {isMarketOpen() ? 'Live Market' : 'Market Closed'}
          </p>
        </div>
      </div>

      <div className="h-64 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={candles}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="timestamp" hide />
            <Tooltip 
               contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
               formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Price']}
               labelFormatter={(label) => {
                 if (typeof label !== 'number') return '';
                 const d = new Date(label);
                 if (range === '1d') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                 if (range === '1y') return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
                 return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
               }}
            />
            <Area type="monotone" dataKey="close" stroke={chartColor} fill="url(#colorPrice)" strokeWidth={2} />
            <YAxis domain={['auto', 'auto']} hide />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex justify-center gap-4 py-2">
        {(['1d', '1mo', '1y'] as const).map(r => (
           <button key={r} onClick={() => setRange(r)} className={`px-4 py-1 rounded-full text-xs font-medium transition-colors ${range === r ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
             {r.toUpperCase()}
           </button>
        ))}
      </div>

      <div className="p-6">
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button onClick={() => setType('BUY')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'BUY' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500'}`}>BUY</button>
          <button onClick={() => setType('SELL')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'SELL' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500'}`}>SELL</button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Quantity</span>
            <div className="flex items-center gap-4">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200"><Icons.Minus size={16}/></button>
              <span className="text-xl font-bold w-12 text-center">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200"><Icons.Plus size={16}/></button>
            </div>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <span className="text-slate-500 font-medium">Est. Total</span>
            <span className="text-2xl font-bold text-slate-800">₹{total.toLocaleString('en-IN')}</span>
          </div>
          <div className="text-xs text-slate-400 flex justify-between">
              <span>Bal: ₹{user.balance.toLocaleString('en-IN')}</span>
              <span>Hold: {currentHolding}</span>
          </div>

          <button 
            onClick={() => setConfirming(true)}
            disabled={!canAfford || !hasQty}
            className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg mt-4 disabled:opacity-50 active:scale-95 transition-transform ${type === 'BUY' ? 'bg-emerald-600' : 'bg-rose-600'}`}
          >
            {type === 'BUY' ? 'Place Buy Order' : 'Place Sell Order'}
          </button>
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-2">Confirm {type}</h3>
            <p className="text-slate-600 mb-4">Are you sure you want to {type} <b>{qty}</b> shares of <b>{symbol}</b>?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirming(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-semibold hover:bg-slate-200">Cancel</button>
              <button onClick={handleTrade} className={`flex-1 py-3 rounded-xl font-semibold text-white ${type === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Portfolio: React.FC<{ user: User, onSelect: (s: string) => void }> = ({ user, onSelect }) => {
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  
  useEffect(() => {
    let mounted = true;
    const fetchPrices = async () => {
      if (user.portfolio.length === 0) return;
      const symbols = user.portfolio.map(p => p.symbol);
      
      // Batch fetch for portfolio
      try {
        const quotes = await fetchQuotes(symbols);
        if (!mounted) return;
        
        const prices: Record<string, number> = {};
        for (const symbol of symbols) {
          if (quotes[symbol]) prices[symbol] = quotes[symbol].price;
        }
        setCurrentPrices(prev => ({ ...prev, ...prices }));
      } catch (e) {
         console.error("Portfolio sync failed");
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000); // 5s refresh for realtime P&L
    return () => { mounted = false; clearInterval(interval); };
  }, [user.portfolio]);

  const totalInvested = user.portfolio.reduce((acc, p) => acc + (p.quantity * p.avgPrice), 0);
  const currentValue = user.portfolio.reduce((acc, p) => acc + (p.quantity * (currentPrices[p.symbol] || p.avgPrice)), 0);
  const totalPnL = currentValue - totalInvested;

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Portfolio</h1>
      <div className="bg-white p-6 rounded-2xl mb-6 shadow-sm border border-slate-100">
        <p className="text-sm text-slate-500">Total Portfolio Value</p>
        <h2 className="text-3xl font-bold text-slate-900">₹{currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h2>
        <div className={`flex items-center gap-1 mt-2 font-semibold ${totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
           {totalPnL >= 0 ? <Icons.TrendingUp size={16}/> : <Icons.TrendingDown size={16}/>}
           <span>₹{Math.abs(totalPnL).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      <div className="space-y-3">
        {user.portfolio.length === 0 ? <div className="text-center text-slate-400 mt-10">No holdings yet.</div> : user.portfolio.map(item => {
           const curr = currentPrices[item.symbol] || item.avgPrice;
           const pnl = (curr - item.avgPrice) * item.quantity;
           const isProfitable = pnl >= 0;
           return (
            <div key={item.symbol} onClick={() => onSelect(item.symbol)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer active:scale-95 transition-transform">
              <div>
                <h3 className="font-bold text-slate-900">{item.symbol.replace('.NS', '')}</h3>
                <p className="text-xs text-slate-500">{item.quantity} shares • Avg ₹{item.avgPrice.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">₹{(item.quantity * curr).toLocaleString('en-IN')}</p>
                <p className={`text-xs font-semibold ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {isProfitable ? '+' : ''}{pnl.toFixed(2)}
                </p>
              </div>
            </div>
           );
        })}
      </div>
    </div>
  );
};

const Stats: React.FC<{ user: User }> = ({ user }) => {
  const { wins, losses, totalTrades, bestTrade, worstTrade, totalProfitLoss } = user.stats;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Statistics</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
          <p className="text-xs text-slate-400 font-bold uppercase">Win Rate</p>
          <p className="text-2xl font-bold text-slate-800">{winRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
          <p className="text-xs text-slate-400 font-bold uppercase">Total P&L</p>
          <p className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {totalProfitLoss >= 0 ? '+' : ''}₹{Math.abs(totalProfitLoss).toLocaleString('en-IN')}
          </p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm h-64">
        <h3 className="font-bold text-slate-800 mb-4">Trade Summary</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[{ name: 'Wins', val: wins, fill: '#10b981' }, { name: 'Losses', val: losses, fill: '#f43f5e' }]}>
            <XAxis dataKey="name" />
            <Bar dataKey="val" radius={[4, 4, 0, 0]} barSize={60} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Settings: React.FC<{ onReset: () => void }> = ({ onReset }) => (
  <div className="p-4 pb-20">
    <h1 className="text-2xl font-bold text-slate-800 mb-6">Settings</h1>
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Account Actions</h3>
        </div>
        <button onClick={() => { if(window.confirm("Are you sure? This will reset your portfolio and balance.")) onReset(); }} className="w-full text-left p-4 text-rose-600 hover:bg-rose-50 font-medium transition-colors">
          Reset Portfolio & Balance
        </button>
    </div>
    <div className="mt-8 text-center text-xs text-slate-400">
        <p>IndiTrade Pro v1.0.0</p>
        <p>Real Data provided by Yahoo Finance</p>
        <p className="mt-2 text-[10px] uppercase tracking-widest opacity-60">Zero Mocks • Production Ready</p>
      </div>
  </div>
);

// --- Main App Logic ---

const AppContent = () => {
  const [user, setUser] = useState<User>(loadUser());
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  
  const handleTradeExecution = async (trade: Trade): Promise<boolean> => {
    try {
      const newUser = executeTrade(user, trade);
      setUser(newUser);
      return true;
    } catch (e: any) {
      alert(e.message);
      return false;
    }
  };

  if (selectedStock) {
    return <TradePage symbol={selectedStock} user={user} onTrade={handleTradeExecution} onBack={() => setSelectedStock(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="max-w-md mx-auto min-h-screen relative shadow-2xl bg-slate-50 overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/watchlist" element={<Watchlist user={user} onSelect={setSelectedStock} onToggleWatch={(s) => setUser(toggleWatchlist(user, s))} />} />
          <Route path="/portfolio" element={<Portfolio user={user} onSelect={setSelectedStock} />} />
          <Route path="/stats" element={<Stats user={user} />} />
          <Route path="/settings" element={<Settings onReset={() => setUser(resetAccount())} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Navigation />
      </div>
    </div>
  );
};

const App = () => (
  <HashRouter>
    <AppContent />
  </HashRouter>
);

export default App;