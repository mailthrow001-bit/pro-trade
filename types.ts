export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  currency: string;
  volume: number;
  marketState: 'OPEN' | 'CLOSED' | 'PRE' | 'POST';
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: number;
  total: number;
}

export interface PortfolioItem {
  symbol: string;
  quantity: number;
  avgPrice: number;
}

export interface UserStats {
  wins: number;
  losses: number;
  totalTrades: number;
  bestTrade: number;
  worstTrade: number;
  totalProfitLoss: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  balance: number;
  portfolio: PortfolioItem[];
  watchlist: string[]; // List of symbols
  trades: Trade[];
  stats: UserStats;
}

export interface SearchResult {
  symbol: string;
  shortname: string;
  exch: string;
  typeDisplay: string;
}

export type TimeRange = '1d' | '5d' | '1mo' | '3mo' | '1y';