import { Candle, StockQuote, TimeRange, SearchResult } from '../types';

// PROXY CONFIGURATION
// We use a rotation strategy with stickiness.
// We try the last successful proxy first. If it fails, we rotate.
const PROXIES = [
  { url: 'https://corsproxy.io/?', type: 'raw', timeout: 12000 },              // Usually fastest
  { url: 'https://api.allorigins.win/raw?url=', type: 'raw', timeout: 12000 }, // Very reliable
  { url: 'https://api.codetabs.com/v1/proxy?quest=', type: 'raw', timeout: 15000 } // Good backup
];

const YAHOO_DOMAINS = [
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com'
];

let currentProxyIndex = 0; // Sticky proxy index

const getRandomDomain = () => YAHOO_DOMAINS[Math.floor(Math.random() * YAHOO_DOMAINS.length)];

// Short cache for near-realtime feel
const REQUEST_CACHE = new Map<string, { data: any, ts: number }>();
const CACHE_TTL = 2000; // 2 seconds (aggressive for realtime feel)

const fetchWithRetry = async (path: string, skipCache = false): Promise<any> => {
  const cacheKey = path;
  
  if (!skipCache) {
    const cached = REQUEST_CACHE.get(cacheKey);
    if (cached && (Date.now() - cached.ts < CACHE_TTL)) {
      return cached.data;
    }
  }

  let lastError: any;
  
  // Try proxies starting from the current sticky index
  for (let i = 0; i < PROXIES.length; i++) {
    const index = (currentProxyIndex + i) % PROXIES.length;
    const proxy = PROXIES[index];
    
    const targetUrl = `https://${getRandomDomain()}/${path}`;
    const url = `${proxy.url}${encodeURIComponent(targetUrl)}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), proxy.timeout);

      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'Origin': window.location.origin } 
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) continue;

      let data;
      if (proxy.type === 'wrapper') {
        const wrapper = await response.json();
        if (wrapper?.contents) {
          try { 
            data = typeof wrapper.contents === 'string' ? JSON.parse(wrapper.contents) : wrapper.contents; 
          } catch { continue; }
        } else { continue; }
      } else {
        const text = await response.text();
        try { data = JSON.parse(text); } catch { continue; }
      }

      // Check for Yahoo errors
      if (data.chart?.error || data.quoteResponse?.error) {
         if (data.chart?.error?.code === 'Not Found') throw new Error("Symbol not found");
         continue; 
      }

      // Success - Update sticky index
      currentProxyIndex = index;
      REQUEST_CACHE.set(cacheKey, { data, ts: Date.now() });
      return data;

    } catch (e: any) {
      lastError = e;
      if (e.message === "Symbol not found") throw e;
      // Continue to next proxy
    }
  }
  
  const msg = lastError?.message || 'Unable to fetch price data.';
  if (msg.includes('aborted') || lastError?.name === 'AbortError') {
      throw new Error('Network slow. Retrying...');
  }
  throw new Error(msg);
};

export const isMarketOpen = (): boolean => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + (3600000 * 5.5));
  
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const day = ist.getDay();

  if (day === 0 || day === 6) return false;
  
  const current = hours * 60 + minutes;
  // 9:15 AM to 3:30 PM
  return current >= 555 && current <= 930;
};

const validateSymbol = (symbol: string) => symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;

export const fetchStockData = async (symbol: string, range: TimeRange = '1d'): Promise<{ meta: any, candles: Candle[] }> => {
  const validSymbol = validateSymbol(symbol);
  
  const intervalMap: Record<string, string> = {
    '1d': '2m', '5d': '15m', '1mo': '1h', '3mo': '1d', '1y': '1d'
  };
  const interval = intervalMap[range] || '1d';

  // LOGIC FROM REFERENCE: Add _t={Date.now()} to bust cache
  const t = Date.now();
  const path = `v8/finance/chart/${validSymbol}?interval=${interval}&range=${range}&_t=${t}`;
  
  const data = await fetchWithRetry(path);
  
  if (!data.chart?.result?.[0]) throw new Error(`No chart data for ${symbol}`);

  const result = data.chart.result[0];
  const quote = result.indicators.quote[0];
  const timestamps = result.timestamp || [];
  
  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (quote.close[i] !== null && quote.close[i] !== undefined) {
      candles.push({
        timestamp: timestamps[i] * 1000,
        open: quote.open[i] ?? quote.close[i],
        high: quote.high[i] ?? quote.close[i],
        low: quote.low[i] ?? quote.close[i],
        close: quote.close[i],
        volume: quote.volume[i] ?? 0
      });
    }
  }

  return { meta: result.meta, candles };
};

// FAST PARALLEL FETCHING
export const fetchQuotes = async (symbols: string[]): Promise<Record<string, StockQuote>> => {
  if (!symbols || symbols.length === 0) return {};
  
  const uniqueSymbols = [...new Set(symbols.map(validateSymbol))];
  const results: Record<string, StockQuote> = {};

  const promises = uniqueSymbols.map(async (sym) => {
    try {
      const quote = await fetchQuote(sym);
      results[sym] = quote;
    } catch (e) {
      console.warn(`Failed to fetch ${sym}`);
    }
  });

  await Promise.all(promises);
  return results;
};

export const fetchQuote = async (symbol: string): Promise<StockQuote> => {
  const validSymbol = validateSymbol(symbol);
  const t = Date.now();

  // LOGIC FROM REFERENCE FOR FAST LIVE QUOTE
  // Uses v8 chart endpoint with 1m interval and useYfid=true
  // This is faster and lighter than the full history fetch
  const path = `v8/finance/chart/${validSymbol}?interval=1m&range=1d&useYfid=true&_t=${t}`;
  
  try {
    const data = await fetchWithRetry(path);
    const result = data.chart?.result?.[0];
    
    if (!result || !result.meta) throw new Error("No data");

    const meta = result.meta;
    const prev = meta.chartPreviousClose;
    const price = meta.regularMarketPrice;

    return {
      symbol: meta.symbol,
      price: price,
      change: price - prev,
      changePercent: prev ? ((price - prev) / prev) * 100 : 0,
      timestamp: meta.regularMarketTime * 1000,
      currency: meta.currency,
      volume: meta.regularMarketVolume,
      marketState: isMarketOpen() ? 'OPEN' : 'CLOSED',
    };
  } catch (e) {
     throw e; 
  }
};

export const searchStocks = async (query: string): Promise<SearchResult[]> => {
  if (query.length < 2) return [];
  const path = `v1/finance/search?q=${query}&quotesCount=6&newsCount=0`;
  try {
    const data = await fetchWithRetry(path);
    return (data.quotes || [])
      .filter((q: any) => q.symbol?.endsWith('.NS') && q.quoteType === 'EQUITY')
      .map((q: any) => ({
        symbol: q.symbol,
        shortname: q.shortname || q.longname || q.symbol,
        exch: q.exchDisp || 'NSE',
        typeDisplay: 'Equity'
      }));
  } catch { return []; }
};