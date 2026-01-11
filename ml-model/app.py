from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.stattools import adfuller
from datetime import datetime, timedelta
import os
import warnings
warnings.filterwarnings('ignore')

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)
CORS(app)

# Initialize Firebase
try:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    key_path = os.path.join(base_dir, 'serviceAccountKey.json')
    
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✓ Firebase initialized successfully")
except Exception as e:
    print(f"⚠ Firebase initialization failed: {str(e)}")
    print("⚠ Will use synthetic data for testing")
    db = None


def get_data_from_firebase(user_id=None):
    """Fetch transaction data from Firebase Firestore"""
    if db is None or not user_id:
        print("Using synthetic data (Firebase not connected or no user_id)")
        return generate_synthetic_data()
    
    try:
        print(f"Fetching transactions from Firebase for user: {user_id}")
        transactions_ref = db.collection('users').document(user_id).collection('transactions').where('type', '==', 'expense')
        docs = transactions_ref.stream()
        
        transactions = []
        for doc in docs:
            data = doc.to_dict()
            date_value = data.get('date')
            amount_value = data.get('amount')
            category_value = data.get('type', 'other')
            
            if not date_value or not amount_value:
                continue
                
            transactions.append({
                'date': date_value,
                'amount': float(amount_value),
                'category': str(category_value)
            })
        
        if not transactions:
            print("⚠ No transactions found in Firebase, using synthetic data")
            return generate_synthetic_data()
        
        print(f"✓ Loaded {len(transactions)} real expense transactions from Firebase")
        return pd.DataFrame(transactions)
        
    except Exception as e:
        print(f"⚠ Error fetching from Firebase: {str(e)}")
        print("⚠ Falling back to synthetic data")
        return generate_synthetic_data()


def generate_synthetic_data(days=90):
    """Generate synthetic transaction data with realistic patterns"""
    np.random.seed(42)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    date_range = pd.date_range(start=start_date, end=end_date, freq='D')
    
    # Create more realistic patterns
    base_expense = 50
    seasonal_component = 20 * np.sin(2 * np.pi * np.arange(len(date_range)) / 7)
    trend_component = np.linspace(0, 10, len(date_range))  # Slight upward trend
    weekend_effect = np.array([30 if d.weekday() >= 5 else 0 for d in date_range])
    noise = np.random.normal(0, 10, len(date_range))
    
    expenses = base_expense + seasonal_component + trend_component + weekend_effect + noise
    expenses = np.maximum(expenses, 0)
    
    transactions = []
    categories = ['food', 'transport', 'entertainment', 'utilities', 'shopping']
    
    for date, total_expense in zip(date_range, expenses):
        num_transactions = np.random.randint(1, 4)
        amounts = np.random.dirichlet(np.ones(num_transactions)) * total_expense
        
        for amount in amounts:
            transactions.append({
                'date': date.strftime('%Y-%m-%d'),
                'amount': round(amount, 2),
                'category': np.random.choice(categories)
            })
    
    print(f"✓ Generated {len(transactions)} synthetic transactions for testing")
    return pd.DataFrame(transactions)


def detect_outliers(series, threshold=3):
    """Detect and handle outliers using Z-score method"""
    z_scores = np.abs((series - series.mean()) / series.std())
    outliers = z_scores > threshold
    
    if outliers.sum() > 0:
        print(f"⚠ Detected {outliers.sum()} outliers, capping values...")
        # Cap outliers at threshold
        upper_limit = series.mean() + threshold * series.std()
        lower_limit = series.mean() - threshold * series.std()
        series = series.clip(lower=lower_limit, upper=upper_limit)
    
    return series


