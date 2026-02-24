import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../config/database.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// Signup Route
router.post('/signup', async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  // Validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please provide all required fields: name, email, password, and role.' 
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please provide a valid email address.' 
    });
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: 'Password must be at least 6 characters long.' 
    });
  }

  try {
    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      throw userCheckError;
    }

    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'User with this email already exists.' 
      });
    }

    // Block admin self-registration
    if (role.toLowerCase() === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be created via signup.'
      });
    }

    // Get role_id from role name
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('role_id')
      .eq('role_name', role.toLowerCase())
      .single();

    if (roleError || !roleData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid role. Must be seller or buyer.' 
      });
    }

    const role_id = roleData.role_id;

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        { 
          name, 
          email: email.toLowerCase(), 
          password_hash, 
          phone: phone || null, 
          role_id 
        }
      ])
      .select('user_id, name, email, phone, role_id, created_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        user_id: newUser.user_id, 
        role_id: newUser.role_id,
        email: newUser.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: {
        user_id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role_id: newUser.role_id,
        created_at: newUser.created_at
      }
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please provide email and password.' 
    });
  }

  try {
    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        user_id,
        name,
        email,
        password_hash,
        phone,
        role_id,
        is_banned,
        roles!inner (role_name)
      `)
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    // Check if user is banned
    if (user.is_banned) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been banned. Contact support for assistance.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        role_id: user.role_id,
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role_id: user.role_id,
        role_name: user.roles.role_name
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// Verify token endpoint (optional - for checking if token is still valid)
router.get('/verify', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ 
      success: false, 
      message: 'No token provided.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        user_id,
        name,
        email,
        phone,
        role_id,
        roles!inner (role_name)
      `)
      .eq('user_id', decoded.user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    res.status(200).json({
      success: true,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role_id: user.role_id,
        role_name: user.roles.role_name
      }
    });
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token.' 
    });
  }
});

// Get all users (Admin only)
router.get('/users', verifyToken, async (req, res) => {
  try {
    // Check if user is admin (role_id: 1)
    if (req.user.role_id !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select(`
        user_id,
        name,
        email,
        phone,
        created_at,
        role_id,
        roles (role_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      users: users.map(user => ({
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role_id: user.role_id,
        role_name: user.roles?.role_name || 'Unknown',
        created_at: user.created_at,
        is_banned: user.is_banned || false
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users.'
    });
  }
});

// Update user (Admin only)
router.put('/users/:userId', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role_id !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { userId } = req.params;
    const { name, email, phone, role_id } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required.'
      });
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ 
        name, 
        email: email.toLowerCase(), 
        phone: phone || null,
        role_id: role_id || 3
      })
      .eq('user_id', userId)
      .select(`
        user_id,
        name,
        email,
        phone,
        role_id,
        created_at,
        is_banned,
        roles (role_name)
      `)
      .single();

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user: {
        ...updatedUser,
        role_name: updatedUser.roles?.role_name || 'Unknown'
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user.'
    });
  }
});

// Ban/Unban user (Admin only)
router.patch('/users/:userId/ban', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role_id !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { userId } = req.params;
    const { is_banned } = req.body;

    // Prevent admin from banning themselves
    if (parseInt(userId) === req.user.user_id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot ban yourself.'
      });
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ is_banned: is_banned })
      .eq('user_id', userId)
      .select(`
        user_id,
        name,
        email,
        is_banned,
        roles (role_name)
      `)
      .single();

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: is_banned ? 'User banned successfully.' : 'User unbanned successfully.',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user ban status.'
    });
  }
});

// Delete user (Admin only)
router.delete('/users/:userId', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role_id !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.user.user_id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete yourself.'
      });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user.'
    });
  }
});

export default router;
