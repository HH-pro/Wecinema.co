const Joi = require('joi');

/**
 * Environment variable schema validation
 */
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
  FIREBASE_SERVICE_ACCOUNT_PATH: Joi.string().default('./config/firebase-service-account.json'),
  
  // Optional
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
}).unknown(true);

/**
 * Validate and load configuration
 * @returns {Object}
 * @throws {Error}
 */
const loadConfig = () => {
  const { error, value: validatedEnv } = envSchema.validate(process.env, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    const missingVars = error.details.map((d) => d.path.join('.')).join(', ');
    throw new Error(`Environment validation failed: ${missingVars}`);
  }

  return {
    env: validatedEnv.NODE_ENV,
    port: validatedEnv.PORT,
    isDevelopment: validatedEnv.NODE_ENV === 'development',
    isProduction: validatedEnv.NODE_ENV === 'production',
    
    database: {
      uri: validatedEnv.MONGODB_URI,
      name: validatedEnv.MONGODB_DB_NAME,
      maxPoolSize: validatedEnv.MONGODB_MAX_POOL_SIZE,
      minPoolSize: validatedEnv.MONGODB_MIN_POOL_SIZE,
    },
    
    jwt: {
      secret: validatedEnv.JWT_SECRET,
      expiresIn: validatedEnv.JWT_EXPIRES_IN,
    },
    
    stripe: {
      secretKey: validatedEnv.STRIPE_SECRET_KEY,
      webhookSecret: validatedEnv.STRIPE_WEBHOOK_SECRET,
    },
    
    firebase: {
      serviceAccountPath: validatedEnv.FIREBASE_SERVICE_ACCOUNT_PATH,
    },
    
    logging: {
      level: validatedEnv.LOG_LEVEL,
    },
  };
};

const config = loadConfig();

module.exports = {
  config,
  loadConfig,
};