def check_stationarity(series):
    """Test for stationarity using Augmented Dickey-Fuller test"""
    try:
        result = adfuller(series.dropna())
        adf_statistic = result[0]
        p_value = result[1]
        
        is_stationary = p_value < 0.05
        
        print(f"Stationarity Test (ADF):")
        print(f"  ADF Statistic: {adf_statistic:.4f}")
        print(f"  P-value: {p_value:.4f}")
        print(f"  Result: {'Stationary' if is_stationary else 'Non-stationary'}")
        
        return is_stationary, p_value
    except Exception as e:
        print(f"⚠ Stationarity test failed: {e}")
        return False, 1.0


def prepare_time_series(transactions_df):
    """Prepare and preprocess transaction data with advanced cleaning"""
    try:
        transactions_df['date'] = pd.to_datetime(transactions_df['date'], dayfirst=True)
        daily_expenses = transactions_df.groupby('date')['amount'].sum()
        
        # Create complete date range
        full_date_range = pd.date_range(
            start=daily_expenses.index.min(),
            end=daily_expenses.index.max(),
            freq='D'
        )
        
        daily_expenses = daily_expenses.reindex(full_date_range, fill_value=0)
        
        # Handle zeros and missing values more intelligently
        daily_expenses = daily_expenses.replace(0, np.nan)
        
        # Use multiple imputation strategies
        daily_expenses = daily_expenses.fillna(method='ffill', limit=3)
        daily_expenses = daily_expenses.fillna(method='bfill', limit=3)
        daily_expenses = daily_expenses.interpolate(method='time')
        daily_expenses = daily_expenses.fillna(daily_expenses.rolling(window=7, min_periods=1).mean())
        daily_expenses = daily_expenses.fillna(daily_expenses.mean())
        
        # Detect and handle outliers
        daily_expenses = detect_outliers(daily_expenses)
        
        return daily_expenses
    except Exception as e:
        print(f"Error in prepare_time_series: {e}")
        return pd.Series(dtype=float)


def auto_select_sarima_params(time_series, max_order=2):
    """
    Automatically select best SARIMA parameters using AIC/BIC
    Tests multiple parameter combinations
    """
    print("\nSearching for optimal SARIMA parameters...")
    
    best_aic = np.inf
    best_params = None
    best_seasonal = None
    
    # Parameter ranges to test
    p_range = range(0, max_order + 1)
    d_range = range(0, 2)  # Usually 0 or 1
    q_range = range(0, max_order + 1)
    
    # Seasonal parameters (weekly pattern)
    P_range = range(0, 2)
    D_range = range(0, 2)
    Q_range = range(0, 2)
    s = 7  # Weekly seasonality
    
    tested = 0
    successful = 0
    
    for p in p_range:
        for d in d_range:
            for q in q_range:
                for P in P_range:
                    for D in D_range:
                        for Q in Q_range:
                            tested += 1
                            try:
                                model = SARIMAX(
                                    time_series,
                                    order=(p, d, q),
                                    seasonal_order=(P, D, Q, s),
                                    enforce_stationarity=False,
                                    enforce_invertibility=False
                                )
                                
                                fitted = model.fit(disp=False, maxiter=100)
                                successful += 1
                                
                                if fitted.aic < best_aic:
                                    best_aic = fitted.aic
                                    best_params = (p, d, q)
                                    best_seasonal = (P, D, Q, s)
                                    
                            except Exception:
                                continue
    
    print(f"✓ Tested {tested} parameter combinations ({successful} successful)")
    
    # Fallback to default if no model converged
    if best_params is None:
        print("⚠ Using default parameters (1,1,1)x(1,1,1,7)")
        best_params = (1, 1, 1)
        best_seasonal = (1, 1, 1, 7)
    else:
        print(f"✓ Best parameters: SARIMA{best_params}x{best_seasonal} (AIC: {best_aic:.2f})")
    
    return best_params, best_seasonal


