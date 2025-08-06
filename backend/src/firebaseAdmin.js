const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccount.json'); // Ensure this path is correct

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-database-name.firebaseio.com."
});

module.exports = admin;
