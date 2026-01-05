const express = require("express");
const jwt = require("jsonwebtoken");

const argon2 = require("argon2");
const axios = require('axios');
const router = express.Router();
// Import your User model (assuming you have a MongoDB User model)
const User = require("../models/user");
const Video = require("../models/videos");
const Contact = require("../models/contact");
const Subscription  = require("../models/subscription");
const Transaction = require("../models/transaction"); 
// const admin = require('../firebaseAdmin');



const { authenticateMiddleware, isAdmin } = require("../utils");
router.post("/admin/register", async (req, res) => {
	try {
	  const { email, password, username, dob, isAdmin, isSubAdmin } = req.body;
  
	  // Validate required fields
	  if (!email || !password || !username || !dob) {
		return res.status(400).json({ error: "All fields are required" });
	  }
  
	  // Validate at least one role is selected
	  if (!isAdmin && !isSubAdmin) {
		return res.status(400).json({ error: "At least one role (Admin or SubAdmin) must be selected" });
	  }
  
	  // Check if user already exists
	  const existingUser = await User.findOne({ email });
	  if (existingUser) {
		return res.status(400).json({ error: "User already exists" });
	  }
  
	  // Hash password
	  const hashedPassword = await argon2.hash(password);
  
	  // Create new user with roles
	  const newUser = new User({
		email,
		password: hashedPassword,
		username,
		dob,
		isAdmin: isAdmin || false,
		isSubAdmin: isSubAdmin || false,
		avatar: ""
	  });
  
	  await newUser.save();
  
	  // Return user without password
	  const userWithoutPassword = newUser.toObject();
	  delete userWithoutPassword.password;
  
	  res.status(201).json(userWithoutPassword);
	} catch (error) {
	  console.error("Error during user registration:", error);
	  res.status(500).json({ error: "Internal Server Error" });
	}
  });
  router.post("/admin/login", async (req, res) => {
	try {
	  const { email, password } = req.body;
  
	  // Find the user by email
	  const user = await User.findOne({ email });
  
	  // Check if the user exists
	  if (!user) {
		return res.status(401).json({ error: "Invalid credentials" });
	  }
  
	  // Check if the user has admin or subadmin privileges
	  if (!user.isAdmin && !user.isSubAdmin) {
		return res.status(403).json({ 
		  error: "Access denied. Requires admin or subadmin privileges." 
		});
	  }
  
	  // Compare the provided password with the hashed password in the database
	  const passwordMatch = await argon2.verify(user.password, password);
  
	  if (passwordMatch) {
		const key = "weloremcium.secret_key";
  
		// Generate a JWT token for authentication
		const token = jwt.sign(
		  { 
			userId: user._id, 
			username: user.username, 
			avatar: user.avatar, 
			isAdmin: user.isAdmin,
			isSubAdmin: user.isSubAdmin 
		  },
		  key,
		  { expiresIn: "8h" }
		);
  
		// Return user role information in the response
		res.status(200).json({ 
		  token,
		  user: {
			_id: user._id,
			username: user.username,
			email: user.email,
			isAdmin: user.isAdmin,
			isSubAdmin: user.isSubAdmin,
			avatar: user.avatar
		  }
		});
	  } else {
		// If passwords do not match, return an error
		res.status(401).json({ error: "Invalid credentials" });
	  }
	} catch (error) {
	  console.error("Error during admin login:", error);
	  res.status(500).json({ error: "Internal Server Error" });
	}
  });
// Get all privileged users (admins and subadmins)
router.get("/admin/users", async (req, res) => {
	try {
	  // Get query parameters for filtering
	  const { role } = req.query;
	  
	  let query = { 
		$or: [
		  { isAdmin: true },
		  { isSubAdmin: true }
		] 
	  };
  
	  // Apply role filter if specified
	  if (role) {
		if (role === 'admin') {
		  query = { isAdmin: true };
		} else if (role === 'subadmin') {
		  query = { isSubAdmin: true };
		} else if (role === 'both') {
		  query = { 
			$and: [
			  { isAdmin: true },
			  { isSubAdmin: true }
			]
		  };
		}
	  }
  
	  const privilegedUsers = await User.find(query)
		.select('-password')
		.sort({ createdAt: -1 }); // Sort by newest first
  
	  res.status(200).json({
		count: privilegedUsers.length,
		users: privilegedUsers
	  });
	} catch (error) {
	  console.error("Error fetching privileged users:", error);
	  res.status(500).json({ 
		error: "Internal Server Error",
		details: error.message 
	  });
	}
  });
  
  // Add admin privileges to a user
  router.put("/admin/add", async (req, res) => {
	try {
	  const { email } = req.body;
  
	  // Find the user by email
	  const user = await User.findOne({ email });
  
	  if (!user) {
		return res.status(404).json({ error: "User not found" });
	  }
  
	  // Update the user to be an admin
	  user.isAdmin = true;
	  await user.save();
  
	  // Return the user without the password
	  const userWithoutPassword = user.toObject();
	  delete userWithoutPassword.password;
  
	  res.status(200).json(userWithoutPassword);
	} catch (error) {
	  console.error("Error adding admin:", error);
	  res.status(500).json({ error: "Internal Server Error" });
	}
  });
  
  // Remove admin/subadmin privileges from a user
