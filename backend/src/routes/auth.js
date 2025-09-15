const express = require('express');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'teacher', 'student').required(),
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  grade: Joi.string().valid('K', '1', '2', '3', '4', '5', '6', '7', '8').when('role', {
    is: 'student',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  assignedGrades: Joi.array().items(
    Joi.string().valid('K', '1', '2', '3', '4', '5', '6', '7', '8')
  ).when('role', {
    is: 'teacher',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  subjects: Joi.array().items(
    Joi.string().valid('Math', 'Science', 'English', 'History', 'Art', 'Music', 'PE')
  ).when('role', {
    is: 'teacher',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  assignedStudents: Joi.array().items(Joi.string()).when('role', {
    is: 'teacher',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  })
});

// Update schema (more lenient for updates)
const updateSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional(),
  password: Joi.string().min(6).optional(),
  role: Joi.string().valid('admin', 'teacher', 'student').optional(),
  firstName: Joi.string().min(1).max(50).optional(),
  lastName: Joi.string().min(1).max(50).optional(),
  grade: Joi.string().valid('K', '1', '2', '3', '4', '5', '6', '7', '8').when('role', {
    is: 'student',
    then: Joi.optional(),
    otherwise: Joi.optional()
  }),
  assignedGrades: Joi.array().items(
    Joi.string().valid('K', '1', '2', '3', '4', '5', '6', '7', '8')
  ).when('role', {
    is: 'teacher',
    then: Joi.optional(),
    otherwise: Joi.optional()
  }),
  subjects: Joi.array().items(
    Joi.string().valid('Math', 'Science', 'English', 'History', 'Art', 'Music', 'PE')
  ).when('role', {
    is: 'teacher',
    then: Joi.optional(),
    otherwise: Joi.optional()
  }),
  assignedStudents: Joi.array().items(Joi.string()).when('role', {
    is: 'teacher',
    then: Joi.optional(),
    otherwise: Joi.optional()
  })
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRE || '7d' 
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public (for now - can be restricted to admin later)
router.post('/register', async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, password, role, firstName, lastName, grade, assignedGrades, subjects, assignedStudents } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create profile object based on role
    const profile = {
      firstName,
      lastName
    };

    if (role === 'student') {
      profile.grade = grade;
    } else if (role === 'teacher') {
      profile.assignedGrades = assignedGrades || [];
      profile.subjects = subjects || [];
      profile.assignedStudents = assignedStudents || [];
    }

    // Create new user
    const user = new User({
      username,
      password,
      role,
      profile
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        profile: user.profile
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        profile: user.profile
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role,
      profile: req.user.profile
    }
  });
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// @route   GET /api/auth/stats
// @desc    Get system statistics (admin only)
// @access  Private (Admin)
router.get('/stats', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const totalUsers = await User.countDocuments();
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });

    res.json({
      totalUsers,
      totalTeachers,
      totalStudents,
      totalAdmins,
      systemStatus: 'active'
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Server error getting stats' });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get('/users', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const users = await User.find()
      .select('-password') // Exclude password field
      .sort({ createdAt: -1 }); // Most recent first

    res.json(users);

  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Server error getting users' });
  }
});

// @route   GET /api/auth/users/:id
// @desc    Get single user by ID (admin only)
// @access  Private (Admin)
router.get('/users/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ error: 'Server error getting user' });
  }
});

// @route   PUT /api/auth/users/:id
// @desc    Update user (admin only)
// @access  Private (Admin)
router.put('/users/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    // Get user to check if it's the protected admin user
    const userToUpdate = await User.findById(req.params.id);
    if (!userToUpdate) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { error } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, password, role, firstName, lastName, grade, assignedGrades, subjects, assignedStudents } = req.body;

    // Prevent modification of the protected admin user's critical fields
    if (userToUpdate.username === 'admin') {
      if (username !== 'admin') {
        return res.status(400).json({ error: 'Cannot change username of system administrator' });
      }
      if (role !== 'admin') {
        return res.status(400).json({ error: 'Cannot change role of system administrator' });
      }
    }

    // Check if username is taken by another user
    const existingUser = await User.findOne({ 
      username, 
      _id: { $ne: req.params.id } 
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create profile object based on role
    const profile = {
      firstName,
      lastName
    };

    if (role === 'student') {
      profile.grade = grade;
    } else if (role === 'teacher') {
      profile.assignedGrades = assignedGrades || [];
      profile.subjects = subjects || [];
      profile.assignedStudents = assignedStudents || [];
    }

    // Update user
    const updateData = {
      username,
      role,
      profile
    };

    // Only update password if provided
    if (password) {
      updateData.password = password;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ error: 'Server error updating user' });
  }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete user (admin only)
// @access  Private (Admin)
router.delete('/users/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Get user to check if it's the protected admin user
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deletion of the protected admin user
    if (userToDelete.username === 'admin') {
      return res.status(400).json({ error: 'Cannot delete the system administrator account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('User delete error:', error);
    res.status(500).json({ error: 'Server error deleting user' });
  }
});

module.exports = router;
