const mongoose = require("mongoose");

/**
 * Connect to a MongoDB database using Mongoose.
 * @param {string} databaseURL - The URL of the MongoDB database to connect to.
 * @returns {Promise<mongoose.Mongoose>} A promise that resolves with the Mongoose instance upon successful connection.
 */
async function connectToMongoDB(databaseURL) {
	// Define Mongoose connection options.
	const options = {
		dbName: "wecinemaDB_test",
		useNewUrlParser: true,
		useUnifiedTopology: true,
		// Additional options can be added here if needed.
	};

	try {
		// Attempt to connect to the MongoDB database.
		const mongooseInstance = await mongoose.connect(databaseURL, options);
		console.log("DB CONNECTION SUCCESSFUL!");
		console.log("M", databaseURL);
		
		// 🆕 Check if Stripe environment variables are set
		checkStripeConfig();
		
		return mongooseInstance;
	} catch (error) {
		// Handle connection errors.
		console.error(
			`An error occurred while connecting to the database: ${error}`
		);
		throw error;
	}
}

// 🆕 Stripe Configuration Check Function
function checkStripeConfig() {
	const requiredStripeVars = [
		'STRIPE_SECRET_KEY',
		'STRIPE_PUBLISHABLE_KEY', 
		'STRIPE_WEBHOOK_SECRET'
	];
	
	const missingVars = requiredStripeVars.filter(varName => !process.env[varName]);
	
	if (missingVars.length > 0) {
		console.warn('⚠️  STRIPE CONFIGURATION WARNING:');
		console.warn('Missing environment variables:', missingVars.join(', '));
		console.warn('Marketplace payments will not work without Stripe configuration.');
		console.warn('Please add these variables to your .env file:');
		console.warn('STRIPE_SECRET_KEY=sk_test_...');
		console.warn('STRIPE_PUBLISHABLE_KEY=pk_test_...'); 
		console.warn('STRIPE_WEBHOOK_SECRET=whsec_...');
	} else {
		console.log('✅ Stripe configuration found - Marketplace payments enabled');
	}
}

module.exports = connectToMongoDB;