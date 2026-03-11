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
    // Use count-only queries where possible to avoid pulling full tables into memory.
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    const [
      usersTotalRes,
      adminsRes,
      sellersRes,
      buyersRes,
      bannedRes,
      newUsersRes,
      botsTotalRes,
      activeBotsRes,
      inactiveBotsRes,
      listingsTotalRes,
      publishedRes,
      draftRes,
      archivedRes,
      purchasesTotalRes,
      completedRes,
      refundedRes,
      newPurchasesRes,
    ] = await Promise.all([
      supabase.from('users').select('id', { head: true, count: 'exact' }),
      supabase.from('users').select('id', { head: true, count: 'exact' }).eq('role_id', 1),
      supabase.from('users').select('id', { head: true, count: 'exact' }).eq('role_id', 2),
      supabase.from('users').select('id', { head: true, count: 'exact' }).eq('role_id', 3),
      supabase.from('users').select('id', { head: true, count: 'exact' }).eq('is_banned', true),
      supabase.from('users').select('id', { head: true, count: 'exact' }).gte('created_at', weekAgoISO),

      supabase.from('bots').select('bot_id', { head: true, count: 'exact' }),
      supabase.from('bots').select('bot_id', { head: true, count: 'exact' }).eq('is_active', true),
      supabase.from('bots').select('bot_id', { head: true, count: 'exact' }).eq('is_active', false),

      supabase.from('marketplace_bots').select('id', { head: true, count: 'exact' }),
      supabase.from('marketplace_bots').select('id', { head: true, count: 'exact' }).eq('status', 'published'),
      supabase.from('marketplace_bots').select('id', { head: true, count: 'exact' }).eq('status', 'draft'),
      supabase.from('marketplace_bots').select('id', { head: true, count: 'exact' }).eq('status', 'archived'),

      supabase.from('purchases').select('id', { head: true, count: 'exact' }),
      supabase.from('purchases').select('id', { head: true, count: 'exact' }).eq('status', 'completed'),
      supabase.from('purchases').select('id', { head: true, count: 'exact' }).eq('status', 'refunded'),
      supabase.from('purchases').select('id', { head: true, count: 'exact' }).gte('purchased_at', weekAgoISO),
    ]);

    // For platform breakdown and totals that need numeric aggregation, fetch only the necessary columns.
    const listingsDataRes = await supabase.from('marketplace_bots').select('platform, total_sales');
    const listingsData = listingsDataRes.data || [];

    const platformCounts = {};
    let totalSales = 0;
    listingsData.forEach((l) => {
      platformCounts[l.platform] = (platformCounts[l.platform] || 0) + 1;
      totalSales += parseFloat(l.total_sales || 0);
    });

    const stats = {
      users: {
        total: usersTotalRes.count || 0,
        admins: adminsRes.count || 0,
        sellers: sellersRes.count || 0,
        buyers: buyersRes.count || 0,
        banned: bannedRes.count || 0,
        newThisWeek: newUsersRes.count || 0,
      },
      bots: {
        total: botsTotalRes.count || 0,
        active: activeBotsRes.count || 0,
        inactive: inactiveBotsRes.count || 0,
      },
      marketplace: {
        total: listingsTotalRes.count || 0,
        published: publishedRes.count || 0,
        draft: draftRes.count || 0,
        archived: archivedRes.count || 0,
        totalSales,
        platformBreakdown: platformCounts,
      },
      purchases: {
        total: purchasesTotalRes.count || 0,
        completed: completedRes.count || 0,
        refunded: refundedRes.count || 0,
        totalRevenue: 0, // totalRevenue can be derived server-side via DB aggregate if needed
        newThisWeek: newPurchasesRes.count || 0,
      },
    };

    res.json({ success: true, stats });
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
