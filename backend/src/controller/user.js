const express = require("express");
const jwt = require("jsonwebtoken");
const argon2 = require("argon2");
const axios = require('axios');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const router = express.Router();

const User = require("../models/user");
const Video = require("../models/videos");
const Contact = require("../models/contact");
const Subscription = require("../models/subscription");
const Transaction = require("../models/transaction");

const { authenticateMiddleware, isAdmin } = require("../utils");

// Create email transporter for email verification
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Function to send verification email
const sendVerificationEmail = async (email, username, verificationToken) => {
  try {
    const transporter = createTransporter();
    const verificationLink = `${process.env.BASE_URL || 'http://localhost:3000'}/user/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: `"Wecinema" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Wecinema Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f59e0b; margin: 0;">🎬 Wecinema</h1>
            <p style="color: #666; margin-top: 5px;">Your Ultimate Movie Experience</p>
          </div>
          
          <h2 style="color: #333;">Welcome to Wecinema, ${username}! 🎉</h2>
          <p style="color: #555; line-height: 1.6;">
            Thank you for registering with Wecinema. To complete your registration and start enjoying our movie collection, please verify your email address by clicking the button below.
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${verificationLink}" 
               style="background-color: #f59e0b; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold;
                      font-size: 16px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #777; font-size: 14px; margin-top: 30px;">
            Or copy and paste this link into your browser:
            <br>
            <span style="color: #f59e0b; word-break: break-all;">${verificationLink}</span>
          </p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 30px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #666; font-size: 13px;">
              <strong>Note:</strong> This verification link will expire in 24 hours.
              <br>
              If you didn't create an account with Wecinema, please ignore this email.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <div style="text-align: center; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Wecinema. All rights reserved.</p>
            <p>If you need help, contact us at <a href="mailto:support@wecinema.co" style="color: #f59e0b;">support@wecinema.co</a></p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Admin registration
router.post("/admin/register", async (req, res) => {
  try {
    const { email, password, username, dob, isAdmin, isSubAdmin } = req.body;

    if (!email || !password || !username || !dob) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!isAdmin && !isSubAdmin) {
      return res.status(400).json({ error: "At least one role must be selected" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await argon2.hash(password);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = new User({
      email,
      password: hashedPassword,
      username,
      dob,
      isAdmin: isAdmin || false,
      isSubAdmin: isSubAdmin || false,
      avatar: "",
      isVerified: false,
      verificationToken,
      verificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    await newUser.save();

    // Send verification email
    await sendVerificationEmail(email, username, verificationToken);

    const userWithoutPassword = newUser.toObject();
    delete userWithoutPassword.password;

    res.status(201).json({ 
      message: "Admin registered successfully. Verification email sent.",
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error("Error during admin registration:", error);
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

// Get all privileged users
router.get("/admin/users", async (req, res) => {
  try {
    const { role } = req.query;
    
    let query = { 
      $or: [
        { isAdmin: true },
        { isSubAdmin: true }
      ] 
    };

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
      .sort({ createdAt: -1 });

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

// Add admin privileges
router.put("/admin/add", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.isAdmin = true;
    await user.save();

    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Error adding admin:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Remove admin/subadmin privileges
router.put("/admin/remove/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { removeAll = true, removeAdmin = true, removeSubAdmin = true } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updates = {
      isAdmin: removeAll || removeAdmin ? false : user.isAdmin,
      isSubAdmin: removeAll || removeSubAdmin ? false : user.isSubAdmin
    };

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

// Email verification endpoint
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Verification Link - Wecinema</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 15px;
              padding: 40px;
              max-width: 500px;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            h1 {
              color: #f59e0b;
              margin-bottom: 20px;
            }
            .error {
              color: #e74c3c;
              font-size: 18px;
              margin: 20px 0;
            }
            .btn {
              background: #f59e0b;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              display: inline-block;
              margin-top: 20px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️ Invalid Verification Link</h1>
            <p class="error">The verification link is invalid or has expired.</p>
            <p>Please check your email for the correct verification link or request a new one.</p>
            <a href="/" class="btn">Go to Homepage</a>
          </div>
        </body>
        </html>
      `);
    }

    const user = await User.findOne({ 
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Expired Verification Link - Wecinema</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 15px;
              padding: 40px;
              max-width: 500px;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            h1 {
              color: #f59e0b;
              margin-bottom: 20px;
            }
            .error {
              color: #e74c3c;
              font-size: 18px;
              margin: 20px 0;
            }
            .btn {
              background: #f59e0b;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              display: inline-block;
              margin: 10px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⏰ Link Expired</h1>
            <p class="error">This verification link has expired.</p>
            <p>Verification links are valid for 24 hours only.</p>
            <div>
              <a href="/" class="btn">Go to Login</a>
              <a href="/resend-verification" class="btn" style="background: #3498db;">Resend Email</a>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    // Update user as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified - Wecinema</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 15px;
            padding: 40px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            animation: fadeIn 0.5s ease-in;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .success-icon {
            color: #2ecc71;
            font-size: 80px;
            margin-bottom: 20px;
          }
          h1 {
            color: #f59e0b;
            margin-bottom: 20px;
          }
          .btn {
            background: #f59e0b;
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin-top: 30px;
            font-weight: bold;
            font-size: 16px;
            transition: transform 0.3s;
          }
          .btn:hover {
            transform: scale(1.05);
            background: #e67e22;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✓</div>
          <h1>🎉 Email Verified Successfully!</h1>
          <p style="font-size: 18px; color: #555; line-height: 1.6;">
            Hello <strong>${user.username}</strong>, your email has been verified successfully!
          </p>
          <p style="color: #777; margin: 20px 0;">
            You can now log in to your account and start enjoying Wecinema's amazing movie collection.
          </p>
          <a href="/" class="btn">Go to Login</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - Wecinema</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
          }
          .error {
            color: red;
            font-size: 20px;
          }
        </style>
      </head>
      <body>
        <h1>❌ Error Verifying Email</h1>
        <p class="error">An error occurred while verifying your email. Please try again later.</p>
      </body>
      </html>
    `);
  }
});

// Resend verification email
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    // Send new verification email
    await sendVerificationEmail(email, user.username, verificationToken);

    res.status(200).json({ 
      message: "Verification email sent successfully",
      email: user.email
    });
  } catch (error) {
    console.error("Error resending verification email:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      details: error.message 
    });
  }
});

// Check verification status
router.get("/verification-status/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email }).select('isVerified verificationTokenExpiry');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ 
      isVerified: user.isVerified,
      canResend: !user.isVerified && (!user.verificationTokenExpiry || user.verificationTokenExpiry < Date.now())
    });
  } catch (error) {
    console.error("Error checking verification status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Contact form
router.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newContact = new Contact({ name, email, message });
    await newContact.save();

    res.status(201).json({ message: "Contact message sent successfully" });
  } catch (error) {
    console.error("Error handling contact form submission:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// User registration with email verification
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, avatar, dob } = req.body;
    
    // Validate input
    if (!username || !email || !password || !dob) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists with this email" });
    }

    const hashedPassword = await argon2.hash(password);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      avatar: avatar || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
      dob,
      isVerified: false,
      verificationToken,
      verificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
      hasPaid: false,
      status: true
    });

    // Send verification email
    await sendVerificationEmail(email, username, verificationToken);

    res.status(201).json({ 
      message: "User registered successfully. Please check your email to verify your account.",
      user: {
        email: newUser.email,
        username: newUser.username,
        requiresVerification: true
      }
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt for email:", email);
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user (case-insensitive search)
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });

    if (!user) {
      console.log("User not found for email:", email);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    console.log("User found:", user.email, "isVerified:", user.isVerified);

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({ 
        error: "Please verify your email before logging in",
        isVerified: false,
        email: user.email
      });
    }

    // Verify password
    const passwordMatch = await argon2.verify(user.password, password);
    
    if (!passwordMatch) {
      console.log("Password mismatch for user:", user.email);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const key = process.env.JWT_SECRET || "weloremcium.secret_key";
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        isSubAdmin: user.isSubAdmin
      },
      key,
      { expiresIn: "8h" }
    );

    console.log("Login successful for user:", user.email);

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isVerified: user.isVerified,
        hasPaid: user.hasPaid,
        isAdmin: user.isAdmin,
        isSubAdmin: user.isSubAdmin
      }
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      details: error.message 
    });
  }
});
// Legacy signin route with email verification check
router.post('/signin', async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email (case-insensitive)
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({ 
        error: "Please verify your email before logging in",
        isVerified: false,
        email: user.email,
        canResend: !user.verificationTokenExpiry || user.verificationTokenExpiry < Date.now()
      });
    }

    if (email) {
      const key = process.env.JWT_SECRET || "weloremcium.secret_key";
      const token = jwt.sign(
        { 
          userId: user._id, 
          username: user.username, 
          avatar: user.avatar,
          email: user.email,
          isVerified: user.isVerified 
        },
        key,
        { expiresIn: "8h" }
      );

      // Return user data along with token
      res.status(200).json({ 
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          isVerified: user.isVerified,
          hasPaid: user.hasPaid
        }
      });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Error during legacy login:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      details: error.message 
    });
  }
});

