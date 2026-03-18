from flask import Flask, jsonify, request
from flask_cors import CORS
from thaifin import Stock
import traceback

app = Flask(__name__)
# Add CORS so Next.js frontend could call it if needed
CORS(app)

@app.route('/api/fundamentals', methods=['GET'])
def get_fundamentals():
    ticker_raw = request.args.get('ticker', '').strip().upper()
    if not ticker_raw:
        return jsonify({'error': 'ticker parameter is required'}), 400
    
    ticker_clean = ticker_raw.replace('.BK', '')
    
    try:
        stock = Stock(ticker_clean)
        df = stock.yearly_dataframe
        
        if df.empty:
            return jsonify({'error': f'No data found for {ticker_clean}'}), 404
        
        df = df.reset_index()
        history = []
        for _, row in df.iterrows():
            fiscal_val = row.get('fiscal', row.get('Fiscal', None))
            if fiscal_val is None:
                continue
            try:
                year = int(fiscal_val.year) if hasattr(fiscal_val, 'year') else int(fiscal_val)
            except (ValueError, TypeError):
                continue
            
            entry = {
                'year': year,
                'eps': _safe_float(row.get('earning_per_share')),
                'revenue': _safe_float(row.get('revenue')),
                'netProfit': _safe_float(row.get('net_profit')),
                'de': _safe_float(row.get('debt_to_equity')),
                'npm': _safe_float(row.get('npm')),
                'roe': _safe_float(row.get('roe')),
                'roa': _safe_float(row.get('roa')),
                'gpm': _safe_float(row.get('gpm')),
                'bvps': _safe_float(row.get('book_value_per_share')),
                'dividendYield': _safe_float(row.get('dividend_yield')),
                'totalDebt': _safe_float(row.get('total_debt')),
                'equity': _safe_float(row.get('equity')),
                'pe': _safe_float(row.get('price_earning_ratio')),
                'pbv': _safe_float(row.get('price_book_value')),
                'mktCap': _safe_float(row.get('mkt_cap')),
                'close': _safe_float(row.get('close')),
            }
            history.append(entry)
        
        history.sort(key=lambda x: x['year'])
        
        company_info = {
            'symbol': ticker_clean,
            'companyName': str(getattr(stock, 'company_name', '') or ''),
            'sector': str(getattr(stock, 'sector', '') or ''),
            'industry': str(getattr(stock, 'industry', '') or ''),
        }
        
        return jsonify({
            'info': company_info,
            'history': history,
            'totalYears': len(history),
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'error': f'Failed to fetch data for {ticker_clean}: {str(e)}'
        }), 500

def _safe_float(val):
    if val is None:
        return None
    try:
        import math
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (ValueError, TypeError):
        return None
