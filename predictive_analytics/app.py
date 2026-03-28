from flask import Flask, request, jsonify
import joblib
import pandas as pd
import numpy as np
import os
from data.preprocessing import DataPreprocessor
from utils.logger import get_logger

app = Flask(__name__)
logger = get_logger(__name__)

# Load models and preprocessor
models = {}
preprocessor = None
MODEL_DIR = 'saved_models'

targets = ['net_profit', 'revenue', 'eps', 'npm', 'dps', 'de_ratio', 'pe_ratio', 'pbv_ratio']

def load_resources():
    global preprocessor
    try:
        if os.path.exists(f'{MODEL_DIR}/preprocessor.joblib'):
            preprocessor = joblib.load(f'{MODEL_DIR}/preprocessor.joblib')
        
        for target in targets:
            model_path = f'{MODEL_DIR}/{target}_model.joblib'
            if os.path.exists(model_path):
                models[target] = joblib.load(model_path)
        logger.info(f"Models loaded successfully: {list(models.keys())}")
    except Exception as e:
        logger.error(f"Error loading models: {str(e)}")

load_resources()

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        if not data or 'history' not in data:
            return jsonify({'error': 'Invalid input data. "history" array is required.'}), 400
            
        df = pd.DataFrame(data['history'])
        
        if preprocessor is None or not models:
            return jsonify({'error': 'Models not trained yet.'}), 503
            
        # Preprocess
        df = preprocessor.handle_missing_values(df)
        df = preprocessor.extract_features(df)
        
        # We only predict for the latest year (or future) using the latest lags
        latest_data = df.iloc[-1:].copy()
        # Fill NA for predictions if history is too short
        latest_data = latest_data.fillna(0)
        
        latest_data = preprocessor.scale_features(latest_data, is_training=False)
        feature_cols = [c for c in latest_data.columns if 'lag' in c or 'growth' in c]
        
        if not feature_cols:
             return jsonify({'error': 'Not enough historical data to extract features.'}), 400
             
        X_pred = latest_data[feature_cols]
        
        predictions = {}
        for target, model in models.items():
            pred_value = model.predict(X_pred)[0]
            predictions[target] = float(pred_value)
            
        # Calculate Fair Value (Simplified DDM or P/E based on predictions)
        # Fair Value = Predicted EPS * Predicted P/E
        if 'eps' in predictions and 'pe_ratio' in predictions:
            fair_value = predictions['eps'] * predictions['pe_ratio']
            predictions['fair_value_estimation'] = max(0, float(fair_value))
            
        return jsonify({
            'status': 'success',
            'predictions': predictions
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'models_loaded': len(models)})

if __name__ == '__main__':
    app.run(port=5002, debug=True)