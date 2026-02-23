import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const registerUser = async (req, res) => {
  try {
    console.log('=== REGISTER REQUEST START ===');
    console.log('Request body:', req.body);
    
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      console.log('Validation failed: Missing fields');
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password.length < 6) {
      console.log('Validation failed: Password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    if (typeof name !== 'string') {
      console.log('Validation failed: Name not string');
      return res.status(400).json({
        success: false,
        message: 'Name must be a string'
      });
    }

    console.log('Validation passed, checking existing user...');

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', existingUser.email);
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    console.log('Creating new user...');

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      authProvider: 'local'
    });

    console.log('User created successfully:', { id: user._id, email: user.email });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Token generated successfully');

    // Return response
    const response = {
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
    
    console.log('Sending response:', { success: response.success, user: response.user });
    res.status(201).json(response);

  } catch (error) {
    console.error('Registration error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const loginUser = async (req, res) => {
  try {
    console.log('=== LOGIN REQUEST START ===');
    console.log('Login request body:', req.body);
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      console.log('Login validation failed: Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (typeof email !== 'string') {
      console.log('Login validation failed: Email not string');
      return res.status(400).json({
        success: false,
        message: 'Email must be a string'
      });
    }

    console.log('Login validation passed, finding user...');

    // Find user by email
    const user = await User.findOne({ email });
    console.log('Found user:', user ? { 
      id: user._id, 
      email: user.email, 
      hasPassword: !!user.password, 
      authProvider: user.authProvider,
      role: user.role 
    } : null);
    
    if (!user) {
      console.log('Login failed: User not found');
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user has local auth
    if (user.authProvider !== 'local') {
      console.log('Login failed: User not registered with local auth');
      return res.status(400).json({
        success: false,
        message: 'Please login with Google'
      });
    }

    console.log('Comparing password for user:', email);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password comparison result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Login failed: Invalid password');
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('Login successful, generating token...');

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Token generated successfully');

    // Return response
    const response = {
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
    
    console.log('Sending login response:', { success: response.success, user: response.user });
    res.status(200).json(response);

  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getProfile = async (req, res) => {
  try {
    // Ensure req.user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Return 200 with user profile
    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isVerified: req.user.isVerified,
        authProvider: req.user.authProvider,
        createdAt: req.user.createdAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    console.log('Google login request received:', req.body);
    const { idToken } = req.body;

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.JWT_SECRET) {
      console.error('Server config missing: GOOGLE_CLIENT_ID or JWT_SECRET');
      return res.status(503).json({
        success: false,
        message: 'Google sign-in is not configured. Please set GOOGLE_CLIENT_ID and JWT_SECRET on the server.'
      });
    }

    if (!idToken) {
      console.log('Missing idToken in request');
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required'
      });
    }

    // Verify token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    // Get payload
    const payload = ticket.getPayload();

    // Extract data
    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const name = payload.name;
    const email_verified = payload.email_verified;

    // If email not verified → return 400
    if (!email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is not verified with Google'
      });
    }

    // Check if user exists by email
    let user = await User.findOne({ email });

    if (user) {
      // CASE 1: User exists
      if (user.authProvider === 'local') {
        return res.status(400).json({
          success: false,
          message: 'Account exists with email/password. Please login normally.'
        });
      }
      // Continue login for Google users
      user.lastLogin = new Date();
      await user.save();
    } else {
      // CASE 2: User does not exist - create new user
      user = await User.create({
        name,
        email,
        authProvider: 'google',
        googleId,
        isVerified: true,
        lastLogin: new Date()
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return response
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider
      }
    });

  } catch (error) {
    console.error('Google login error:', error.message, error.stack);
    const message = process.env.NODE_ENV === 'development'
      ? (error.message || 'Server error during Google authentication')
      : 'Server error during Google authentication';
    res.status(500).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

export { registerUser, loginUser, getProfile, googleLogin };