// Legacy signup route with email verification
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, avatar, dob } = req.body;
    
    // Basic validation
    if (!username || !email || !dob) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: "User already exists with this email" });
    }

    // Hash password
    const hashedPassword = !password
      ? await argon2.hash("wecinema")
      : await argon2.hash(password);

    // Generate verification token
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create new user with verification fields
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      avatar: avatar || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
      dob,
      isVerified: false,
      verificationToken,
      verificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      hasPaid: false,
      status: true
    });

    // Send verification email
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const verificationLink = `${process.env.BASE_URL || 'http://localhost:3000'}/api/user/verify-email?token=${verificationToken}`;
      
      const mailOptions = {
        from: `"Wecinema" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your Wecinema Account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #f59e0b;">Welcome to Wecinema, ${username}! 🎬</h2>
            <p>Thank you for registering with Wecinema. To complete your registration, please verify your email address by clicking the link below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="background-color: #f59e0b; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationLink}</p>
            
            <p>This link will expire in 24 hours.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            
            <p style="color: #666; font-size: 12px;">
              If you didn't create an account with Wecinema, please ignore this email.
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Legacy: Verification email sent to ${email}`);

      res.status(201).json({ 
        message: "User registered successfully. Please check your email to verify your account.",
        user: newUser.email,
        requiresVerification: true
      });
      
    } catch (emailError) {
      console.error("Legacy: Error sending verification email:", emailError);
      
      // Still return success but warn about email
      res.status(201).json({ 
        message: "User registered successfully, but verification email failed to send. Please contact support.",
        user: newUser.email,
        requiresVerification: true,
        emailError: "Failed to send verification email"
      });
    }
    
  } catch (error) {
    console.error("Error during legacy user creation:", error);
    
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: "User already exists with this email",
        code: "DUPLICATE_EMAIL"
      });
    }
    
    res.status(500).json({ 
      error: "Internal Server Error",
      details: error.message 
    });
  }
});

