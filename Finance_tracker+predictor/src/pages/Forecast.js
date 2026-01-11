import React, { useState } from "react";
import { toast } from "react-toastify";
import { getAuth } from "firebase/auth";
import { app } from "../firebase";
import "./Forecast.css";

const Forecast = () => {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [forecastDays, setForecastDays] = useState(30);
  const [statistics, setStatistics] = useState(null);
  const [dataSource, setDataSource] = useState(null);

  const fetchPrediction = async () => {
    if (forecastDays < 1 || forecastDays > 90) {
      setError("Number of days must be between 1 and 90");
      toast.error("Invalid number of days");
      return;
    }

    setLoading(true);
    setError(null);

    const auth = getAuth(app);
    const user = auth.currentUser;

    if (!user) {
      setError("You must be logged in to get a forecast.");
      toast.error("User not authenticated. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        "https://finance-api-964839454595.asia-south1.run.app/predict",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.uid,
            forecast_days: parseInt(forecastDays),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `Server responded with status ${response.status}`
        );
      }

      if (data.success && data.forecast && Array.isArray(data.forecast)) {
        setForecast(data.forecast);
        setStatistics(data.statistics);
        setDataSource(data.data_source);
        toast.success(
          `Forecast generated using ${
            data.data_source === "real" ? "your real data" : "synthetic data"
          }!`
        );
      } else {
        throw new Error("Invalid prediction data structure");
      }
    } catch (err) {
      setError(err.message || "Unknown error occurred");
      toast.error(`Failed to get forecast: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const getWeeklyData = () => {
    if (forecast.length === 0) return [];
    const weeks = [];
    for (let i = 0; i < forecast.length; i += 7) {
      const weekData = forecast.slice(i, i + 7);
      const weekSum = weekData.reduce((sum, day) => sum + parseFloat(day.amount), 0);
      const weekAvg = weekSum / weekData.length;
      weeks.push({
        label: `Week ${Math.floor(i / 7) + 1}`,
        average: weekAvg,
        total: weekSum,
        days: weekData.length
      });
    }
    return weeks;
  };

  return (
    <div className="forecast-container">
      <div className="forecast-wrapper">
        {/* Header */}
        <div className="forecast-header">
          <h1 className="forecast-title">Expense Forecast</h1>
          <p className="forecast-subtitle">AI-powered predictions using SARIMA model</p>
        </div>

        {/* Control Panel */}
        <div className="control-panel">
          <div className="control-content">
            <div className="slider-container">
              <label className="slider-label">
                Forecast Period: {forecastDays} Days
              </label>
              <input
                type="range"
                min="7"
                max="90"
                step="7"
                value={forecastDays}
                onChange={(e) => setForecastDays(parseInt(e.target.value))}
                className="slider-input"
              />
              <div className="slider-marks">
                <span className="slider-mark">7d</span>
                <span className="slider-mark">30d</span>
                <span className="slider-mark">60d</span>
                <span className="slider-mark">90d</span>
              </div>
            </div>

            <button
              onClick={fetchPrediction}
              disabled={loading}
              className="generate-btn"
            >
              {loading ? "Generating..." : "Generate Forecast"}
            </button>
          </div>

          {dataSource && (
            <div className={`data-source-badge ${dataSource === 'real' ? 'badge-real' : 'badge-synthetic'}`}>
              {dataSource === 'real' ? '✓ Real Data' : '⚠ Synthetic Data'}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Analyzing spending patterns...</p>
          </div>
        )}

        {/* Results */}
        {!loading && forecast.length > 0 && (
          <div className="results-section">
            {/* Stats Cards */}
            {statistics && (
              <div className="stats-grid">
                <div className="stat-card">
                  <p className="stat-label">Total Forecast</p>
                  <p className="stat-value">
                    {formatCurrency(forecast.reduce((sum, item) => sum + parseFloat(item.amount), 0))}
                  </p>
                </div>

                <div className="stat-card">
                  <p className="stat-label">Daily Average</p>
                  <p className="stat-value">
                    {formatCurrency(forecast.reduce((sum, item) => sum + parseFloat(item.amount), 0) / forecast.length)}
                  </p>
                </div>

                <div className="stat-card">
                  <p className="stat-label">Model AIC</p>
                  <p className="stat-value">{statistics.aic}</p>
                </div>

                <div className="stat-card">
                  <p className="stat-label">Training Days</p>
                  <p className="stat-value">{statistics.training_samples}</p>
                </div>
              </div>
            )}

            {/* Weekly Chart */}
            <div className="chart-container">
              <h2 className="chart-title">Weekly Forecast Overview</h2>
              <div className="chart-bars">
                {getWeeklyData().map((week, idx) => {
                  const maxWeekly = Math.max(...getWeeklyData().map(w => w.average));
                  const height = (week.average / maxWeekly) * 100;
                  
                  return (
                    <div key={idx} className="bar-wrapper">
                      <div 
                        className="bar"
                        style={{ height: `${height}%` }}
                      >
                        <div className="bar-tooltip">
                          {formatCurrency(week.average)}/day
                        </div>
                      </div>
                      <p className="bar-label">{week.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Table */}
            <div className="table-container">
              <div className="table-header">
                <h2 className="table-title">Daily Predictions</h2>
              </div>
              
              <div className="table-scroll">
                <table className="forecast-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Predicted Amount</th>
                      <th>Confidence Range</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.map((item, idx) => {
                      const range = parseFloat(item.upper_bound) - parseFloat(item.lower_bound);
                      const confidence = Math.max(0, Math.min(100, 100 - (range / parseFloat(item.amount)) * 50));
                      
                      return (
                        <tr key={idx}>
                          <td>
                            <div className="date-cell">
                              <span className="date-primary">{formatDate(item.date)}</span>
                              <span className="date-secondary">
                                {new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' })}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="amount-cell">
                              {formatCurrency(item.amount)}
                            </span>
                          </td>
                          <td>
                            <div className="range-cell">
                              {formatCurrency(item.lower_bound)} - {formatCurrency(item.upper_bound)}
                            </div>
                          </td>
                          <td>
                            <div className="confidence-bar">
                              <div 
                                className="confidence-fill" 
                                style={{ width: `${confidence}%` }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Model Info */}
            {statistics && (
              <div className="model-info">
                <h3 className="model-info-title">Model Information</h3>
                <div className="model-info-grid">
                  <div className="model-info-item">
                    <span className="model-info-label">Model Order</span>
                    <p className="model-info-value">{statistics.model_order}</p>
                  </div>
                  <div className="model-info-item">
                    <span className="model-info-label">AIC Score</span>
                    <p className="model-info-value">{statistics.aic}</p>
                  </div>
                  <div className="model-info-item">
                    <span className="model-info-label">BIC Score</span>
                    <p className="model-info-value">{statistics.bic}</p>
                  </div>
                  <div className="model-info-item">
                    <span className="model-info-label">Seasonality</span>
                    <p className="model-info-value">Weekly (7 days)</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && forecast.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3 className="empty-title">No Forecast Generated Yet</h3>
            <p className="empty-text">Select a forecast period and click "Generate Forecast" to see predictions</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Forecast;