def calculate_accuracy_metrics(actual, predicted):
    """Calculate model accuracy metrics"""
    actual = np.array(actual)
    predicted = np.array(predicted)
    
    # Remove any NaN values
    mask = ~(np.isnan(actual) | np.isnan(predicted))
    actual = actual[mask]
    predicted = predicted[mask]
    
    if len(actual) == 0:
        return {}
    
    # Mean Absolute Error
    mae = np.mean(np.abs(actual - predicted))
    
    # Root Mean Squared Error
    rmse = np.sqrt(np.mean((actual - predicted) ** 2))
    
    # Mean Absolute Percentage Error
    mape = np.mean(np.abs((actual - predicted) / (actual + 1e-10))) * 100
    
    # R-squared
    ss_res = np.sum((actual - predicted) ** 2)
    ss_tot = np.sum((actual - np.mean(actual)) ** 2)
    r2 = 1 - (ss_res / (ss_tot + 1e-10))
    
    return {
        'mae': round(mae, 2),
        'rmse': round(rmse, 2),
        'mape': round(mape, 2),
        'r2_score': round(r2, 4)
    }


def train_sarima_model(time_series, forecast_days=30, auto_tune=True):
    """Train SARIMA model with optional auto-tuning and enhanced validation"""
    try:
        print(f"\nTraining SARIMA model with {len(time_series)} days of data...")
        
        # Check stationarity
        is_stationary, p_value = check_stationarity(time_series)
        
        # ---
        # THE FIX: Only auto-tune and validate if we have enough data (e.g., > 30 days)
        # ---
        if auto_tune and len(time_series) >= 30:
            print("Sufficient data found, running auto-tune and validation...")
            order, seasonal_order = auto_select_sarima_params(time_series, max_order=2)
            
            # Perform walk-forward validation on last 7 days
            validation_size = 7
            train_data = time_series[:-validation_size]
            test_data = time_series[-validation_size:]
            
            val_model = SARIMAX(
                train_data,
                order=order,
                seasonal_order=seasonal_order,
                enforce_stationarity=False,
                enforce_invertibility=False
            )
            val_fitted = val_model.fit(disp=False, maxiter=200)
            val_predictions = val_fitted.forecast(steps=validation_size)
            
            accuracy_metrics = calculate_accuracy_metrics(test_data.values, val_predictions.values)
        else:
            # ---
            # THE FIX: Not enough data, use default parameters and skip validation
            # ---
            print("Insufficient data for auto-tune/validation, using default parameters.")
            order = (1, 1, 1)
            seasonal_order = (1, 1, 1, 7)
            accuracy_metrics = {} # Skip validation
        
        # Train final model on ALL data
        print(f"Training final model with SARIMA{order}x{seasonal_order}...")
        model = SARIMAX(
            time_series,
            order=order,
            seasonal_order=seasonal_order,
            enforce_stationarity=False,
            enforce_invertibility=False
        )
        
        fitted_model = model.fit(disp=False, maxiter=200, method='lbfgs')
        
        # Generate forecast
        forecast = fitted_model.forecast(steps=forecast_days)
        forecast_result = fitted_model.get_forecast(steps=forecast_days)
        confidence_intervals = forecast_result.conf_int()
        
        # Prepare forecast dates
        last_date = time_series.index[-1]
        forecast_dates = pd.date_range(
            start=last_date + timedelta(days=1),
            periods=forecast_days,
            freq='D'
        )
        
        # Prepare response with enhanced statistics
        forecast_data = []
        for date, value, (lower, upper) in zip(
            forecast_dates, 
            forecast, 
            confidence_intervals.values
        ):
            forecast_data.append({
                'date': date.strftime('%Y-%m-%d'),
                'amount': round(max(0, value), 2),
                'lower_bound': round(max(0, lower), 2),
                'upper_bound': round(max(0, upper), 2)
            })
        
        # Enhanced statistics
        stats = {
            'aic': round(fitted_model.aic, 2),
            'bic': round(fitted_model.bic, 2),
            'log_likelihood': round(fitted_model.llf, 2),
            'training_samples': len(time_series),
            'model_order': f"SARIMA{order}x{seasonal_order}",
            'is_stationary': bool(is_stationary), # <-- THE FIX: Convert numpy.bool_ to bool
            'stationarity_pvalue': round(p_value, 4)
        }
        
        # Add validation metrics if available
        if accuracy_metrics:
            stats.update(accuracy_metrics)
        
        print(f"✓ Model trained successfully!")
        print(f"  AIC: {stats['aic']}, BIC: {stats['bic']}")
        if accuracy_metrics:
            print(f"  Validation MAPE: {accuracy_metrics.get('mape', 'N/A')}%")
        
        # Calculate total forecast
        total_forecast = sum(f['amount'] for f in forecast_data)
        avg_daily = round(total_forecast / forecast_days, 2)
        
        return {
            'success': True,
            'forecast': forecast_data,
            'statistics': stats,
            'historical_mean': round(time_series.mean(), 2),
            'historical_std': round(time_series.std(), 2),
            'forecast_total': round(total_forecast, 2),
            'forecast_daily_avg': avg_daily,
            'data_source': 'real' if db is not None else 'synthetic'
        }
        
    except Exception as e:
        print(f"✗ Model training failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'error': str(e),
            'message': 'Failed to train SARIMA model'
        }


