/**
 * Production-Ready Logging Utility
 * Centralized logging with different levels and formats
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filepath = fileURLToPath(import.meta.url);
const __dirpath = path.dirname(__filepath);

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level
const currentLogLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';

/**
 * Format log message with timestamp
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {string} Formatted log message
 */
const formatLogMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level}: ${message}${metaString}`;
};

/**
 * Write log to file
 * @param {string} message - Log message
 */
const writeToFile = (message) => {
  try {
    const logDir = path.join(__dirpath, '../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, message + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};

/**
 * Log message with specified level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
const log = (level, message, meta = {}) => {
  const levelNum = LOG_LEVELS[level];
  const currentLevelNum = LOG_LEVELS[currentLogLevel];

  if (levelNum <= currentLevelNum) {
    const formattedMessage = formatLogMessage(level, message, meta);
    
    // Console output with colors
    switch (level) {
      case 'ERROR':
        console.error(`\x1b[31m${formattedMessage}\x1b[0m`); // Red
        break;
      case 'WARN':
        console.warn(`\x1b[33m${formattedMessage}\x1b[0m`); // Yellow
        break;
      case 'INFO':
        console.info(`\x1b[36m${formattedMessage}\x1b[0m`); // Cyan
        break;
      case 'DEBUG':
        console.debug(`\x1b[90m${formattedMessage}\x1b[0m`); // Gray
        break;
      default:
        console.log(formattedMessage);
    }

    // Write to file (except for DEBUG in production)
    if (process.env.NODE_ENV === 'production' && level === 'DEBUG') {
      return;
    }
    writeToFile(formattedMessage);
  }
};

/**
 * Logger object with different log levels
 */
export const logger = {
  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Object} meta - Additional metadata
   */
  error: (message, meta = {}) => log('ERROR', message, meta),

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} meta - Additional metadata
   */
  warn: (message, meta = {}) => log('WARN', message, meta),

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {Object} meta - Additional metadata
   */
  info: (message, meta = {}) => log('INFO', message, meta),

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {Object} meta - Additional metadata
   */
  debug: (message, meta = {}) => log('DEBUG', message, meta),

  /**
   * Log HTTP request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} responseTime - Response time in ms
   */
  http: (req, res, responseTime) => {
    const message = `${req.method} ${req.path} ${res.statusCode} - ${responseTime}ms`;
    const meta = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    if (res.statusCode >= 400) {
      logger.error(message, meta);
    } else {
      logger.info(message, meta);
    }
  },

  /**
   * Log database operation
   * @param {string} operation - Database operation
   * @param {string} collection - Collection name
   * @param {Object} meta - Additional metadata
   */
  database: (operation, collection, meta = {}) => {
    logger.debug(`Database ${operation} on ${collection}`, meta);
  },

  /**
   * Log authentication event
   * @param {string} event - Authentication event
   * @param {string} username - Username
   * @param {Object} meta - Additional metadata
   */
  auth: (event, username, meta = {}) => {
    logger.info(`Auth ${event}: ${username}`, meta);
  }
};

export default logger;
