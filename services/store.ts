import { User, Trade, PortfolioItem } from '../types';

const STORAGE_KEY = 'inditrade_user_v1';
const INITIAL_BALANCE = 1000000; // 10 Lakhs

const DEFAULT_USER: User = {
  id: 'user_1',
  email: 'trader@example.com',
  name: 'Pro Trader',
  balance: INITIAL_BALANCE,
  portfolio: [],
  watchlist: ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS'],
  trades: [],
  stats: {
    wins: 0,
    losses: 0,
    totalTrades: 0,
    bestTrade: 0,
    worstTrade: 0,
    totalProfitLoss: 0,
  }
};

export const loadUser = (): User => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      
      // SELF-HEALING LOGIC: Fix corrupted data from previous versions/bugs
      let dirty = false;
      
      // Fix NaN Balance
      if (typeof user.balance !== 'number' || isNaN(user.balance)) {
        user.balance = INITIAL_BALANCE;
        dirty = true;
      }
      
      // Fix Corrupted Portfolio
      if (!Array.isArray(user.portfolio)) {
        user.portfolio = [];
        dirty = true;
      }

      // Fix NaN stats
      if (isNaN(user.stats?.totalProfitLoss)) {
        user.stats = { ...DEFAULT_USER.stats };
        dirty = true;
      }

      if (dirty) {
        saveUser(user);
      }
      return user;
    }
  } catch (e) {
    console.error("Failed to load user", e);
  }
  saveUser(DEFAULT_USER);
  return DEFAULT_USER;
};

export const saveUser = (user: User) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

export const executeTrade = (currentUser: User, trade: Trade): User => {
  // 1. Create a Deep Copy
  const user = JSON.parse(JSON.stringify(currentUser));
  
  // 2. Validate Inputs Strict
  if (!trade.price || isNaN(trade.price) || trade.price <= 0) {
    throw new Error("Invalid price data. Please try again.");
  }
  if (!trade.quantity || isNaN(trade.quantity) || trade.quantity <= 0) {
    throw new Error("Invalid quantity.");
  }

  const tradeValue = trade.quantity * trade.price;

  if (trade.type === 'BUY') {
    // --- BUY LOGIC ---
    
    // Check Balance
    if (user.balance < tradeValue) {
      throw new Error(`Insufficient Balance. Required: ₹${tradeValue.toLocaleString()}, Available: ₹${user.balance.toLocaleString()}`);
    }

    // Deduct Cash
    user.balance -= tradeValue;

    // Update Portfolio
    const existingItemIndex = user.portfolio.findIndex((p: PortfolioItem) => p.symbol === trade.symbol);

    if (existingItemIndex !== -1) {
      // Stock exists: Calculate Weighted Average Price
      const item = user.portfolio[existingItemIndex];
      const previousTotalCost = item.quantity * item.avgPrice;
      const newTotalCost = previousTotalCost + tradeValue;
      const newTotalQty = item.quantity + trade.quantity;
      
      item.quantity = newTotalQty;
      item.avgPrice = newTotalCost / newTotalQty; 
    } else {
      // New Stock
      user.portfolio.push({
        symbol: trade.symbol,
        quantity: trade.quantity,
        avgPrice: trade.price
      });
    }

  } else {
    // --- SELL LOGIC ---

    const existingItemIndex = user.portfolio.findIndex((p: PortfolioItem) => p.symbol === trade.symbol);
    
    if (existingItemIndex === -1) {
      throw new Error("You do not own this stock.");
    }

    const item = user.portfolio[existingItemIndex];

    if (item.quantity < trade.quantity) {
      throw new Error(`Insufficient shares. Owned: ${item.quantity}, Trying to Sell: ${trade.quantity}`);
    }

    // Add Cash
    user.balance += tradeValue;

    // Calculate Realized P&L
    const costBasisForSoldShares = trade.quantity * item.avgPrice;
    const realizedPnL = tradeValue - costBasisForSoldShares;

    // Update Stats
    user.stats.totalTrades += 1;
    user.stats.totalProfitLoss += realizedPnL;
    
    if (realizedPnL > 0) {
      user.stats.wins += 1;
      user.stats.bestTrade = Math.max(user.stats.bestTrade, realizedPnL);
    } else {
      user.stats.losses += 1;
      user.stats.worstTrade = Math.min(user.stats.worstTrade, realizedPnL); 
    }

    // Update Portfolio Quantity
    item.quantity -= trade.quantity;

    // Remove if 0
    if (item.quantity <= 0) {
      user.portfolio.splice(existingItemIndex, 1);
    }
  }

  // Add to History
  user.trades.unshift(trade);

  // Persist
  saveUser(user);
  
  return user;
};

export const resetAccount = (): User => {
  saveUser(DEFAULT_USER);
  return DEFAULT_USER;
};

export const toggleWatchlist = (currentUser: User, symbol: string): User => {
  const user = { ...currentUser, watchlist: [...currentUser.watchlist] };
  const idx = user.watchlist.indexOf(symbol);
  
  if (idx !== -1) {
    user.watchlist.splice(idx, 1);
  } else {
    user.watchlist.push(symbol);
  }
  
  saveUser(user);
  return user;
};