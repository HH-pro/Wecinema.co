const Joi = require('joi');
const path = require('path');

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  
  // Database
  MONGODB_URI: Joi.string().uri().required(),
  MONGODB_DB_NAME: Joi.string().default('wecinemaDB_test'),
  MONGODB_MAX_POOL_SIZE: Joi.number().default(10),
  MONGODB_MIN_POOL_SIZE: Joi.number().default(2),
  
  // Security
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  
  // External Services
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
  STRIPE_PUBLISHABLE_KEY: Joi.string().required(),
  
  // Firebase
  FIREBASE_SERVICE_ACCOUNT_PATH: Joi.string().default(
    path.join(__dirname, '../../config/firebase-service-account.json')
  ),
  
  // Sentry
  SENTRY_DSN: Joi.string().uri().allow('').default(''),
  
  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  
  // Cron
  CRON_ENABLED: Joi.boolean().default(true),
  
  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
}).unknown(true);

const loadConfig = () => {
  const { error, value: env } = envSchema.validate(process.env, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    const missingVars = error.details.map((d) => d.path.join('.')).join(', ');
    throw new Error(`Environment validation failed: ${missingVars}`);
  }

  const allowedOrigins = env.CORS_ORIGINS.split(',').map(o => o.trim());

  return {
    env: env.NODE_ENV,
    port: env.PORT,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    
    database: {
      uri: env.MONGODB_URI,
      name: env.MONGODB_DB_NAME,
      maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
      minPoolSize: env.MONGODB_MIN_POOL_SIZE,
    },
    
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
    },
    
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    },
    
    firebase: {
      serviceAccountPath: env.FIREBASE_SERVICE_ACCOUNT_PATH,
    },
    
    sentry: {
      dsn: env.SENTRY_DSN,
    },
    
    cors: {
      allowedOrigins,
    },
    
    cron: {
      enabled: env.CRON_ENABLED,
    },
    
    logging: {
      level: env.LOG_LEVEL,
    },
  };
};

const config = loadConfig();

module.exports = {
  config,
  loadConfig,
};