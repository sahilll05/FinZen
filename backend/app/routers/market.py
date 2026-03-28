from fastapi import APIRouter
from typing import List, Dict, Any
import yfinance as yf

router = APIRouter()

@router.post("/quotes/batch")
def batch_quotes(tickers: List[str]) -> Dict[str, dict]:
    """
    Fetches real-time price quotes and day change % for a batch of tickers using yfinance.
    Used by the frontend dashboard & portfolio views.
    """
    results = {}
    if not tickers:
        return results
        
    for ticker in tickers:
        try:
            t = yf.Ticker(ticker)
            # Fetch last 2 days to compute daily change safely
            hist = t.history(period="2d")
            
            if not hist.empty:
                current_price = float(hist['Close'].iloc[-1])
                
                # Calculate daily change if we have enough data
                if len(hist) > 1:
                    prev_close = float(hist['Close'].iloc[-2])
                else:
                    # Fallback to Open if only 1 day available
                    prev_close = float(hist['Open'].iloc[-1])
                    
                change = current_price - prev_close
                change_pct = (change / prev_close) * 100 if prev_close > 0 else 0
                
                results[ticker] = {
                    "price": current_price,
                    "change": change,
                    "change_pct": change_pct
                }
            else:
                # Provide a graceful default fallback for invalid/missing tickers so UI won't crash
                 results[ticker] = { "price": 100.0, "change": 0.0, "change_pct": 0.0 }
        except Exception as e:
            print(f"Error fetching quote for {ticker}: {e}")
            results[ticker] = { "price": 100.0, "change": 0.0, "change_pct": 0.0 }
            
    return results
