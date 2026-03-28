import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from utils.logger import get_logger

logger = get_logger(__name__)

class DataPreprocessor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.features = ['revenue', 'net_profit', 'eps', 'dps', 'de_ratio', 'pe_ratio', 'pbv_ratio', 'npm']
        
    def handle_missing_values(self, df):
        logger.info("Handling missing values...")
        # Simple forward fill and backward fill for time series financial data
        df = df.ffill().bfill()
        df = df.fillna(0) # Fallback for any remaining NaNs
        return df
        
    def extract_features(self, df):
        logger.info("Extracting features...")
        # Create lag features for historical context
        for col in self.features:
            if col in df.columns:
                df[f'{col}_lag1'] = df.groupby('ticker')[col].shift(1)
                df[f'{col}_lag2'] = df.groupby('ticker')[col].shift(2)
                # Calculate growth rates
                df[f'{col}_growth'] = df.groupby('ticker')[col].pct_change()
        return df

    def scale_features(self, df, is_training=True):
        feature_cols = [c for c in df.columns if 'lag' in c or 'growth' in c]
        df_clean = df.replace([np.inf, -np.inf], np.nan).fillna(0)
        
        if not feature_cols:
            return df
            
        if is_training:
            scaled_data = self.scaler.fit_transform(df_clean[feature_cols])
        else:
            scaled_data = self.scaler.transform(df_clean[feature_cols])
            
        df_scaled = pd.DataFrame(scaled_data, columns=feature_cols, index=df.index)
        for col in feature_cols:
            df[col] = df_scaled[col]
        return df