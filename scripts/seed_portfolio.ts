import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function seedPortfolioTransactions() {
  try {
    // 1. Get the first portfolio ID
    const { data: portfolios, error: portfolioError } = await supabase
      .from('portfolios')
      .select('id')
      .limit(1);

    if (portfolioError || !portfolios || portfolios.length === 0) {
      console.error('No portfolios found or error fetching portfolios:', portfolioError);
      return;
    }

    const portfolioId = portfolios[0].id;
    console.log(`Seeding transactions for Portfolio ID: ${portfolioId}`);

    // 2. Prepare transaction data from the user's image
    // Note: Assuming 'commission' is roughly calculated or 0 for now as it's not explicitly in the image per transaction,
    // but the user mentioned commission issues earlier. Let's calculate cost basis accurately.
    // Cost Value in image = (Volume * Avg Cost).
    // We will insert BUY transactions to match these holdings.
    
    const transactions = [
      { ticker: 'BKIH', volume: 500, price: 309.35, commission: 0 },
      { ticker: 'CPNREIT', volume: 9900, price: 10.07, commission: 0 },
      { ticker: 'HTC', volume: 10100, price: 15.52, commission: 0 },
      { ticker: 'ICHI', volume: 19000, price: 13.72, commission: 0 },
      { ticker: 'INETREIT', volume: 5900, price: 8.36, commission: 0 },
      { ticker: 'MC', volume: 19500, price: 11.01, commission: 0 },
      { ticker: 'MEGA', volume: 5600, price: 33.54, commission: 0 },
      { ticker: 'SCB', volume: 1200, price: 141.66, commission: 0 },
      { ticker: 'TACC', volume: 23400, price: 5.26, commission: 0 },
      { ticker: 'TISCO', volume: 2200, price: 111.13, commission: 0 },
      { ticker: 'TLI', volume: 17300, price: 9.76, commission: 0 },
      { ticker: 'TTW', volume: 14000, price: 9.36, commission: 0 },
      { ticker: 'TU', volume: 15600, price: 10.51, commission: 0 }
    ];

    // 3. Clear existing transactions for this portfolio to avoid duplicates (optional, but good for seeding)
    // await supabase.from('portfolio_transactions').delete().eq('portfolio_id', portfolioId);

    // 4. Insert transactions
    const insertData = transactions.map(t => ({
      portfolio_id: portfolioId,
      ticker: t.ticker,
      type: 'BUY',
      volume: t.volume,
      price: t.price,
      commission: t.commission,
      transaction_date: new Date().toISOString(),
      notes: 'Imported from image'
    }));

    const { error: insertError } = await supabase
      .from('portfolio_transactions')
      .insert(insertData);

    if (insertError) {
      console.error('Error inserting transactions:', insertError);
    } else {
      console.log('Successfully seeded portfolio transactions!');
    }

  } catch (err) {
    console.error('Unexpected error seeding database:', err);
  }
}