@app.route('/predict', methods=['POST'])
def predict():
    """Main prediction endpoint with enhanced validation"""
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id', None)
        forecast_days = data.get('forecast_days', 30)
        auto_tune = data.get('auto_tune', True)  # New parameter
        
        print(f"\n{'='*60}")
        print(f"New prediction request:")
        print(f"  User ID: {user_id}")
        print(f"  Forecast days: {forecast_days}")
        print(f"  Auto-tune: {auto_tune}")
        print(f"{'='*60}")
        
        if forecast_days < 1 or forecast_days > 90:
            return jsonify({
                'success': False,
                'message': 'forecast_days must be between 1 and 90'
            }), 400
        
        transactions_df = get_data_from_firebase(user_id)
        
        if transactions_df.empty:
            return jsonify({
                'success': False,
                'message': 'No transaction data available'
            }), 404
        
        time_series = prepare_time_series(transactions_df)
        
        if len(time_series) < 14:
            return jsonify({
                'success': False,
                'message': 'Insufficient data for forecasting. Need at least 14 days of transactions.'
            }), 400
        
        print(f"✓ Prepared time series: {len(time_series)} days")
        print(f"  Daily average: ₹{time_series.mean():.2f}")
        print(f"  Daily std dev: ₹{time_series.std():.2f}")
        
        result = train_sarima_model(time_series, forecast_days, auto_tune)
        
        if not result['success']:
            return jsonify(result), 500
        
        print(f"✓ Forecast generated successfully!")
        print(f"  Total forecast: ₹{result.get('forecast_total', 0):.2f}")
        print(f"{'='*60}\n")
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"✗ Error in /predict endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    firebase_status = 'connected' if db is not None else 'disconnected'
    return jsonify({
        'status': 'healthy',
        'service': 'SARIMA Expense Forecasting API',
        'firebase': firebase_status,
        'timestamp': datetime.now().isoformat()
    }), 200


@app.route('/', methods=['GET'])
def home():
    """Root endpoint"""
    return jsonify({
        'message': 'Cloud-Based Smart Forecasting Personal Finance Tracker API',
        'version': '2.0.0',
        'firebase': 'connected' if db is not None else 'disconnected (using synthetic data)',
        'endpoints': {
            '/predict': 'POST - Generate expense forecast (supports auto_tune parameter)',
            '/health': 'GET - Health check'
        }
    }), 200


if __name__ == '__main__':
    print("\n" + "="*60)
    print("SARIMA Expense Forecasting API v2.0")
    print("="*60)
    print(f"Firebase Status: {'✓ Connected' if db is not None else '✗ Not Connected (using synthetic data)'}")
    print(f"Server starting on http://0.0.0.0:8080")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=8080, debug=False)