// Add verification endpoint for legacy compatibility
router.get("/legacy-verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).send(`
        <html>
          <body style="text-align: center; padding: 50px; font-family: Arial;">
            <h2 style="color: red;">Invalid verification link</h2>
            <p>Please check your email for the correct verification link.</p>
            <a href="/" style="color: #f59e0b;">Return to Wecinema</a>
          </body>
        </html>
      `);
    }

    const user = await User.findOne({ 
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).send(`
        <html>
          <body style="text-align: center; padding: 50px; font-family: Arial;">
            <h2 style="color: red;">Invalid or expired verification link</h2>
            <p>This verification link has expired or is invalid.</p>
            <a href="/legacy-resend-verification" style="color: #f59e0b;">Resend verification email</a>
          </body>
        </html>
      `);
    }

    // Update user as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    res.send(`
      <html>
        <body style="text-align: center; padding: 50px; font-family: Arial;">
          <h2 style="color: green;">🎉 Email Verified Successfully!</h2>
          <p>Your email has been verified. You can now log in to your account.</p>
          <a href="/login" style="background-color: #f59e0b; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; font-weight: bold;">
            Go to Login
          </a>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Legacy verification error:", err);
    res.status(500).send("Error verifying email");
  }
});

// Legacy resend verification endpoint
router.post("/legacy-resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    // Generate new verification token
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    // Send new verification email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const verificationLink = `${process.env.BASE_URL || 'http://localhost:3000'}/api/user/legacy-verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: `"Wecinema" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Wecinema Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f59e0b;">Verify Your Wecinema Account</h2>
          <p>We received a request to resend your verification email. Please click the link below to verify your account:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
               style="background-color: #f59e0b; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationLink}</p>
          
          <p>This link will expire in 24 hours.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: "Verification email sent successfully",
      email: user.email
    });
  } catch (error) {
    console.error("Legacy resend verification error:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      details: error.message 
    });
  }
});

