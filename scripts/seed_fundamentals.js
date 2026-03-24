
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// MUST USE SERVICE ROLE KEY TO BYPASS RLS AND INSERT DATA!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  // Read local cache file
  const cachePath = path.join(__dirname, '..', 'data', 'fundamentals-cache.json');
  if (!fs.existsSync(cachePath)) {
    console.error("❌ Cache file not found:", cachePath);
    return;
  }

  console.log("Loading cache file...");
  const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const tickers = cacheData.tickers || cacheData; // support both formats
  const tickerKeys = Object.keys(tickers);
  
  console.log(`Found ${tickerKeys.length} tickers. Starting upload to Supabase...`);
  let successCount = 0;

  for (let i = 0; i < tickerKeys.length; i++) {
    const symbol = tickerKeys[i];
    const data = tickers[symbol];
    if (!data.history) continue;

    const { error } = await supabase.from('stock_fundamentals').upsert({
      ticker: symbol,
      company_name: data.companyName || null,
      sector: data.sector || null,
      industry: data.industry || null,
      history: data.history,
      updated_at: new Date().toISOString()
    }, { onConflict: 'ticker' });

    if (error) {
      console.error(`❌ Failed ${symbol}:`, error.message);
    } else {
      successCount++;
      process.stdout.write(`\r✅ Uploaded ${successCount}/${tickerKeys.length} (${symbol})    `);
    }
  }

  console.log(`\n\n🎉 Done! Successfully seeded ${successCount} stocks to Supabase.`);
}

seed();
