const functions = require("firebase-functions");
const axios = require("axios");
const cors = require("cors")({ origin: true });
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Configuration
const config = {
  apiUrl: "https://finance-api-964839454595.asia-south1.run.app",
  requestTimeout: 30000, // 30 seconds
  maxRequestsPerHour: 10, // Implement rate limiting if needed
};

/**
 * Cloud function that fetches ML predictions for financial data
 * @param {Object} data - Request payload
 * @param {number} data.days - Number of days to forecast
 * @param {string} [data.start_date] - Optional starting date in YYYY-MM-DD format
 */
exports.getMLPrediction = functions.https.onCall(async (data, context) => {
  // Authenticate users (optional - remove if public access is needed)
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required to access this function"
    );
  }

  // Input validation
  if (!data.days || typeof data.days !== "number" || data.days <= 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      'The "days" parameter must be a positive number'
    );
  }

  if (data.start_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.start_date)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      'The "start_date" parameter must be in YYYY-MM-DD format'
    );
  }

  // Rate limiting implementation
  const uid = context.auth.uid;
  const userRequestsRef = admin
    .firestore()
    .collection("user_requests")
    .doc(uid);

  try {
    // Optional: Implement rate limiting
    // Uncomment this block to enable rate limiting
    /*
    const userDoc = await userRequestsRef.get();
    const userData = userDoc.exists ? userDoc.data() : { requests: [] };
    
    // Filter requests from the last hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentRequests = userData.requests.filter(req => req.timestamp > oneHourAgo);
    
    if (recentRequests.length >= config.maxRequestsPerHour) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. Maximum ${config.maxRequestsPerHour} requests per hour.`
      );
    }
    
    // Update request history
    await userRequestsRef.set({
      requests: [
        ...recentRequests,
        { timestamp: Date.now() }
      ]
    }, { merge: true });
    */

    // Set timeout and configure request
    const apiUrl = `${config.apiUrl}/predict`;
    const requestConfig = {
      timeout: config.requestTimeout,
    };

    const requestBody = {
      days: data.days,
      ...(data.start_date && { start_date: data.start_date }),
    };

    // Make API request
    const response = await axios.post(apiUrl, requestBody, requestConfig);

    // Log successful requests
    functions.logger.info("ML prediction successful", {
      user: uid,
      days: data.days,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      forecast: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    // Enhanced error handling
    functions.logger.error("ML API Error", {
      user: uid,
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });

    // Categorize errors
    let errorCode = "unknown";
    let errorMessage = "Failed to fetch prediction";

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorCode = "api-error";
      errorMessage = `API returned error ${error.response.status}: ${
        error.response.data?.message || "Unknown API error"
      }`;
    } else if (error.request) {
      // The request was made but no response was received
      errorCode = "network-error";
      errorMessage = "Network error: No response received from ML API";
    } else {
      // Something happened in setting up the request
      errorCode = "request-setup";
      errorMessage = "Error setting up request";
    }

    throw new functions.https.HttpsError(errorCode, errorMessage, {
      originalError: error.message,
    });
  }
});

// REST endpoint version that uses CORS
exports.getMLPredictionREST = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const { days, start_date } = req.body;

      // Validation logic
      if (!days || typeof days !== "number" || days <= 0) {
        return res.status(400).json({
          success: false,
          message: 'The "days" parameter must be a positive number',
        });
      }

      // Add start_date validation to match callable function
      if (start_date && !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
        return res.status(400).json({
          success: false,
          message: 'The "start_date" parameter must be in YYYY-MM-DD format',
        });
      }

      const response = await axios.post(
        `${config.apiUrl}/predict`,
        {
          days,
          ...(start_date && { start_date }),
        },
        { timeout: config.requestTimeout }
      );

      return res.json({
        success: true,
        forecast: response.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      functions.logger.error("ML API Error (REST):", error.message);

      // Enhanced error handling for REST endpoint
      let statusCode = 500;
      let errorMessage = "Failed to fetch prediction";

      if (error.response) {
        statusCode = error.response.status || 500;
        errorMessage = error.response.data?.message || errorMessage;
      }

      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: error.message,
      });
    }
  });
});

// Health check endpoint
exports.health = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Ping the ML API health endpoint
      const response = await axios.get(`${config.apiUrl}/health`, {
        timeout: 5000,
      });

      return res.json({
        success: true,
        status: "healthy",
        apiStatus: response.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        status: "unhealthy",
        message: "Could not connect to ML API",
        error: error.message,
      });
    }
  });
});
