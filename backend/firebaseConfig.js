// firebaseConfig.js
const admin = require('firebase-admin');

let adminApp = null;

try {
  if (!admin.apps.length) {
    // Check if all required environment variables are present
    const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn(`⚠️ Missing Firebase environment variables: ${missingVars.join(', ')}`);
      console.warn('⚠️ Firebase features will be disabled');
    } else {
      // Initialize with environment variables
      const firebaseConfig = {
        type: process.env.FIREBASE_TYPE || "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQD2A/ZteybJ10uG\nveI1muaAJTgGL9anCZWMIWjcZoRPuLMjRFh0ZC3JG/R+y7UQV8s6hjAFRgdb8Uwn\n767IbwaZnQfUeEFO+ysWoNmicLamNAEB/qktVTjbl6NNN+wg8XRmHNnGI4bTt6Ps\nNSbGIqqvQusJd1Euq6ny5LctMPf4ec9o8cMGk0Gp8J+90ijoHYq4jTmyobRYU//H\nsVvPYkcJrtdqu0Z3ceUmk8+47vpmXIEvJhrHUxhQfwW0HKh4x9nN9eFYEOakgw9t\n/NAAZQVQybw4Y0EVLU7jGbr4bf8rxm8qQ/7C4BuBIGsRs8GrY66QKJyI5YTY4p46\npHWvFOMzAgMBAAECggEAEUOP7Hji7PEdzLPQhwB6wm1aNBzxTEGA7BeAG09aY5nL\ngGMQbgKFsAI1MxyqdR4kFdRK1GPoqkwRkw/fzRL1fJwna4KQ2rEHggwBmcOdHaay\nl2g+iP7dAZPvksCk4l7vUycdJSljEcJmT3IfaXIPVkM06TIlUUgcof3o2NQB4r7O\nU/EWvMLen7LMF4s6efc0Sl/HDsBBgnCLkJfdI00hWAgvxW15hAWljrzw+VZQNXEE\nJlICHsDCiogGcfWhZ8cGlpQW0CmwtOpie5CRZ9ZJalSVG6jyMf0I30efjE1NSHxu\n/D/K27HsxsvTdch/e/SqRsF3fJjOKG8niS7LDkOL6QKBgQD/kVrIVedX7F3GPtQW\n7kRCVMM3bpJu0LyuvcXHKA9qOoZlJ6v1rC3L5DwJMiTm1NNOzJ2dHwOB/9w0Fdkc\n7Qan8h9vPdFBVMgCIJkxL8zOCKBAWI5I/tb+YdNEAPo9DxqhEVU5gVGtt1UcKpVt\nlchw/Q9p31nXmlsWA9iKikBxBQKBgQD2bnjwO8xmSRm8XVp4xu8IgrwRmYrjMBVz\nmTtc0CqU04akKJsJPN4lJl8joymCoeOBzJCX430aqx1WUpykrvdV84NRMOA+k79Q\n4a0LDy2pFLp3BJ972SY6ccXjy1/agTdwxBzaxWGmBlLH4g4rwhoH5Axv8fLWFqgK\nrB5YE1+Y1wKBgGNnkysHFsPBITxh5bbBmHVAaOofrP9DW5CQKeRr9Yr5Fpsz0hPt\nk6aRsLRW97l9IG+u8MNTc9bVwT3VHay9mPAsIgPvxHun0V/adBuInx2oh0Rf7YAA\n93jcbgMuaibjwBTUHBUQ8sch3w3klliYgO1J0Pv6LwTIehNXDZvdaHFNAoGAe/Rj\nhss9bDHW7SWz7U57S7ee6+dkshQspiHsdyoKUSP49LesDEB+qQcdEervZVMTAeYo\n0Q3PjsuFjTcurbOIm8ZKRlukYDWnJQLvLMHswMC5bkZ4Bi7bCMjTtlpFE76taV5r\n+SsRjBZgK0SsxhvzRgbSrrhv4now+nVLKhhMnK8CgYEA3dnEoFzrGYely++zvrsl\nd14xlTZxgZ4ju7CbJuy8lpkv6X+sXPCaVfBwRX7YZJcvHHZNoReKcRU47i0S5Gpa\nyk0rHEBk6bsxfsLFtNEjBMqE+Z+CfH5dyisb3EZwB607/g7gDfV5uk5rz1FraGQz\nXF21SZOyh5L7TvOptxQ10u8=\n-----END PRIVATE KEY-----\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
        token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
      };

      adminApp = admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://wecinema-21d00.firebaseio.com",
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      
      console.log("✅ Firebase Admin SDK initialized successfully");
    }
  } else {
    adminApp = admin.apps[0];
    console.log("✅ Firebase Admin SDK already initialized");
  }
} catch (error) {
  console.error("❌ Firebase Admin initialization error:", error.message);
}

const database = adminApp ? adminApp.database() : null;
const auth = adminApp ? admin.auth() : null;

module.exports = { 
  admin: adminApp, 
  database, 
  auth,
  isInitialized: !!adminApp 
};