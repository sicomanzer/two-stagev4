import json
import os
from datetime import datetime, timezone
from pathlib import Path

import requests


def parse_tickers() -> list[str]:
    # Check for --all or THAIFIN_CACHE_ALL env var
    import sys
    
    use_all = "--all" in sys.argv or os.getenv("THAIFIN_CACHE_ALL", "").lower() == "true"
    
    if use_all:
        try:
            from thaifin import Stocks
            all_stocks = Stocks.list()
            print(f"[info] Retrieved {len(all_stocks)} tickers from thaifin.Stocks.list()")
            return [t.upper().replace(".BK", "") for t in all_stocks]
        except ImportError:
            print("[warn] thaifin library not installed, falling back to env/default list")
        except Exception as e:
            print(f"[warn] Failed to list all stocks: {e}")

    raw = os.getenv(
        "THAIFIN_CACHE_TICKERS",
        "ADVANC,PTT,AOT,CPALL,SCB,BBL,KBANK,KTB,BDMS,TRUE,GULF,CRC,BEM,BCH,MINT,TU,TISCO,LH,SCC,INTUCH",
    )
    seen: set[str] = set()
    output: list[str] = []
    for item in raw.split(","):
        ticker = item.strip().upper().replace(".BK", "")
        if not ticker or ticker in seen:
            continue
        seen.add(ticker)
        output.append(ticker)
    return output


def fetch_history(base_url: str, ticker: str, timeout_sec: int) -> list[dict]:
    url = f"{base_url}/api/fundamentals"
    response = requests.get(url, params={"ticker": ticker}, timeout=timeout_sec)
    response.raise_for_status()
    data = response.json()
    history = data.get("history", [])
    if not isinstance(history, list):
        return []
    history = [row for row in history if isinstance(row, dict) and row.get("year")]
    history.sort(key=lambda row: row.get("year", 0))
    return history


def fetch_history_from_library(ticker: str) -> list[dict]:
    from thaifin import Stock

    df = Stock(ticker).yearly_dataframe.reset_index()
    history: list[dict] = []
    for _, row in df.iterrows():
        fiscal_val = row.get("fiscal", row.get("Fiscal", None))
        if fiscal_val is None:
            continue
        try:
            year = int(fiscal_val.year) if hasattr(fiscal_val, "year") else int(fiscal_val)
        except (TypeError, ValueError):
            continue
        history.append(
            {
                "year": year,
                "eps": safe_float(row.get("earning_per_share")),
                "revenue": safe_float(row.get("revenue")),
                "netProfit": safe_float(row.get("net_profit")),
                "de": safe_float(row.get("debt_to_equity")),
                "npm": safe_float(row.get("npm")),
                "roe": safe_float(row.get("roe")),
                "roa": safe_float(row.get("roa")),
                "gpm": safe_float(row.get("gpm")),
                "bvps": safe_float(row.get("book_value_per_share")),
                "dividendYield": safe_float(row.get("dividend_yield")),
                "totalDebt": safe_float(row.get("total_debt")),
                "equity": safe_float(row.get("equity")),
                "pe": safe_float(row.get("price_earning_ratio")),
                "pbv": safe_float(row.get("price_book_value")),
                "mktCap": safe_float(row.get("mkt_cap")),
                "close": safe_float(row.get("close")),
            }
        )
    history.sort(key=lambda row: row.get("year", 0))
    return history


def safe_float(value):
    if value is None:
        return None
    try:
        output = float(value)
        if output != output:
            return None
        if output == float("inf") or output == float("-inf"):
            return None
        return output
    except (TypeError, ValueError):
        return None


def main() -> int:
    mode = os.getenv("THAIFIN_CACHE_MODE", "auto").strip().lower()
    base_url = os.getenv("THAIFIN_BASE_URL", "http://localhost:5001").rstrip("/")
    timeout_sec = int(os.getenv("THAIFIN_CACHE_TIMEOUT_SEC", "20"))
    tickers = parse_tickers()
    output_path = Path("data") / "fundamentals-cache.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    cache: dict[str, dict] = {}
    if output_path.exists():
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
                if isinstance(existing_data, dict) and "tickers" in existing_data:
                    cache = existing_data["tickers"]
                    print(f"[info] Loaded {len(cache)} existing tickers from cache")
        except Exception as e:
            print(f"[warn] Failed to load existing cache: {e}")

    success = 0
    failed: list[str] = []

    for ticker in tickers:
        try:
            history: list[dict] = []
            source_mode = mode
            if mode in ("api", "auto"):
                try:
                    history = fetch_history(base_url, ticker, timeout_sec)
                    source_mode = "api"
                except Exception:
                    if mode == "api":
                        raise
            if not history and mode in ("library", "auto"):
                history = fetch_history_from_library(ticker)
                source_mode = "library"
            if not history:
                failed.append(ticker)
                print(f"[skip] {ticker} no history")
                continue
            cache[ticker] = {
                "history": history,
                "totalYears": len(history),
                "firstYear": history[0]["year"],
                "lastYear": history[-1]["year"],
                "mode": source_mode,
            }
            success += 1
            print(f"[ok] {ticker} years={len(history)} range={history[0]['year']}-{history[-1]['year']} mode={source_mode}")
            
            # Periodic save every 20 successful fetches
            if success % 20 == 0:
                payload = {
                    "updatedAt": datetime.now(timezone.utc).isoformat(),
                    "sourceBaseUrl": base_url,
                    "tickers": cache,
                }
                output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
                print(f"[save] Checkpoint saved ({len(cache)} tickers)")

        except Exception as exc:
            failed.append(ticker)
            print(f"[error] {ticker} {exc}")

    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceBaseUrl": base_url,
        "tickers": cache,
    }
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[done] success={success} failed={len(failed)} output={output_path}")
    if failed:
        print("[failed] " + ",".join(failed))
    return 0 if success > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
