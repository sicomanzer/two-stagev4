const { createClient } = require('@supabase/supabase-js');
const YahooFinance = require('yahoo-finance2').default;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeDividendYield(value) {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
}

async function withRetry(fn, { retries = 3, baseDelayMs = 1500 } = {}) {
  let lastErr = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn(i);
    } catch (e) {
      lastErr = e;
      const wait = baseDelayMs * Math.pow(2, i);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function listTickers() {
  const { data, error } = await supabase.from('stock_fundamentals').select('ticker').limit(2000);
  if (error) throw new Error(`Supabase list tickers failed: ${error.message}`);
  return (data || []).map((r) => r.ticker).filter(Boolean);
}

async function upsertBatch(rows) {
  if (!rows.length) return;
  const { error } = await supabase
    .from('stock_market_snapshot')
    .upsert(rows, { onConflict: 'ticker' });
  if (error) throw new Error(`Supabase upsert snapshot failed: ${error.message}`);
}

async function main() {
  const batchSize = Number(process.env.SNAPSHOT_BATCH_SIZE || 120);
  const throttleMs = Number(process.env.SNAPSHOT_THROTTLE_MS || 800);

  console.log('Loading tickers from Supabase...');
  const tickers = await listTickers();
  console.log(`Found ${tickers.length} tickers`);

  const yf = new YahooFinance();
  let done = 0;
  let ok = 0;

  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    const symbols = batch.map((t) => `${t}.BK`);

    const quotes = await withRetry(async () => {
      return await yf.quote(symbols);
    });

    const nowIso = new Date().toISOString();
    const rows = [];
    const received = new Set();

    for (const q of quotes || []) {
      const symbol = (q.symbol || '').replace('.BK', '');
      if (!symbol) continue;
      received.add(symbol);
      rows.push({
        ticker: symbol,
        price: q.regularMarketPrice ?? null,
        pe: q.trailingPE ?? null,
        pbv: q.priceToBook ?? null,
        dividend_yield: normalizeDividendYield(q.dividendYield),
        updated_at: nowIso
      });
    }

    for (const t of batch) {
      if (received.has(t)) continue;
      rows.push({
        ticker: t,
        price: null,
        pe: null,
        pbv: null,
        dividend_yield: null,
        updated_at: nowIso
      });
    }

    await upsertBatch(rows);
    done += batch.length;
    ok += received.size;
    process.stdout.write(`\r✅ Updated ${done}/${tickers.length} tickers (${ok} quotes, ${done - ok} missing)   `);

    if (i + batchSize < tickers.length) {
      await sleep(throttleMs);
    }
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error('\n❌ Snapshot update failed:', e?.message || e);
  process.exit(1);
});
