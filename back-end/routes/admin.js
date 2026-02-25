import express from 'express';
import supabase from '../config/database.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// Middleware: Admin only
const adminOnly = (req, res, next) => {
  if (req.user.role_id !== 1) {
    return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
  }
  next();
};

// GET /stats - Aggregated platform statistics
router.get('/stats', verifyToken, adminOnly, async (req, res) => {
  try {
    // Fetch all counts in parallel
    const [usersRes, botsRes, listingsRes, purchasesRes] = await Promise.all([
      supabase.from('users').select('user_id, role_id, is_banned, created_at'),
      supabase.from('bots').select('bot_id, is_active, created_at'),
      supabase.from('marketplace_bots').select('id, status, platform, price, total_sales, created_at'),
      supabase.from('purchases').select('id, amount, status, purchased_at'),
    ]);

    const users = usersRes.data || [];
    const bots = botsRes.data || [];
    const listings = listingsRes.data || [];
    const purchases = purchasesRes.data || [];

    const totalRevenue = purchases
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    // Platform breakdown
    const platformCounts = {};
    listings.forEach((l) => {
      platformCounts[l.platform] = (platformCounts[l.platform] || 0) + 1;
    });

    // New users this week (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = users.filter((u) => new Date(u.created_at) >= weekAgo).length;

    // New purchases this week
    const newPurchasesThisWeek = purchases.filter((p) => new Date(p.purchased_at) >= weekAgo).length;

    res.json({
      success: true,
      stats: {
        users: {
          total: users.length,
          admins: users.filter((u) => u.role_id === 1).length,
          sellers: users.filter((u) => u.role_id === 2).length,
          buyers: users.filter((u) => u.role_id === 3).length,
          banned: users.filter((u) => u.is_banned).length,
          newThisWeek: newUsersThisWeek,
        },
        bots: {
          total: bots.length,
          active: bots.filter((b) => b.is_active).length,
          inactive: bots.filter((b) => !b.is_active).length,
        },
        marketplace: {
          total: listings.length,
          published: listings.filter((l) => l.status === 'published').length,
          draft: listings.filter((l) => l.status === 'draft').length,
          archived: listings.filter((l) => l.status === 'archived').length,
          totalSales: listings.reduce((sum, l) => sum + (l.total_sales || 0), 0),
          platformBreakdown: platformCounts,
        },
        purchases: {
          total: purchases.length,
          completed: purchases.filter((p) => p.status === 'completed').length,
          refunded: purchases.filter((p) => p.status === 'refunded').length,
          totalRevenue,
          newThisWeek: newPurchasesThisWeek,
        },
      },
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
});

// GET /marketplace-listings - All marketplace listings for admin review
router.get('/marketplace-listings', verifyToken, adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('marketplace_bots')
      .select('*, users!marketplace_bots_seller_id_fkey(name, email)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin fetch listings error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch listings.' });
    }

    const listings = (data || []).map((bot) => ({
      ...bot,
      seller_name: bot.users?.name || 'Unknown',
      seller_email: bot.users?.email || '',
      users: undefined,
    }));

    res.json({ success: true, listings });
  } catch (err) {
    console.error('Admin fetch listings error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PATCH /marketplace-listings/:id/status - Admin changes listing status
router.patch('/marketplace-listings/:id/status', verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const { data, error } = await supabase
      .from('marketplace_bots')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Admin update listing status error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update.' });
    }

    res.json({ success: true, message: `Listing ${status}.`, bot: data });
  } catch (err) {
    console.error('Admin update listing error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /marketplace-listings/:id - Admin deletes a listing
router.delete('/marketplace-listings/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('marketplace_bots').delete().eq('id', id);

    if (error) {
      console.error('Admin delete listing error:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete.' });
    }

    res.json({ success: true, message: 'Listing deleted.' });
  } catch (err) {
    console.error('Admin delete listing error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /purchases - All purchases for admin
router.get('/purchases', verifyToken, adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, marketplace_bots(name, platform, price), users!purchases_buyer_id_fkey(name, email)')
      .order('purchased_at', { ascending: false });

    if (error) {
      console.error('Admin fetch purchases error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch purchases.' });
    }

    const purchases = (data || []).map((p) => ({
      ...p,
      buyer_name: p.users?.name || 'Unknown',
      buyer_email: p.users?.email || '',
      bot_name: p.marketplace_bots?.name || 'Unknown Bot',
      bot_platform: p.marketplace_bots?.platform || '',
      users: undefined,
      marketplace_bots: undefined,
    }));

    res.json({ success: true, purchases });
  } catch (err) {
    console.error('Admin fetch purchases error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /email-bots - All email bots for admin
router.get('/email-bots', verifyToken, adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bots')
      .select('*, users!bots_user_id_fkey(name, email)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin fetch email bots error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch bots.' });
    }

    const bots = (data || []).map((b) => ({
      ...b,
      owner_name: b.users?.name || 'Unknown',
      owner_email: b.users?.email || '',
      users: undefined,
    }));

    res.json({ success: true, bots });
  } catch (err) {
    console.error('Admin fetch email bots error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

export default router;
