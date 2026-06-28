const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

/**
 * Generate JWT token for a user
 * @param {string} id - User's MongoDB document ID
 * @returns {string} JWT token valid for 30 days
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

/**
 * POST /api/auth/signup
 * Register a new user with role selection
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, phone, location } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Validate role
    if (!['donor', 'receiver', 'volunteer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be donor, receiver, or volunteer' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone: phone || '',
      location: location || { address: '', lat: 0, lng: 0 },
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      location: user.location,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      location: user.location,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

/**
 * POST /api/auth/guest
 * Auto-create or find a guest user for a given role and return a JWT.
 * This allows the app to work without a manual login flow.
 */
router.post('/guest', async (req, res) => {
  try {
    const { role } = req.body;

    if (!['donor', 'receiver', 'volunteer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be donor, receiver, or volunteer' });
    }

    const guestEmail = `guest_${role}@annasetu.local`;

    // Find or create the guest user for this role
    let user = await User.findOne({ email: guestEmail });

    if (!user) {
      user = await User.create({
        name: `Guest ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        email: guestEmail,
        password: 'guestpassword123',
        role,
        phone: '',
        location: { address: 'Bangalore, India', lat: 12.9716, lng: 77.5946 },
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      location: user.location,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ message: 'Server error during guest login' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user's profile
 */
const { protect } = require('../middleware/auth');

router.get('/me', protect, async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    phone: req.user.phone,
    location: req.user.location,
  });
});

/**
 * PUT /api/auth/location
 * Update authenticated user's location coordinates and address
 */
router.put('/location', protect, async (req, res) => {
  try {
    const { address, lat, lng } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.location = {
      address: address || user.location.address,
      lat: lat !== undefined ? lat : user.location.lat,
      lng: lng !== undefined ? lng : user.location.lng,
    };

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      location: user.location,
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Server error during location updates' });
  }
});

module.exports = router;
