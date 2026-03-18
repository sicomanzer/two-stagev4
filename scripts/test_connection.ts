
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manually load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  // Mask the key for security in logs
  console.log(`URL: ${supabaseUrl}`);
  
  try {
    // Try to fetch one row from portfolio_transactions
    const { data, error, count } = await supabase
      .from('portfolio_transactions')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    console.log('✅ Connection successful!');
    console.log(`Total transactions in DB: ${count}`);
    
    // Fetch top 5 rows
    const { data: rows, error: rowsError } = await supabase
      .from('portfolio_transactions')
      .select('ticker, type, volume, price, transaction_date')
      .order('transaction_date', { ascending: false })
      .limit(5);

    if (rowsError) throw rowsError;

    console.log(`Latest 5 transactions:`);
    if (rows && rows.length > 0) {
        rows.forEach(row => {
            console.log(`- ${row.transaction_date?.split('T')[0]} ${row.ticker}: ${row.type} ${row.volume} @ ${row.price}`);
        });
    } else {
        console.log('No transactions found.');
    }

  } catch (err: any) {
    console.error('❌ Connection failed:', err.message);
    if (err.hint) console.error('Hint:', err.hint);
  }
}

testConnection();
