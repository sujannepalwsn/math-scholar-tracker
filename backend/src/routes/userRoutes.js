import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/UserModel.js';

const router = express.Router();

// Utility to generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token expires in 30 days
  });
};

// @desc    Register a new student
// @route   POST /api/users/register/student
// @access  Public
router.post('/register/student', async (req, res) => {
  const {
    firstName, lastName, email, password,
    grade, school, contactNumber,
    parentDetails, // { name, contactNumber, email }
    profilePhotoUrl, // Optional for now
    consentAgreed
  } = req.body;

  if (!firstName || !lastName || !email || !password || !grade || !consentAgreed) {
    return res.status(400).json({ message: 'Please provide all required fields for student registration, including consent.' });
  }

  if (!consentAgreed) {
    return res.status(400).json({ message: 'Consent and data policy agreement is required.' });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: 'student',
      grade,
      school,
      contactNumber,
      parentDetails,
      profilePhotoUrl, // Store path or URL
      consentAgreed,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        studentId: user.studentId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        grade: user.grade,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error("Student Registration Error:", error);
    if (error.code === 11000 && error.keyPattern && error.keyPattern.studentId) {
        // This indicates a duplicate studentId, which should be rare due to generation logic
        // but good to handle. Perhaps log and ask user to retry.
        return res.status(500).json({ message: 'Error generating unique student ID. Please try again.' });
    }
    res.status(500).json({ message: 'Server error during student registration', error: error.message });
  }
});

// @desc    Authenticate user & get token (Login)
// @route   POST /api/users/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      user.lastLogin = Date.now();
      await user.save();

      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        studentId: user.studentId, // Include if student
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});


// TODO: Add routes for registering other user types (parent, teacher, admin) if needed directly
// For now, admin might create teachers, parents might be linked or invited.

export default router;
