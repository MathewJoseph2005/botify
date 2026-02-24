import express from 'express';
import supabase from '../config/database.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// ==================== SELLER ENDPOINTS ====================

// POST /create - Seller creates a new marketplace bot listing
router.post('/create', verifyToken, async (req, res) => {
  try {
    // Only sellers (role_id = 2) can create listings
    if (req.user.role_id !== 2) {
      return res.status(403).json({ success: false, message: 'Only sellers can create marketplace listings.' });
    }

    const { name, description, platform, price, features, category, image_url } = req.body;

    if (!name || !platform || price === undefined) {
      return res.status(400).json({ success: false, message: 'Name, platform, and price are required.' });
    }

    const validPlatforms = ['email', 'whatsapp', 'telegram', 'discord', 'slack', 'instagram'];
    if (!validPlatforms.includes(platform.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`,
      });
    }

    if (parseFloat(price) < 0) {
      return res.status(400).json({ success: false, message: 'Price cannot be negative.' });
    }

    const { data, error } = await supabase
      .from('marketplace_bots')
      .insert({
        seller_id: req.user.user_id,
        name: name.trim(),
        description: description?.trim() || null,
        platform: platform.toLowerCase(),
        price: parseFloat(price),
        features: features || [],
        category: category?.trim() || null,
        image_url: image_url?.trim() || null,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Create marketplace bot error:', error);
      return res.status(500).json({ success: false, message: 'Failed to create listing.' });
    }

    res.status(201).json({ success: true, message: 'Listing created successfully.', bot: data });
  } catch (err) {
    console.error('Create marketplace bot error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /my-listings - Seller gets their own listings
router.get('/my-listings', verifyToken, async (req, res) => {
  try {
    if (req.user.role_id !== 2) {
      return res.status(403).json({ success: false, message: 'Only sellers can view their listings.' });
    }

    const { data, error } = await supabase
      .from('marketplace_bots')
      .select('*')
      .eq('seller_id', req.user.user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch my listings error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch listings.' });
    }

    res.json({ success: true, listings: data });
  } catch (err) {
    console.error('Fetch my listings error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /update/:id - Seller updates their listing
router.put('/update/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role_id !== 2) {
      return res.status(403).json({ success: false, message: 'Only sellers can update listings.' });
    }

    const { id } = req.params;
    const { name, description, platform, price, features, category, image_url, status } = req.body;

    // Verify ownership
    const { data: existing, error: fetchErr } = await supabase
      .from('marketplace_bots')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    if (existing.seller_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'You can only update your own listings.' });
    }

    // Validate platform if provided
    if (platform) {
      const validPlatforms = ['email', 'whatsapp', 'telegram', 'discord', 'slack', 'instagram'];
      if (!validPlatforms.includes(platform.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`,
        });
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['draft', 'published', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }
    }

    const updateData = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (platform) updateData.platform = platform.toLowerCase();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (features) updateData.features = features;
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (image_url !== undefined) updateData.image_url = image_url?.trim() || null;
    if (status) updateData.status = status;

    const { data, error } = await supabase
      .from('marketplace_bots')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update listing error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update listing.' });
    }

    res.json({ success: true, message: 'Listing updated successfully.', bot: data });
  } catch (err) {
    console.error('Update listing error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /delete/:id - Seller deletes their listing
router.delete('/delete/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role_id !== 2) {
      return res.status(403).json({ success: false, message: 'Only sellers can delete listings.' });
    }

    const { id } = req.params;

    // Verify ownership
    const { data: existing, error: fetchErr } = await supabase
      .from('marketplace_bots')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    if (existing.seller_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'You can only delete your own listings.' });
    }

    const { error } = await supabase.from('marketplace_bots').delete().eq('id', id);

    if (error) {
      console.error('Delete listing error:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete listing.' });
    }

    res.json({ success: true, message: 'Listing deleted successfully.' });
  } catch (err) {
    console.error('Delete listing error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PATCH /publish/:id - Seller publishes/unpublishes a listing
router.patch('/publish/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role_id !== 2) {
      return res.status(403).json({ success: false, message: 'Only sellers can publish listings.' });
    }

    const { id } = req.params;
    const { publish } = req.body; // true = publish, false = unpublish (back to draft)

    // Verify ownership
    const { data: existing, error: fetchErr } = await supabase
      .from('marketplace_bots')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    if (existing.seller_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'You can only publish your own listings.' });
    }

    const newStatus = publish ? 'published' : 'draft';

    const { data, error } = await supabase
      .from('marketplace_bots')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Publish listing error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update listing status.' });
    }

    res.json({
      success: true,
      message: publish ? 'Listing published to marketplace.' : 'Listing unpublished.',
      bot: data,
    });
  } catch (err) {
    console.error('Publish listing error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ==================== PUBLIC / BUYER ENDPOINTS ====================

// GET /browse - Browse all published marketplace bots (public)
router.get('/browse', async (req, res) => {
  try {
    const { platform, category, search, sort } = req.query;

    let query = supabase
      .from('marketplace_bots')
      .select('*, users!marketplace_bots_seller_id_fkey(name, email)')
      .eq('status', 'published');

    if (platform) {
      query = query.eq('platform', platform.toLowerCase());
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'popular':
        query = query.order('total_sales', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Browse marketplace error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch marketplace listings.' });
    }

    // Map seller info for cleaner response
    const listings = data.map((bot) => ({
      ...bot,
      seller_name: bot.users?.name || 'Unknown Seller',
      seller_email: bot.users?.email || '',
      users: undefined,
    }));

    res.json({ success: true, listings });
  } catch (err) {
    console.error('Browse marketplace error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /details/:id - Get a single listing's details (public)
router.get('/details/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('marketplace_bots')
      .select('*, users!marketplace_bots_seller_id_fkey(name, email)')
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    const listing = {
      ...data,
      seller_name: data.users?.name || 'Unknown Seller',
      seller_email: data.users?.email || '',
      users: undefined,
    };

    res.json({ success: true, listing });
  } catch (err) {
    console.error('Get listing details error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /purchase/:id - Buyer purchases a bot
router.post('/purchase/:id', verifyToken, async (req, res) => {
  try {
    // Only buyers (role_id = 3) can purchase
    if (req.user.role_id !== 3) {
      return res.status(403).json({ success: false, message: 'Only buyers can purchase bots.' });
    }

    const { id } = req.params;

    // Check if listing exists and is published
    const { data: bot, error: botErr } = await supabase
      .from('marketplace_bots')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (botErr || !bot) {
      return res.status(404).json({ success: false, message: 'Listing not found or not available.' });
    }

    // Check if buyer already purchased this bot
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('buyer_id', req.user.user_id)
      .eq('marketplace_bot_id', id)
      .eq('status', 'completed')
      .single();

    if (existingPurchase) {
      return res.status(400).json({ success: false, message: 'You have already purchased this bot.' });
    }

    // Create purchase record
    const { data: purchase, error: purchaseErr } = await supabase
      .from('purchases')
      .insert({
        buyer_id: req.user.user_id,
        marketplace_bot_id: parseInt(id),
        amount: bot.price,
        status: 'completed',
      })
      .select()
      .single();

    if (purchaseErr) {
      console.error('Purchase error:', purchaseErr);
      return res.status(500).json({ success: false, message: 'Failed to complete purchase.' });
    }

    // Increment total_sales on the bot
    await supabase
      .from('marketplace_bots')
      .update({ total_sales: (bot.total_sales || 0) + 1 })
      .eq('id', id);

    res.status(201).json({
      success: true,
      message: 'Bot purchased successfully!',
      purchase,
    });
  } catch (err) {
    console.error('Purchase error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /my-purchases - Buyer gets their purchased bots
router.get('/my-purchases', verifyToken, async (req, res) => {
  try {
    if (req.user.role_id !== 3) {
      return res.status(403).json({ success: false, message: 'Only buyers can view purchases.' });
    }

    const { data, error } = await supabase
      .from('purchases')
      .select('*, marketplace_bots(*)')
      .eq('buyer_id', req.user.user_id)
      .order('purchased_at', { ascending: false });

    if (error) {
      console.error('Fetch purchases error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch purchases.' });
    }

    res.json({ success: true, purchases: data });
  } catch (err) {
    console.error('Fetch purchases error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

export default router;