router.put("/admin/remove/:userId", async (req, res) => {
	try {
	  const { userId } = req.params;
	  const { removeAll = true, removeAdmin = true, removeSubAdmin = true } = req.body;
  
	  // Find the user by ID
	  const user = await User.findById(userId);
	  
	  if (!user) {
		return res.status(404).json({ error: "User not found" });
	  }
  
	  // Check if the requesting user has permission to modify this user
	  // (Add your own permission logic here if needed)
  
	  // Update privileges based on request parameters
	  const updates = {
		isAdmin: removeAll || removeAdmin ? false : user.isAdmin,
		isSubAdmin: removeAll || removeSubAdmin ? false : user.isSubAdmin
	  };
  
	  // Apply updates
	  const updatedUser = await User.findByIdAndUpdate(
		userId,
		{ $set: updates },
		{ new: true }
	  ).select("-password");
  
	  if (!updatedUser) {
		return res.status(404).json({ error: "User not found after update" });
	  }
  
	  res.status(200).json({
		message: "Privileges removed successfully",
		user: updatedUser,
		removed: {
		  admin: removeAll || removeAdmin,
		  subAdmin: removeAll || removeSubAdmin
		}
	  });
	} catch (error) {
	  console.error("Error removing privileges:", error);
	  res.status(500).json({ 
		error: "Internal Server Error",
		details: error.message 
	  });
	}
  });
router.post('/verify-token', async (req, res) => {
	const idToken = req.body.token;
  
	try {
	  const decodedToken = await admin.auth().verifyIdToken(idToken);
	  res.status(200).send(decodedToken);
	} catch (error) {
	  res.status(401).send({ error: 'Token is not valid' });
	}
  });
router.get("/verify-email", async (req, res) => {
	const { email } = req.query;
	try {
	  const user = await User.findOneAndUpdate({ email }, { isVerified: true });
	  if (!user) return res.status(404).send("User not found");
	  res.send("Email verified successfully! Go back to website.");
	} catch (err) {
	  console.error(err);
	  res.status(500).send("Error verifying email");
	}
});