// Legacy check verification status
router.get("/legacy-verification-status/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    }).select('isVerified verificationTokenExpiry username');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ 
      isVerified: user.isVerified,
      canResend: !user.isVerified && (!user.verificationTokenExpiry || user.verificationTokenExpiry < Date.now()),
      username: user.username,
      email: user.email
    });
  } catch (error) {
    console.error("Error checking legacy verification status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Follow/Unfollow user
router.put("/:id/follow", authenticateMiddleware, async (req, res) => {
  try {
    const { action, userId } = req.body;
    const targetUserId = req.params.id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    if (userId === targetUserId) {
      return res.status(400).json({ error: "You cannot follow/unfollow yourself" });
    }

    const userExists = await User.exists({ _id: targetUserId });
    if (!userExists) {
      return res.status(404).json({ error: "User not found" });
    }

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

      await session.commitTransaction();
      session.endSession();

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

// Get paid users
router.get('/paid-users', async (req, res) => {
  try {
    const paidUsers = await User.find({ hasPaid: true }).lean();
    res.status(200).json(paidUsers);
  } catch (error) {
    console.error('Error fetching paid users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get user by ID
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

// Get user payment info
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

// Change password
router.put("/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isPasswordValid = await argon2.verify(existingUser.password, currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const isSamePassword = await argon2.verify(existingUser.password, newPassword);
    if (isSamePassword) {
      return res.status(400).json({ error: "New password cannot be the same as the current password" });
    }

    const hashedPassword = await argon2.hash(newPassword);
    existingUser.password = hashedPassword;
    await existingUser.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Edit user
router.put("/edit/:id", authenticateMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, avatar, dob } = req.body;

    let user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.username = username || user.username;
    user.email = email || user.email;
    user.avatar = avatar || user.avatar;
    user.dob = dob || user.dob;

    if (password) {
      const hashedPassword = await argon2.hash(password);
      user.password = hashedPassword;
    }

    user = await user.save();

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Error updating user:", error);
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

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Change user status
router.put("/change-user-status", async (req, res) => {
  try {
    await User.updateMany({}, { status: true });
    return res.status(200).json({ message: "User status changed successfully" });
  } catch (error) {
    console.error("Error changing user status:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/change-user-status", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.body.userId,
      { status: req.body.status },
      { new: true }
    );

    return res.status(200).json({ message: "User status changed successfully", user: updatedUser });
  } catch (error) {
    console.error("Error changing user status:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Subscription status
router.get('/status/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const subscription = await Subscription.findOne({ userId });
    res.json({ isSubscribed: !!subscription, subscription });
  } catch (err) {
    console.error('Error fetching subscription status for user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Payment status
router.get('/payment-status/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ hasPaid: false, message: 'User not found' });
    }

    res.json({ 
      hasPaid: user.hasPaid,
      lastPayment: user.lastPayment,
      subscriptionType: user.subscriptionType
    });
  } catch (err) {
    console.error('Error fetching user payment status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save transaction
router.post('/save-transaction', async (req, res) => {
  const { userId, username, email, orderId, payerId, amount, currency, subscriptionType } = req.body;

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

    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId }, 
      {
        $set: {
          hasPaid: true,
          lastPayment: new Date(),
          subscriptionType: subscriptionType
        }
      },
      { new: true }
    );

    res.status(201).send({ 
      message: 'Transaction saved and user payment status updated successfully!',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error saving transaction:', error);
    res.status(500).send({ message: 'Failed to save transaction and update user payment status.' });
  }
});

// Get all transactions (admin)
router.get("/transactions", authenticateMiddleware, isAdmin, async (req, res) => {
  try {
    const transactions = await Transaction.find();
    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get transactions by userId
router.get("/transactions/:userId", authenticateMiddleware, isAdmin, async (req, res) => {
  const userId = req.params.userId;

  try {
    const transactions = await Transaction.find({ userId });
    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error fetching transactions by userId:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update payment status
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

// Admin routes
router.get("/admin/all-users", authenticateMiddleware, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin delete user
router.delete("/admin/delete/:id", authenticateMiddleware, isAdmin, async (req, res) => {
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

// Admin edit user
router.put("/admin/edit/:id", authenticateMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, avatar, dob, isVerified, hasPaid } = req.body;

    let user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.username = username || user.username;
    user.email = email || user.email;
    user.avatar = avatar || user.avatar;
    user.dob = dob || user.dob;
    user.isVerified = isVerified !== undefined ? isVerified : user.isVerified;
    user.hasPaid = hasPaid !== undefined ? hasPaid : user.hasPaid;

    if (password) {
      const hashedPassword = await argon2.hash(password);
      user.password = hashedPassword;
    }

    user = await user.save();

    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    res.status(200).json({ message: "User updated successfully", user: userWithoutPassword });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;