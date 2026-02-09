const winston = require('winston');

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

/**
 * Custom format for development environment
 */
const devFormat = printf(({ level, message, timestamp, label, ...metadata }) => {
  const labelStr = label ? `[${label}]` : '';
  const metaStr = Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : '';
  return `${timestamp} ${level} ${labelStr}: ${message} ${metaStr}`;
});

/**
 * Create a logger instance with specified label
 * @param {string} label - Module/component identifier
 * @returns {winston.Logger}
 */
const createLogger = (label) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  const transports = [
    new winston.transports.Console({
      silent: isTest,
    }),
  ];

  // Add file transport in production
  if (!isDevelopment && !isTest) {
    transports.push(
      new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({ 
        filename: 'logs/combined.log',
        maxsize: 5242880,
        maxFiles: 5,
      })
    );
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    defaultMeta: { label, service: 'wecinema-api' },
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      isDevelopment ? colorize() : json(),
      isDevelopment ? devFormat : json()
    ),
    transports,
  });
};

/**
 * Default application logger
 */
const defaultLogger = createLogger('App');

module.exports = {
  createLogger,
  logger: defaultLogger,
};