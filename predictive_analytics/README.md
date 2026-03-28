# Predictive History-Based Stock Investment Analysis Tool

This module provides a predictive analytics tool to forecast key financial metrics for Thai stocks, as requested.

## Features Supported
- **Net Profit Prediction**
- **Revenue Prediction**
- **Earnings Per Share (EPS) Prediction**
- **Net Profit Margin (NPM %) Prediction**
- **Dividend Per Share (DPS) Prediction**
- **Debt-to-Equity (D/E) Ratio Prediction**
- **Price-to-Earnings (P/E) Ratio Band Prediction**
- **Price-to-Book (P/BV) Ratio Band Prediction**
- **Fair Value Estimation** (derived from predicted EPS and P/E)

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Train the initial models (using dummy historical data for demonstration):
   ```bash
   # Ensure you are in the predictive_analytics directory
   export PYTHONPATH="." (Mac/Linux) or $env:PYTHONPATH="." (Windows)
   python models/train.py
   ```

3. Run the Flask API server:
   ```bash
   python app.py
   ```
   The server will run on `http://127.0.0.1:5002`

## API Usage

**Endpoint:** `POST /api/predict`

**Payload Example:**
```json
{
  "history": [
    {
      "ticker": "PTT",
      "year": 2021,
      "revenue": 2200000,
      "net_profit": 100000,
      "eps": 3.5,
      "dps": 2.0,
      "de_ratio": 1.2,
      "pe_ratio": 12.5,
      "pbv_ratio": 1.1,
      "npm": 4.5
    },
    {
      "ticker": "PTT",
      "year": 2022,
      "revenue": 2500000,
      "net_profit": 120000,
      "eps": 4.2,
      "dps": 2.2,
      "de_ratio": 1.1,
      "pe_ratio": 10.5,
      "pbv_ratio": 1.0,
      "npm": 4.8
    }
  ]
}
```

**Response Example:**
```json
{
  "status": "success",
  "predictions": {
    "de_ratio": 1.15,
    "dps": 2.1,
    "eps": 4.0,
    "fair_value_estimation": 44.0,
    "net_profit": 110000.0,
    "npm": 4.6,
    "pbv_ratio": 1.05,
    "pe_ratio": 11.0,
    "revenue": 2350000.0
  }
}
```

## Structure
- `app.py`: Flask application exposing the prediction API.
- `models/train.py`: Script to train Random Forest models on historical data.
- `data/preprocessing.py`: Handles missing values, scaling, and feature extraction (lags, growth rates).
- `utils/logger.py`: Standardized logging.
- `saved_models/`: Directory where trained `.joblib` files are stored.
