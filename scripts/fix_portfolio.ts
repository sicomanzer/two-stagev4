
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Data from user screenshot
const holdings = [
  { ticker: 'BKIH', volume: 500, totalCost: 154676.90 },
  { ticker: 'CPNREIT', volume: 9900, totalCost: 99657.36 },
  { ticker: 'HTC', volume: 10100, totalCost: 156728.77 },
  { ticker: 'ICHI', volume: 19000, totalCost: 260598.30 },
  { ticker: 'INETREIT', volume: 5900, totalCost: 49347.60 },
  { ticker: 'MC', volume: 19500, totalCost: 214745.70 },
  { ticker: 'MEGA', volume: 5600, totalCost: 187815.04 },
  { ticker: 'SCB', volume: 1200, totalCost: 169994.40 },
  { ticker: 'TACC', volume: 23400, totalCost: 123018.48 },
  { ticker: 'TISCO', volume: 2200, totalCost: 244479.62 },
  { ticker: 'TLI', volume: 17300, totalCost: 168868.76 },
  { ticker: 'TTW', volume: 14000, totalCost: 131049.80 },
  { ticker: 'TU', volume: 15600, totalCost: 163987.20 }
];

async function fixPortfolio() {
  try {
    // 1. Get the target portfolio ID
    // Using the ID found in previous steps: 1bee89df-dca8-4060-b148-692fd84e219f
    const portfolioId = '1bee89df-dca8-4060-b148-692fd84e219f'; 
    console.log(`Fixing transactions for Portfolio ID: ${portfolioId}`);

    // 2. Delete existing transactions for this portfolio to start fresh
    const { error: deleteError } = await supabase
      .from('portfolio_transactions')
      .delete()
      .eq('portfolio_id', portfolioId);

    if (deleteError) {
      console.error('Error deleting old transactions:', deleteError);
      return;
    }
    console.log('Deleted old transactions.');

    // 3. Calculate and Insert new transactions
    const transactions = holdings.map(h => {
      // Reverse engineer Price and Commission assuming ~0.168% (VAT included) commission structure
      // TotalCost = (Price * Volume) + Commission
      // Commission ~= (Price * Volume) * 0.0016799
      // TotalCost ~= (Price * Volume) * 1.0016799
      // Price ~= TotalCost / (Volume * 1.0016799)
      
      const estimatedPrice = h.totalCost / (h.volume * 1.0016799);
      // Round price to 2 decimals for realistic input
      const price = Math.floor(estimatedPrice * 100) / 100; 
      
      // Calculate exact commission needed to match TotalCost
      // Commission = TotalCost - (Price * Volume)
      const commission = h.totalCost - (price * h.volume);

      return {
        portfolio_id: portfolioId,
        ticker: h.ticker,
        type: 'BUY',
        volume: h.volume,
        price: price,
        commission: commission, // This ensures Total Cost matches exactly
        transaction_date: new Date().toISOString(),
        notes: 'Fixed data from screenshot'
      };
    });

    const { error: insertError } = await supabase
      .from('portfolio_transactions')
      .insert(transactions);

    if (insertError) {
      console.error('Error inserting new transactions:', insertError);
    } else {
      console.log('Successfully updated portfolio transactions with exact costs!');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

fixPortfolio();
