/**
 * Logger Middleware
 * Simple request/response logging middleware
 */

/**
 * HTTP Request Logger Middleware
 * Logs incoming requests and their response times
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, url, ip } = req;
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${method} ${url} - IP: ${ip}`);
  
  // Log response when finished
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    const { statusCode } = res;
    console.log(
      `[${new Date().toISOString()}] ${method} ${url} - Status: ${statusCode} - ${responseTime}ms`
    );
  });
  
  next();
};

/**
 * Error Logger Middleware
 * Logs errors that occur during request processing
 */
export const errorLogger = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERROR:`, {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  
  next(err);
};

/**
 * Log levels for different types of messages
 */
export const log = {
  info: (message, data = {}) => {
    console.log(`[${new Date().toISOString()}] INFO: ${message}`, data);
  },
  
  warn: (message, data = {}) => {
    console.warn(`[${new Date().toISOString()}] WARN: ${message}`, data);
  },
  
  error: (message, data = {}) => {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`, data);
  },
  
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] DEBUG: ${message}`, data);
    }
  }
};