router.post("/contact", async (req, res) => {
    try {
        const { name, email, message } = req.body;

        // Validate input
        if (!name || !email || !message) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Create a new contact message
        const newContact = new Contact({ name, email, message });
        await newContact.save();

        res.status(201).json({ message: "Contact message sent successfully" });
    } catch (error) {
        console.error("Error handling contact form submission:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// User registration route (for both Email/Password and Google)
router.post('/signup', async (req, res) => {
	try {
		const { username, email, password, avatar, dob, userType, isGoogleAuth } = req.body;
		
		// Check if the user already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res
				.status(400)
				.json({ error: "User already exists with this email" });
		}

		// For Google auth, username and email are required
		// For email/password auth, username, email and password are required
		if (isGoogleAuth) {
			if (!username || !email) {
				return res.status(400).json({ error: "Username and email are required for Google signup" });
			}
		} else {
			if (!username || !email || !password) {
				return res.status(400).json({ error: "Username, email and password are required" });
			}
		}

		// Hash the password - different approach for Google vs Email
		const hashedPassword = isGoogleAuth 
			? await argon2.hash("wecinema_google_auth") // Fixed password for Google users
			: await argon2.hash(password);

		// Create a new user
		const newUser = await User.create({
			username,
			email,
			password: hashedPassword,
			userType: userType || 'buyer',
			avatar: avatar || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
			dob: dob || "--------",
			authProvider: isGoogleAuth ? 'google' : 'email' // Track auth method
		});

		// Generate token for immediate login
		const key = "weloremcium.secret_key";
		const token = jwt.sign(
			{ userId: newUser._id, username: newUser.username, avatar: newUser.avatar },
			key,
			{ expiresIn: "8h" }
		);

		res.status(201).json({ 
			message: "User registered successfully", 
			token,
			user: {
				id: newUser._id,
				username: newUser.username,
				email: newUser.email,
				userType: newUser.userType,
				avatar: newUser.avatar
			}
		});
	} catch (error) {
		console.error("Error creating user:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// User login route (for both Email/Password and Google)
router.post('/signin', async (req, res) => {
	try {
		const { email, password, isGoogleAuth } = req.body;

		// Find the user by email
		const user = await User.findOne({ email });

		// Check if the user exists
		if (!user) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		// For Google login
		if (isGoogleAuth) {
			const key = "weloremcium.secret_key";
			const token = jwt.sign(
				{ userId: user._id, username: user.username, avatar: user.avatar },
				key,
				{ expiresIn: "8h" }
			);

			return res.status(200).json({ 
				token,
				user: {
					id: user._id,
					username: user.username,
					email: user.email,
					userType: user.userType,
					avatar: user.avatar
				}
			});
		}

		// For email/password login
		if (password) {
			const isPasswordValid = await argon2.verify(user.password, password);
			
			if (isPasswordValid) {
				const key = "weloremcium.secret_key";
				const token = jwt.sign(
					{ userId: user._id, username: user.username, avatar: user.avatar },
					key,
					{ expiresIn: "8h" }
				);

				return res.status(200).json({ 
					token,
					user: {
						id: user._id,
						username: user.username,
						email: user.email,
						userType: user.userType,
						avatar: user.avatar
					}
				});
			} else {
				return res.status(401).json({ error: "Invalid credentials" });
			}
		}

		res.status(401).json({ error: "Invalid credentials" });
	} catch (error) {
		console.error("Error during login:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});
  
  // Route for creating a user account
  router.post("/register", async (req, res) => {
	  try {
		  const { username, email, password, avatar, dob } = req.body;
		  // Check if the user already exists
		  const existingUser = await User.findOne({ email });
		  if (existingUser) {
			  return res
				  .status(400)
				  .json({ error: "User already exists with this email" });
		  }
  
		  // Hash the password using bcrypt
		  const hashedPassword = !password
			  ? await argon2.hash("wecinema")
			  : await argon2.hash(password);
  
		  // Create a new user
		  const newUser = await User.create({
			  username,
			  email,
			  password: hashedPassword,
			  avatar: avatar
				  ? avatar
				  : "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
			  dob,
		  });
		  res
			  .status(201)
			  .json({ message: "User registered successfully", user: newUser.email });
	  } catch (error) {
		  console.error("Error creating user:", error);
		  res.status(500).json({ error: "Internal Server Error" });
	  }
  });
  
  router.post("/login", async (req, res) => {
	try {
	  const { email, password } = req.body;
  
	  // Find the user by email
	  const user = await User.findOne({ email });
  
	  // Check if the user exists
	  if (!user) {
		return res.status(401).json({ error: "Invalid credentials" });
	  }
  
	  // Compare the provided password with the hashed password in the database
	  const passwordMatch = await argon2.verify(user.password, password);
  
	  if (!passwordMatch) {
		return res.status(401).json({ error: "Invalid credentials" });
	  }
  
	  // Check if email is verified
	  if (!user.isVerified) {
		return res.status(401).json({ error: "Email not verified", isVerified: false });
	  }
  
	  // If everything checks out, generate a JWT token
	  const key = "weloremcium.secret_key";
	  const token = jwt.sign(
		{
		  userId: user._id,
		  username: user.username,
		  avatar: user.avatar,
		},
		key,
		{ expiresIn: "8h" }
	  );
  
	  // Respond with token and verified status
	  res.status(200).json({
		token,
		isVerified: true,
	  });
	} catch (error) {
	  console.error("Error during login:", error);
	  res.status(500).json({ error: "Internal Server Error" });
	}
  });
  
  
  router.put("/:id/follow", authenticateMiddleware, async (req, res) => {
	try {
		const { action, userId } = req.body;
		const targetUserId = req.params.id;

		// Validate required fields
		if (!userId) {
			return res.status(400).json({ error: "User ID is required" });
		}
		if (userId === targetUserId) {
			return res.status(400).json({ error: "You cannot follow/unfollow yourself" });
		}

		// Ensure the target user exists
		const userExists = await User.exists({ _id: targetUserId });
		if (!userExists) {
			return res.status(404).json({ error: "User not found" });
		}

		// Use transactions for atomic updates
		const session = await User.startSession();
		session.startTransaction();

		try {
			if (action === "follow") {
				await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: userId } }, { session });
				await User.findByIdAndUpdate(userId, { $addToSet: { followings: targetUserId } }, { session });
			} else if (action === "unfollow") {
				await User.findByIdAndUpdate(targetUserId, { $pull: { followers: userId } }, { session });
				await User.findByIdAndUpdate(userId, { $pull: { followings: targetUserId } }, { session });
			} else {
				await session.abortTransaction();
				session.endSession();
				return res.status(400).json({ error: "Invalid action. Use 'follow' or 'unfollow'." });
			}

			// Commit transaction
			await session.commitTransaction();
			session.endSession();

			// Fetch updated user data
			const updatedUser = await User.findById(targetUserId);
			res.json(updatedUser);
		} catch (error) {
			await session.abortTransaction();
			session.endSession();
			throw error;
		}
	} catch (error) {
		console.error("Error updating follow status:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});
// New route to get paid users (should be before /user/:id)
router.get('/paid-users', async (req, res) => {
    try {
        const paidUsers = await User.find({ hasPaid: true }).lean();
        res.status(200).json(paidUsers);
    } catch (error) {
        console.error('Error fetching paid users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route for getting a particular user
router.get("/:id", async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).lean();

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const age = new User(user).calculateAge();
        let allowedGenres = ["G", "PG"];

        if (age >= 13) {
            allowedGenres.push("PG-13", "R");
        }
        if (age >= 22) {
            allowedGenres.push("X");
        }

        res.json({ ...user, allowedGenres });
    } catch (error) {
        console.error("Error fetching user by ID:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


router.get("/payment/user/:id", async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).lean();

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const age = new User(user).calculateAge();
        let allowedGenres = ["G", "PG"];

        if (age >= 13) {
            allowedGenres.push("PG-13", "R");
        }
        if (age >= 22) {
            allowedGenres.push("X");
        }

        res.json({ ...user, allowedGenres });
    } catch (error) {
        console.error("Error fetching user by ID:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Backend: Route for Changing Password
router.put("/change-password", async (req, res) => {
	try {
	  const { email, currentPassword, newPassword } = req.body;
  
	  // Check if the user exists
	  const existingUser = await User.findOne({ email });
	  if (!existingUser) {
		return res.status(404).json({ error: "User not found" });
	  }
  
	  // Verify the current password
	  const isPasswordValid = await argon2.verify(existingUser.password, currentPassword);
	  if (!isPasswordValid) {
		return res.status(401).json({ error: "Current password is incorrect" });
	  }
  
	  // Check if the new password is the same as the current password
	  const isSamePassword = await argon2.verify(existingUser.password, newPassword);
	  if (isSamePassword) {
		return res.status(400).json({ error: "New password cannot be the same as the current password" });
	  }
  
	  // Hash the new password
	  const hashedPassword = await argon2.hash(newPassword);
  
	  // Update the user's password
	  existingUser.password = hashedPassword;
	  await existingUser.save();
  
	  return res.status(200).json({ message: "Password changed successfully" });
	} catch (error) {
	  console.error("Error changing password:", error);
	  res.status(500).json({ error: "Internal Server Error" });
	}
  });

//edit a particular user
router.put("/edit/:id", authenticateMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const { username, email, password, avatar, dob } = req.body;

		// Find the user by ID
		let user = await User.findById(id);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		// Update user properties
		user.username = username || user.username;
		user.email = email || user.email;
		user.avatar = avatar || user.avatar;
		user.dob = dob || user.dob;

		if (password) {
			// Hash the new password using bcrypt
			const hashedPassword = await argon2.hash(password);
			user.password = hashedPassword;
		}

		// Save the updated user
		user = await user.save();

		res.status(200).json({ message: "User updated successfully", user });
	} catch (error) {
		console.error("Error updating user:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});


// Change user type (buyer/seller)
router.put("/change-type/:id", authenticateMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { userType } = req.body;

        // Validate userType
        if (!userType || !['buyer', 'seller'].includes(userType)) {
            return res.status(400).json({ error: "Invalid user type. Must be 'buyer' or 'seller'" });
        }

        // Find the user by ID
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Update user type
        user.userType = userType;

        // Save the updated user
        await user.save();

        res.status(200).json({ 
            message: "User type updated successfully", 
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                userType: user.userType
            }
        });
    } catch (error) {
        console.error("Error updating user type:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
//delete a particular user - only admin function
router.delete("/delete/:id",   authenticateMiddleware, isAdmin,async (req, res) => {
	try {
		const { id } = req.params;

		// Find the user by ID and delete
		const deletedUser = await User.findByIdAndDelete(id);
		if (!deletedUser) {
			return res.status(404).json({ error: "User not found" });
		}

		res.status(200).json({ message: "User deleted successfully" });
	} catch (error) {
		console.error("Error deleting user:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

//Route for getting a particular user
router.get("/", async (req, res) => {
	try {
		// Extract user ID from request parameters
		const users = await User.find(); // Find user by ID

		res.json(users); // Return the user as JSON
	} catch (error) {
		console.error("Error fetching user by ID:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

router.put("/change-user-status", async (req, res) => {
	try {
		// Set all users' isActive status to true
		await User.updateMany({}, { status: true });

		return res
			.status(200)
			.json({ message: "User status changed successfully" });
	} catch (error) {
		console.error("Error changing user status:", error);
		return res.status(500).json({ error: "Internal Server Error" });
	}
});

router.post("/change-user-status", async (req, res) => {
	try {
		// Update user's status
		const updatedUser = await User.findByIdAndUpdate(
			req.body.userId,
			{ status: req.body.status },
			{ new: true }
		);

		return res
			.status(200)
			.json({ message: "User status changed successfully", user: updatedUser });
	} catch (error) {
		console.error("Error changing user status:", error);
		return res.status(500).json({ error: "Internal Server Error" });
	}
});
// GET /api/subscription/status/:userId
router.get('/status/:userId', async (req, res) => {
  const userId = req.params.userId;  // Get userId from URL parameters

  try {
    const subscription = await Subscription.findOne({ userId });
    res.json({ isSubscribed: !!subscription, subscription });
  } catch (err) {
    console.error('Error fetching subscription status for user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Route to check user payment status
router.get('/payment-status/:userId',async (req, res) => {
	const { userId } = req.params;
  
	try {
	  const user = await User.findOne({ _id: userId });
  
	  if (!user) {
		return res.status(404).json({ hasPaid: false, message: 'User not found' });
	  }
  
	  res.json({ hasPaid: user.hasPaid , lastPayment: user.lastPayment});
	} catch (err) {
	  console.error('Error fetching user payment status:', err);
	  res.status(500).json({ message: 'Server error' });
	}
  });
router.post('/save-transaction', async (req, res) => {
	const { userId, username, email, orderId, payerId, amount, currency,subscriptionType } = req.body;
  
	try {
	  const newTransaction = new Transaction({
		userId,
		username,
		email,
		orderId,
		payerId,
		amount,
		currency
	  });
  
	  await newTransaction.save();
	// Find user and log before updating
	const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Log user data before attempting update
    console.log('Before update:', user);

    // Now attempt the update with findOneAndUpdate
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId }, 
      {
        $set: {
          hasPaid: true,
          lastPayment: new Date() ,
		  subscriptionType: subscriptionType // Ensure the current date is used here

        }
      },
      { new: true }  // Ensure that the updated document is returned
    );

    // Log the updated user document
    console.log('Updated user:', updatedUser);
  
	  res.status(201).send({ message: 'Transaction saved and user payment status updated successfully!' });
	} catch (error) {
	  console.error('Error saving transaction:', error);
	  res.status(500).send({ message: 'Failed to save transaction and update user payment status.' });
	}
  });
  
  
router.get("/transactions", authenticateMiddleware, isAdmin, async (req, res) => {
    try {
        const transactions = await Transaction.find(); // Retrieve all transactions
        res.status(200).json(transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// Route to get transactions by userId
router.get("/transactions/:userId",  authenticateMiddleware, isAdmin, async (req, res) => {
    const userId = req.params.userId; // Extract userId from URL parameters

    try {
        const transactions = await Transaction.find({ userId }); // Retrieve transactions by userId
        res.status(200).json(transactions);
    } catch (error) {
        console.error("Error fetching transactions by userId:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
router.post('/update-payment-status', async (req, res) => {
	const { userId, hasPaid } = req.body;
	try {
	  const user = await User.findById(userId);
	  
	  if (!user) {
		return res.status(404).send({ message: 'User not found.' });
	  }
  
	  user.hasPaid = hasPaid;
	  await user.save();
  
	  res.status(200).send({ message: 'Payment status updated successfully.' });
	} catch (error) {
	  res.status(500).send({ message: 'Failed to update payment status.', error });
	}
  });
  
 
  router.post('/orders', async (req, res) => {
	const { chatId, description, price, createdBy } = req.body;
	try {
	  const orderRef = db.ref(`chats/${chatId}/orders`).push();
	  await orderRef.set({
		description,
		price,
		createdBy,
		timestamp: admin.database.ServerValue.TIMESTAMP
	  });
	  res.status(200).send({ message: 'Order created successfully', orderId: orderRef.key });
	} catch (error) {
	  res.status(500).send({ error: 'Error creating order' });
	}
  });
// Admin route to get all users
router.get("/admin/users", authenticateMiddleware, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select("-password"); // Exclude passwords
        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Admin route to delete a user
router.delete("/admin/users/:id", authenticateMiddleware, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Admin route to add a new video
router.post("/admin/videos", authenticateMiddleware, isAdmin, async (req, res) => {
    try {
        const { title, description, url, genre, duration } = req.body;

        // Validate input
        if (!title || !description || !url || !genre || !duration) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const newVideo = new Video({ title, description, url, genre, duration });
        await newVideo.save();

        res.status(201).json({ message: "Video added successfully", video: newVideo });
    } catch (error) {
        console.error("Error adding video:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
//edit a particular user
router.put("/admin/edit/:id", authenticateMiddleware, isAdmin, async (req, res) => {
	try {
		const { id } = req.params;
		const { username, email, password, avatar, dob } = req.body;

		// Find the user by ID
		let user = await User.findById(id);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		// Update user properties
		user.username = username || user.username;
		user.email = email || user.email;
		user.avatar = avatar || user.avatar;
		user.dob = dob || user.dob;

		if (password) {
			// Hash the new password using bcrypt
			const hashedPassword = await argon2.hash(password);
			user.password = hashedPassword;
		}

		// Save the updated user
		user = await user.save();

		res.status(200).json({ message: "User updated successfully", user });
	} catch (error) {
		console.error("Error updating user:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});
// Route for creating a video
router.post("/admin/create", async (req, res) => {
	try {
		const { title, description, genre, theme,rating,isForSale, file, author, role, slug, status,users,hasPaid} = req.body;
		// Check if the user exists
		const user = role !== "admin" ? await User.findById(author) : true;
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		console.log(req.user);
		// Create a new video
		await Videos.create({
			title,
			description,
			genre,
			theme,
			rating,
			file,
			slug,
			users,
			status: status ?? true,
			author, //req.user._id,
			hasPaid,
			isForSale,
		});
		res.status(201).json({ message: "Video created successfully" });
	} catch (error) {
		console.error("Error creating video:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// Admin route to edit a video
router.put("/user/admin/videos/:id", authenticateMiddleware, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, url, genre, duration } = req.body;

        const video = await Video.findById(id);
        if (!video) {
            return res.status(404).json({ error: "Video not found" });
        }

        video.title = title || video.title;
        video.description = description || video.description;
        video.url = url || video.url;
        video.genre = genre || video.genre;
        video.duration = duration || video.duration;

        await video.save();

        res.status(200).json({ message: "Video updated successfully", video });
    } catch (error) {
        console.error("Error updating video:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Admin route to delete a video
router.delete("/user/admin/videos/:id", authenticateMiddleware, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const deletedVideo = await Video.findByIdAndDelete(id);
        if (!deletedVideo) {
            return res.status(404).json({ error: "Video not found" });
        }
        res.status(200).json({ message: "Video deleted successfully" });
    } catch (error) {
        console.error("Error deleting video:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Admin route to get all videos
router.get("/admin/videos", authenticateMiddleware, isAdmin, async (req, res) => {
    try {
        const videos = await Video.find();
        res.status(200).json(videos);
    } catch (error) {
        console.error("Error fetching videos:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
module.exports = router;

