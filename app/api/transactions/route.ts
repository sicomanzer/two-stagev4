import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolio_id = searchParams.get('portfolio_id');
    const ticker = searchParams.get('ticker'); // Optional filter by ticker

    if (!portfolio_id) {
      return NextResponse.json({ error: 'Portfolio ID is required' }, { status: 400 });
    }

    let query = supabase
      .from('portfolio_transactions')
      .select('*')
      .eq('portfolio_id', portfolio_id)
      .order('transaction_date', { ascending: true });

    // If ticker is provided, return raw transactions for that ticker (for history view)
    if (ticker) {
      query = query.eq('ticker', ticker);
      const { data: transactions, error } = await query;
      if (error) throw error;
      return NextResponse.json(transactions);
    }

    // Otherwise, calculate holdings summary
    const { data: transactions, error } = await query;
    if (error) throw error;

    // Calculate Holdings
    const holdings: Record<string, any> = {};

    transactions.forEach((tx: any) => {
      const { ticker, type, volume, price, commission = 0 } = tx;
      
      if (!holdings[ticker]) {
        holdings[ticker] = {
          ticker,
          actualVol: 0,
          avgCost: 0,
          totalCost: 0,
          realizedPL: 0,
        };
      }

      const h = holdings[ticker];
      const comm = Number(commission) || 0;

      if (type === 'BUY') {
        const cost = (volume * price) + comm; // Add commission to cost
        h.totalCost += cost;
        h.actualVol += volume;
        // Recalculate Avg Cost
        if (h.actualVol > 0) {
          h.avgCost = h.totalCost / h.actualVol;
        }
      } else if (type === 'SELL') {
        // Realized P/L Calculation (FIFO is complex, using Avg Cost for simplicity in this version)
        const costBasis = volume * h.avgCost;
        const saleProceeds = (volume * price) - comm; // Deduct commission from proceeds
        h.realizedPL += (saleProceeds - costBasis);
        
        h.actualVol -= volume;
        h.totalCost -= costBasis; // Reduce total cost proportionally
        
        // If sold out completely, reset cost but keep realized P/L
        if (h.actualVol <= 0) {
            h.actualVol = 0;
            h.totalCost = 0;
            h.avgCost = 0;
        }
      }
    });

    // Convert holdings object to array and filter out empty positions (optional, or keep them to show history)
    const holdingsArray = Object.values(holdings).filter((h: any) => h.actualVol > 0 || h.realizedPL !== 0);

    return NextResponse.json(holdingsArray);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { portfolio_id, ticker, type, volume, price, commission, date, notes } = body;

    if (!portfolio_id || !ticker || !type || !volume || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('portfolio_transactions')
      .insert([{
        portfolio_id,
        ticker,
        type,
        volume,
        price,
        commission: commission || 0,
        transaction_date: date || new Date().toISOString(),
        notes
      }])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('portfolio_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ticker, type, volume, price, commission, date, notes } = body;

    if (!id || !ticker || !type || !volume || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('portfolio_transactions')
      .update({
        ticker,
        type,
        volume,
        price,
        commission: commission || 0,
        transaction_date: date,
        notes
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
