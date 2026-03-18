import json
import re
from pathlib import Path

import pandas as pd

INDUSTRY_GROUPS = {'AGRO', 'CONSUMP', 'FINCIAL', 'INDUS', 'PROPCON', 'RESOURC', 'SERVICE', 'TECH'}
MAI_STATUS_CODES = {'SP', 'CB', 'CS', 'CF', 'NC', 'NP', 'XD', 'XR', 'XW', 'XM', 'XT', 'XA', 'H'}
TICKER_PATTERN = re.compile(r'^[A-Z0-9&.\-]+$')
HEADER_PATTERN = re.compile(r'\(([^)]+)\)$')


def add_ticker(sectors_map, ticker_map, sector_code, group_code, ticker, overwrite=False):
    ticker = ticker.strip().upper()
    if not ticker:
        return
    if ticker in ticker_map and not overwrite:
        return
    if sector_code not in sectors_map:
        sectors_map[sector_code] = []
    if ticker in ticker_map:
        old_sector = ticker_map[ticker]['sector']
        if old_sector in sectors_map and ticker in sectors_map[old_sector]:
            sectors_map[old_sector].remove(ticker)
    if ticker not in sectors_map[sector_code]:
        sectors_map[sector_code].append(ticker)
    ticker_map[ticker] = {'sector': sector_code, 'group': group_code}


def parse_set_file(file_path, sectors_map, meta_map, ticker_map):
    df = pd.read_excel(file_path)
    current_group = None
    current_sector = None
    for _, row in df.iterrows():
        raw = str(row.iloc[0]).strip()
        if not raw or raw.lower() == 'nan':
            continue
        match = HEADER_PATTERN.search(raw)
        is_stock = False
        try:
            price = row.iloc[2]
            is_stock = pd.notna(price) and isinstance(price, (int, float))
        except Exception:
            is_stock = False
        if match and not is_stock:
            code = match.group(1).strip().upper()
            name = raw.replace(f'({code})', '').strip()
            if code in INDUSTRY_GROUPS:
                current_group = code
                current_sector = None
                continue
            current_sector = code
            if current_sector not in sectors_map:
                sectors_map[current_sector] = []
            if current_sector not in meta_map:
                meta_map[current_sector] = {'group': current_group, 'name': name}
            continue
        if current_sector and is_stock and TICKER_PATTERN.match(raw.upper()):
            add_ticker(sectors_map, ticker_map, current_sector, current_group, raw, overwrite=True)


def parse_mai_file(file_path, sectors_map, meta_map, ticker_map):
    df = pd.read_excel(file_path)
    current_group = None
    current_sector = None
    for _, row in df.iterrows():
        raw = str(row.iloc[0]).strip()
        if not raw or raw.lower() == 'nan':
            continue
        header_match = HEADER_PATTERN.search(raw)
        if header_match:
            code = header_match.group(1).strip().upper()
            if code in INDUSTRY_GROUPS:
                current_group = code
                current_sector = f'MAI_{code}'
                if current_sector not in sectors_map:
                    sectors_map[current_sector] = []
                if current_sector not in meta_map:
                    name = raw.replace(f'({code})', '').strip()
                    meta_map[current_sector] = {'group': 'MAI', 'name': name}
            continue
        token = raw.upper()
        if not current_sector:
            continue
        if len(token) < 2:
            continue
        if token in MAI_STATUS_CODES:
            continue
        if not TICKER_PATTERN.match(token):
            continue
        add_ticker(sectors_map, ticker_map, current_sector, current_group, token, overwrite=False)


def main():
    project_root = Path(__file__).resolve().parents[1]
    set_file = project_root / 'รายชื่อหุ้น.xlsx'
    mai_file = project_root / 'MAI index.xlsx'
    output_path = project_root / 'data' / 'stock_sectors.json'

    sectors_map = {}
    meta_map = {}
    ticker_map = {}

    if set_file.exists():
        parse_set_file(set_file, sectors_map, meta_map, ticker_map)
    else:
        print(f'SET file not found: {set_file}')

    if mai_file.exists():
        parse_mai_file(mai_file, sectors_map, meta_map, ticker_map)
    else:
        print(f'MAI file not found: {mai_file}')

    for sector_code, tickers in sectors_map.items():
        sectors_map[sector_code] = sorted(set(tickers))

    output_data = {'sectors': sectors_map, 'meta': meta_map, 'tickers': ticker_map}
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f'Successfully generated {output_path}')
    print(f'Total sectors: {len(sectors_map)}')
    print(f'Total tickers: {len(ticker_map)}')


if __name__ == '__main__':
    main()
