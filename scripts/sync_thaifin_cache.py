import json
import os
import sys
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

# Automatically add local .venv to sys.path if it exists
venv_site_packages = Path(__file__).parent.parent / ".venv" / "Lib" / "site-packages"
if venv_site_packages.exists() and str(venv_site_packages) not in sys.path:
    sys.path.insert(0, str(venv_site_packages))

def parse_tickers() -> list[str]:
    # Check for --all or THAIFIN_CACHE_ALL env var
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
    url = f"{base_url}/api/fundamentals?{urllib.parse.urlencode({'ticker': ticker})}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=timeout_sec) as response:
            if response.status >= 400:
                raise Exception(f"HTTP Error {response.status}: {response.reason}")
            data = json.loads(response.read().decode('utf-8'))
    except Exception as e:
        raise Exception(f"Failed to fetch {ticker}: {e}")

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


def update_progress(current: int, total: int, ticker: str, status: str = "running"):
    try:
        status_file = Path(__file__).parent.parent / "data" / "sync-status.json"
        status_file.parent.mkdir(exist_ok=True, parents=True)
        percent = int((current / total) * 100) if total > 0 else 0
        with open(status_file, "w", encoding="utf-8") as f:
            json.dump({
                "current": current,
                "total": total,
                "percent": percent,
                "ticker": ticker,
                "status": status
            }, f)
    except Exception:
        pass

def main() -> int:
    mode = os.getenv("THAIFIN_CACHE_MODE", "auto").strip().lower()
    base_url = os.getenv("THAIFIN_BASE_URL", "http://localhost:5001").rstrip("/")
    timeout_sec = int(os.getenv("THAIFIN_CACHE_TIMEOUT_SEC", "20"))
    max_consecutive_failures = int(os.getenv("THAIFIN_CACHE_MAX_CONSECUTIVE_FAILURES", "25"))
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
    existing_cache_count = len(cache)

    total_tickers = len(tickers)
    update_progress(0, total_tickers, "Starting...", "running")

    success = 0
    failed: list[str] = []
    consecutive_failures = 0
    early_abort_reason = ""

    for idx, ticker in enumerate(tickers):
        update_progress(idx, total_tickers, ticker, "running")
        try:
            history: list[dict] = []
            source_mode = mode
            if mode in ("api", "auto"):
                try:
                    history = fetch_history(base_url, ticker, timeout_sec)
                    source_mode = "api"
                except Exception as e:
                    if mode == "api":
                        raise e
                    print(f"[warn] API fetch failed for {ticker}: {e}")
            if not history and mode in ("library", "auto"):
                try:
                    history = fetch_history_from_library(ticker)
                    source_mode = "library"
                except ImportError:
                    if not history: # Only log if we also don't have history from API
                        print(f"[warn] {ticker} thaifin library not installed and API failed.")
                except Exception as e:
                     print(f"[warn] Library fetch failed for {ticker}: {e}")
            
            if not history:
                failed.append(ticker)
                consecutive_failures += 1
                print(f"[skip] {ticker} no history (API and Library both failed)")
                if success == 0 and existing_cache_count > 0 and consecutive_failures >= max_consecutive_failures:
                    early_abort_reason = (
                        f"aborting after {consecutive_failures} consecutive failures with no fresh data; "
                        f"keeping existing cache ({existing_cache_count} tickers)"
                    )
                    print(f"[warn] {early_abort_reason}")
                    break
                continue
            cache[ticker] = {
                "history": history,
                "totalYears": len(history),
                "firstYear": history[0]["year"],
                "lastYear": history[-1]["year"],
                "mode": source_mode,
            }
            success += 1
            consecutive_failures = 0
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
            consecutive_failures += 1
            print(f"[error] {ticker} {exc}")
            if success == 0 and existing_cache_count > 0 and consecutive_failures >= max_consecutive_failures:
                early_abort_reason = (
                    f"aborting after {consecutive_failures} consecutive failures with no fresh data; "
                    f"keeping existing cache ({existing_cache_count} tickers)"
                )
                print(f"[warn] {early_abort_reason}")
                break
            # Ensure it continues despite failure
            continue

    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceBaseUrl": base_url,
        "tickers": cache,
    }
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[done] success={success} failed={len(failed)} output={output_path}")
    if failed:
        print("[failed] " + ",".join(failed))

    # Update final progress
    if success == 0 and existing_cache_count > 0:
        final_ticker = "Using existing cache"
        if early_abort_reason:
            print(f"[info] Workflow completed with cached fallback: {early_abort_reason}")
        else:
            print(f"[warn] No fresh fundamentals fetched. Keeping existing cache with {existing_cache_count} tickers.")
        update_progress(total_tickers, total_tickers, final_ticker, "idle")
        return 0

    update_progress(total_tickers, total_tickers, "Done", "idle")
    return 0 if success > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
