import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import supabase from '../config/database.js';
import verifyToken, { isAdmin } from '../middleware/auth.js';
import { createSystemTransporter } from '../utils/emailTransporter.js';

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

    // Create seller wallet if user is a seller (role_id === 2)
    if (role_id === 2) {
      const { error: walletError } = await supabase
        .from('seller_wallets')
        .insert([
          {
            seller_id: newUser.user_id,
            balance: 0,
            total_earned: 0,
            total_withdrawn: 0,
            created_at: new Date().toISOString()
          }
        ]);

      if (walletError) {
        console.error('Failed to create seller wallet:', walletError);
        // Don't fail the signup, just log the error
      }
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
router.get('/verify', verifyToken, async (req, res) => {
  try {
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
      .eq('user_id', req.user.user_id)
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
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// ==================== PASSWORD RESET ====================

// POST /forgot-password – send a reset link via email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  try {
    // Look up user
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('user_id, name, email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    // Always return success to prevent user enumeration
    if (userErr || !user) {
      return res.status(200).json({
        success: true,
        message: 'If that email exists, a reset link has been sent.',
      });
    }

    // Generate a secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate previous tokens for this user
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('user_id', user.user_id)
      .eq('used', false);

    // Store new token
    const { error: insertErr } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.user_id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
      });

    if (insertErr) throw insertErr;

    // Build reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send email
    const transporter = createSystemTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: process.env.BOT_EMAIL,
        to: user.email,
        subject: 'Botify – Password Reset',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
            <h2 style="color:#2563eb;">Botify Password Reset</h2>
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>You requested a password reset. Click the button below to set a new password:</p>
            <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a>
            <p style="color:#6b7280;font-size:14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
          </div>
        `,
      });
    }

    res.status(200).json({
      success: true,
      message: 'If that email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

// POST /reset-password – verify token and set new password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Token and new password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  try {
    // Find the token
    const { data: resetRecord, error: tokenErr } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (tokenErr || !resetRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link.' });
    }

    // Check expiry
    if (new Date(resetRecord.expires_at) < new Date()) {
      await supabase.from('password_reset_tokens').update({ used: true }).eq('id', resetRecord.id);
      return res.status(400).json({ success: false, message: 'Reset link has expired. Please request a new one.' });
    }

    // Hash new password
    const password_hash = await bcrypt.hash(password, 10);

    // Update user password
    const { error: updateErr } = await supabase
      .from('users')
      .update({ password_hash })
      .eq('user_id', resetRecord.user_id);

    if (updateErr) throw updateErr;

    // Mark token as used
    await supabase.from('password_reset_tokens').update({ used: true }).eq('id', resetRecord.id);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

// Get all users (Admin only)
router.get('/users', verifyToken, isAdmin, async (req, res) => {
  try {
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
router.put('/users/:userId', verifyToken, isAdmin, async (req, res) => {
  try {
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
router.patch('/users/:userId/ban', verifyToken, isAdmin, async (req, res) => {
  try {
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
router.delete('/users/:userId', verifyToken, isAdmin, async (req, res) => {
  try {
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

// ==================== ADMIN DASHBOARD DATA ====================

// GET /admin/stats - Comprehensive platform stats (Admin only)
router.get('/admin/stats', verifyToken, isAdmin, async (req, res) => {
  try {
    // Fetch all data in parallel
    const [usersRes, botsRes, marketplaceRes, purchasesRes] = await Promise.all([
      supabase.from('users').select('user_id, role_id, is_banned, created_at, roles(role_name)'),
      supabase.from('bots').select('bot_id, is_active, created_at'),
      supabase.from('marketplace_bots').select('id, platform, status, price, total_sales, created_at'),
      supabase.from('purchases').select('id, amount, status, purchased_at'),
    ]);

    const users = usersRes.data || [];
    const bots = botsRes.data || [];
    const listings = marketplaceRes.data || [];
    const purchases = purchasesRes.data || [];

    // User stats
    const totalUsers = users.length;
    const sellers = users.filter(u => u.roles?.role_name === 'seller').length;
    const buyers = users.filter(u => u.roles?.role_name === 'buyer').length;
    const admins = users.filter(u => u.roles?.role_name === 'admin').length;
    const bannedUsers = users.filter(u => u.is_banned).length;

    // New users in last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = users.filter(u => new Date(u.created_at) > weekAgo).length;

    // New users in last 30 days
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const newUsersThisMonth = users.filter(u => new Date(u.created_at) > monthAgo).length;

    // Bot stats
    const totalBots = bots.length;
    const activeBots = bots.filter(b => b.is_active).length;

    // Marketplace stats
    const totalListings = listings.length;
    const publishedListings = listings.filter(l => l.status === 'published').length;
    const draftListings = listings.filter(l => l.status === 'draft').length;
    const totalMarketplaceSales = listings.reduce((sum, l) => sum + (l.total_sales || 0), 0);

    // Platform breakdown
    const platformBreakdown = {};
    listings.forEach(l => {
      platformBreakdown[l.platform] = (platformBreakdown[l.platform] || 0) + 1;
    });

    // Revenue stats
    const completedPurchases = purchases.filter(p => p.status === 'completed');
    const totalRevenue = completedPurchases.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalPurchases = purchases.length;

    // Revenue this month
    const revenueThisMonth = completedPurchases
      .filter(p => new Date(p.purchased_at) > monthAgo)
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    // Revenue this week
    const revenueThisWeek = completedPurchases
      .filter(p => new Date(p.purchased_at) > weekAgo)
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    res.json({
      success: true,
      stats: {
        users: { total: totalUsers, sellers, buyers, admins, banned: bannedUsers, newThisWeek: newUsersThisWeek, newThisMonth: newUsersThisMonth },
        bots: { total: totalBots, active: activeBots, inactive: totalBots - activeBots },
        marketplace: { totalListings, published: publishedListings, drafts: draftListings, totalSales: totalMarketplaceSales, platformBreakdown },
        revenue: { total: totalRevenue, thisMonth: revenueThisMonth, thisWeek: revenueThisWeek, totalPurchases },
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
});

// GET /admin/marketplace - All marketplace listings (Admin only)
router.get('/admin/marketplace', verifyToken, isAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('marketplace_bots')
      .select('*, users!marketplace_bots_seller_id_fkey(name, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const listings = (data || []).map(bot => ({
      ...bot,
      seller_name: bot.users?.name || 'Unknown',
      seller_email: bot.users?.email || '',
      users: undefined,
    }));

    res.json({ success: true, listings });
  } catch (error) {
    console.error('Admin marketplace error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch marketplace listings.' });
  }
});

// GET /admin/purchases - All purchases (Admin only)
router.get('/admin/purchases', verifyToken, isAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, marketplace_bots(name, platform, price), users!purchases_buyer_id_fkey(name, email)')
      .order('purchased_at', { ascending: false });

    if (error) throw error;

    const purchases = (data || []).map(p => ({
      ...p,
      buyer_name: p.users?.name || 'Unknown',
      buyer_email: p.users?.email || '',
      bot_name: p.marketplace_bots?.name || 'Unknown',
      bot_platform: p.marketplace_bots?.platform || '',
      users: undefined,
      marketplace_bots: undefined,
    }));

    res.json({ success: true, purchases });
  } catch (error) {
    console.error('Admin purchases error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch purchases.' });
  }
});

export default router;

// Google OAuth token verification endpoint
// Expects { id_token } from client (Google Identity Services)
// Optional query param: ?role_id=2 (seller) or 3 (buyer) - only used for NEW users
router.post('/google', async (req, res) => {
  const { id_token } = req.body;
  const { role_id: requestedRoleId } = req.query;

  if (!id_token) {
    return res.status(400).json({ success: false, message: 'id_token is required.' });
  }

  // Validate role_id if provided: allow only seller (2) or buyer (3)
  let roleIdForNewUser = 3; // default to buyer
  if (requestedRoleId) {
    const numRoleId = parseInt(requestedRoleId, 10);
    if (![2, 3].includes(numRoleId)) {
      return res.status(400).json({ success: false, message: 'Invalid role_id. Must be 2 (seller) or 3 (buyer).' });
    }
    roleIdForNewUser = numRoleId;
  }

  try {
    // Verify ID token with Google tokeninfo endpoint
    const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`);
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      console.error('Google tokeninfo error:', resp.status, txt);
      return res.status(401).json({ success: false, message: 'Invalid Google ID token.' });
    }

    const payload = await resp.json();
    const { email, email_verified, name } = payload;

    if (!email || email_verified !== 'true' && email_verified !== true) {
      return res.status(400).json({ success: false, message: 'Google account email not verified.' });
    }

    // Check if user exists
    const { data: existingUser, error: userErr } = await supabase
      .from('users')
      .select('user_id, name, email, phone, role_id, is_banned, roles!inner(role_name)')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userErr && userErr.code !== 'PGRST116') {
      throw userErr;
    }

    if (existingUser) {
      if (existingUser.is_banned) {
        return res.status(403).json({ success: false, message: 'Your account is banned.' });
      }

      const token = jwt.sign(
        { user_id: existingUser.user_id, role_id: existingUser.role_id, email: existingUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({ 
        success: true, 
        token, 
        isNewUser: false,
        user: {
          user_id: existingUser.user_id,
          name: existingUser.name,
          email: existingUser.email,
          phone: existingUser.phone,
          role_id: existingUser.role_id,
          role_name: existingUser.roles?.role_name || 'buyer'
        }
      });
    }

    // Create new user: use requested role_id or default to buyer
    // Generate a random password hash to satisfy NOT NULL constraint
    const randomPassword = crypto.randomBytes(16).toString('hex');
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(randomPassword, saltRounds);

    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert([{ name: name || email.split('@')[0], email: email.toLowerCase(), password_hash, phone: null, role_id: roleIdForNewUser }])
      .select('user_id, name, email, phone, role_id')
      .single();

    if (insertErr) {
      throw insertErr;
    }

    const token = jwt.sign(
      { user_id: newUser.user_id, role_id: newUser.role_id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Determine role name based on role_id
    const roleName = newUser.role_id === 2 ? 'seller' : 'buyer';

    return res.status(201).json({ 
      success: true, 
      token, 
      isNewUser: true,
      user: {
        user_id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role_id: newUser.role_id,
        role_name: roleName
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, message: 'Google authentication failed.' });
  }
});
