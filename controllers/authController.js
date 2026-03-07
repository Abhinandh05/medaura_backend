const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, latitude, longitude } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Prepare location data if latitude and longitude are provided
    let locationData;
    if (latitude && longitude) {
      locationData = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)] // GeoJSON is [lng, lat]
      };
    } else {
      // Default dummy location if not provided
      locationData = {
        type: 'Point',
        coordinates: [0, 0]
      };
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user',
      phone,
      location: locationData
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          token: generateToken(user._id),
        }
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide an email and password');
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        token: generateToken(user._id),
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone || user.phone;
      
      if (req.body.notificationSettings) {
        user.notificationSettings = {
          ...user.notificationSettings,
          ...req.body.notificationSettings
        };
      }
      
      const updatedUser = await user.save();

      res.status(200).json({
        success: true,
        data: updatedUser
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a delivery address
 * @route   POST /api/auth/addresses
 * @access  Private
 */
const addAddress = async (req, res, next) => {
  try {
    const { title, address, icon } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user.addresses.push({ title, address, icon });
    await user.save();

    res.status(200).json({
      success: true,
      data: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a delivery address
 * @route   DELETE /api/auth/addresses/:id
 * @access  Private
 */
const deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user.addresses = user.addresses.filter(addr => addr._id.toString() !== req.params.id);
    await user.save();

    res.status(200).json({
      success: true,
      data: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateUserProfile,
  addAddress,
  deleteAddress
};
