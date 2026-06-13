import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type FifoLot = {
  remainingVol: number;
  unitCost: number;
};

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
          realizedPLAverageCost: 0,
          realizedPLFifo: 0,
          lots: [] as FifoLot[],
        };
      }

      const h = holdings[ticker];
      const comm = Number(commission) || 0;

      if (type === 'BUY') {
        const cost = (volume * price) + comm; // Add commission to cost
        h.totalCost += cost;
        h.actualVol += volume;
        h.lots.push({
          remainingVol: volume,
          unitCost: volume > 0 ? cost / volume : 0,
        });
        // Recalculate Avg Cost
        if (h.actualVol > 0) {
          h.avgCost = h.totalCost / h.actualVol;
        }
      } else if (type === 'SELL') {
        // Keep the existing average-cost realized P/L for backward compatibility.
        const costBasis = volume * h.avgCost;
        const saleProceeds = (volume * price) - comm; // Deduct commission from proceeds
        const realizedAverageCost = saleProceeds - costBasis;
        h.realizedPL += realizedAverageCost;
        h.realizedPLAverageCost += realizedAverageCost;

        // FIFO realized P/L uses the oldest remaining lots first.
        let remainingSellVol = volume;
        let fifoCostBasis = 0;
        while (remainingSellVol > 0 && h.lots.length > 0) {
          const lot = h.lots[0];
          const matchedVol = Math.min(remainingSellVol, lot.remainingVol);
          fifoCostBasis += matchedVol * lot.unitCost;
          lot.remainingVol -= matchedVol;
          remainingSellVol -= matchedVol;
          if (lot.remainingVol <= 0) {
            h.lots.shift();
          }
        }
        // Guard against historical oversell data by falling back to current avg cost for the unmatched remainder.
        if (remainingSellVol > 0) {
          fifoCostBasis += remainingSellVol * h.avgCost;
        }
        h.realizedPLFifo += saleProceeds - fifoCostBasis;
        
        h.actualVol -= volume;
        h.totalCost -= costBasis; // Reduce total cost proportionally
        
        // If sold out completely, reset cost but keep realized P/L
        if (h.actualVol <= 0) {
            h.actualVol = 0;
            h.totalCost = 0;
            h.avgCost = 0;
            h.lots = [];
        }
      }
    });

    // Convert holdings object to array and filter out empty positions (optional, or keep them to show history)
    const holdingsArray = Object.values(holdings)
      .filter((h: any) => h.actualVol > 0 || h.realizedPLAverageCost !== 0 || h.realizedPLFifo !== 0)
      .map((h: any) => {
        const { lots, ...rest } = h;
        return rest;
      });

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
