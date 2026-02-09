const Joi = require('joi');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  
  // Required
  MONGODB_URI: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  
  // Optional in dev
  STRIPE_SECRET_KEY: isDev ? Joi.string().allow('') : Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: isDev ? Joi.string().allow('') : Joi.string().required(),
  STRIPE_PUBLISHABLE_KEY: isDev ? Joi.string().allow('') : Joi.string().required(),
  
  // Firebase
  FIREBASE_SERVICE_ACCOUNT_PATH: Joi.string().default(
    path.join(__dirname, '../../config/firebase-service-account.json')
  ),
  
  // Email
  EMAIL_SERVICE: Joi.string().default('gmail'),
  EMAIL_USER: Joi.string().email().allow(''),
  EMAIL_APP_PASSWORD: Joi.string().allow(''),
  
  // Frontend
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),
  
  // Misc
  CRON_ENABLED: Joi.boolean().default(false),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default(isDev ? 'debug' : 'info'),
}).unknown(true);

const loadConfig = () => {
  const { error, value: env } = envSchema.validate(process.env, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    const missing = error.details.map(d => d.path.join('.')).join(', ');
    console.error('\n❌ Missing required environment variables:', missing);
    console.error('Create .env file with these variables\n');
    process.exit(1);
  }

  return {
    env: env.NODE_ENV,
    port: env.PORT,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    
    database: {
      uri: env.MONGODB_URI,
    },
    
    jwt: {
      secret: env.JWT_SECRET,
    },
    
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY || null,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET || null,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY || null,
      isConfigured: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
    },
    
    firebase: {
      serviceAccountPath: env.FIREBASE_SERVICE_ACCOUNT_PATH,
    },
    
    email: {
      service: env.EMAIL_SERVICE,
      user: env.EMAIL_USER,
      password: env.EMAIL_APP_PASSWORD,
      isConfigured: !!(env.EMAIL_USER && env.EMAIL_APP_PASSWORD),
    },
    
    frontend: {
      url: env.FRONTEND_URL,
      corsOrigins: env.CORS_ORIGINS.split(',').map(o => o.trim()),
    },
    
    cron: {
      enabled: env.CRON_ENABLED,
    },
    
    logging: {
      level: env.LOG_LEVEL,
    },
  };
};

module.exports = { config: loadConfig() };