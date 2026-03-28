import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from data.preprocessing import DataPreprocessor
from utils.logger import get_logger

logger = get_logger(__name__)

class PredictiveModel:
    def __init__(self, target_variable):
        self.target_variable = target_variable
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        
    def train(self, X_train, y_train):
        logger.info(f"Training model for {self.target_variable}...")
        self.model.fit(X_train, y_train)
        
    def evaluate(self, X_test, y_test):
        predictions = self.model.predict(X_test)
        mse = mean_squared_error(y_test, predictions)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_test, predictions)
        r2 = r2_score(y_test, predictions)
        
        logger.info(f"Evaluation for {self.target_variable}:")
        logger.info(f"RMSE: {rmse:.4f}, MAE: {mae:.4f}, R2: {r2:.4f}")
        return {'rmse': rmse, 'mae': mae, 'r2': r2}
        
    def save(self, filepath):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self.model, filepath)
        logger.info(f"Model saved to {filepath}")

def run_training_pipeline():
    logger.info("Starting training pipeline...")
    
    # Generate dummy data for demonstration
    # In a real scenario, this would load from a database or CSV
    np.random.seed(42)
    tickers = ['PTT', 'AOT', 'CPALL', 'ADVANC']
    years = range(2010, 2024)
    data = []
    for t in tickers:
        for y in years:
            data.append({
                'ticker': t, 'year': y,
                'revenue': np.random.uniform(10000, 500000),
                'net_profit': np.random.uniform(1000, 50000),
                'eps': np.random.uniform(0.5, 20),
                'dps': np.random.uniform(0.1, 10),
                'de_ratio': np.random.uniform(0.5, 3.0),
                'pe_ratio': np.random.uniform(10, 40),
                'pbv_ratio': np.random.uniform(1, 10),
                'npm': np.random.uniform(5, 20)
            })
    df = pd.DataFrame(data)
    
    preprocessor = DataPreprocessor()
    df = preprocessor.handle_missing_values(df)
    df = preprocessor.extract_features(df)
    df = df.dropna() # Drop rows with NaNs from lags
    df = preprocessor.scale_features(df, is_training=True)
    
    targets = ['net_profit', 'revenue', 'eps', 'npm', 'dps', 'de_ratio', 'pe_ratio', 'pbv_ratio']
    feature_cols = [c for c in df.columns if 'lag' in c or 'growth' in c]
    
    # Train test split (temporal)
    train_df = df[df['year'] < 2022]
    test_df = df[df['year'] >= 2022]
    
    X_train = train_df[feature_cols]
    X_test = test_df[feature_cols]
    
    os.makedirs('saved_models', exist_ok=True)
    joblib.dump(preprocessor, 'saved_models/preprocessor.joblib')
    
    for target in targets:
        y_train = train_df[target]
        y_test = test_df[target]
        
        model = PredictiveModel(target)
        model.train(X_train, y_train)
        model.evaluate(X_test, y_test)
        model.save(f'saved_models/{target}_model.joblib')
        
    logger.info("Training pipeline completed.")

if __name__ == "__main__":
    run_training_pipeline()