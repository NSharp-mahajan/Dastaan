import User from '../models/User.js';
import { signToken, hashPassword, comparePassword } from '../utils/token.js';

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, passwordHash, mobile, travelStyle } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your full name.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Determine password hash
    let finalHash = passwordHash;
    if (!finalHash) {
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
      }
      finalHash = hashPassword(password);
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      mobile: mobile?.trim() || '',
      passwordHash: finalHash,
      travelStyle: travelStyle || 'Balanced'
    });

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        travelStyle: user.travelStyle
      }
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email/mobile and password.' });
    }

    const identifier = email.trim().toLowerCase();

    // Match by email or mobile
    const user = await User.findOne({
      $or: [{ email: identifier }, { mobile: identifier }]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'No account found with those credentials.' });
    }

    // Support both direct password and SHA-256 pre-hashed password
    const isDirectMatch = user.passwordHash === password;
    const isHashedMatch = comparePassword(password, user.passwordHash);

    if (!isDirectMatch && !isHashedMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name
    });

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        travelStyle: user.travelStyle
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  return res.status(200).json({
    success: true,
    data: req.user
  });
};
