import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import supabase from '../config/database.js';
import verifyToken from '../middleware/auth.js';
import telegramBotFactory from '../services/telegramBotFactory.js';

const router = express.Router();
const broadcastUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function getPagination(rawLimit, rawOffset) {
  const parsedLimit = Number.parseInt(rawLimit, 10);
  const parsedOffset = Number.parseInt(rawOffset, 10);

  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20;
  const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

  return { limit, offset };
}

function extractMessageFromExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  const messages = rows
    .map((row) => {
      const key = Object.keys(row).find((k) => k.toLowerCase() === 'message');
      return key ? String(row[key] || '').trim() : '';
    })
    .filter(Boolean);

  if (messages.length === 0) {
    return '';
  }

  return messages.join('\n');
}

// ==================== SELLER ENDPOINTS ====================

// GET /bot-factory/instances - Seller lists own Telegram bot instances
router.get('/bot-factory/instances', verifyToken, async (req, res) => {
  try {
    if (req.user.role_id !== 2) {
      return res.status(403).json({ success: false, message: 'Only sellers can view bot instances.' });
    }

    const { data, error } = await supabase
      .from('bot_instances')
      .select('id, seller_id, config_json, is_active, created_at, updated_at')
      .eq('seller_id', req.user.user_id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch bot instances.' });
    }

    return res.json({ success: true, instances: data || [] });
  } catch (err) {
    console.error('Fetch bot instances error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /bot-factory/instances - Seller creates or updates Telegram bot instance
router.post('/bot-factory/instances', verifyToken, async (req, res) => {
  try {
    if (req.user.role_id !== 2) {
      return res.status(403).json({ success: false, message: 'Only sellers can create bot instances.' });
    }

    const { telegramToken, configJson, isActive = true } = req.body;
    if (!telegramToken) {
      return res.status(400).json({ success: false, message: 'telegramToken is required.' });
    }

    const { data, error } = await supabase
      .from('bot_instances')
      .upsert(
        {
          seller_id: req.user.user_id,
          telegram_token: telegramToken,
          config_json: configJson || {},
          is_active: Boolean(isActive),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'seller_id,telegram_token' }
      )
      .select('id, seller_id, config_json, is_active, created_at, updated_at')
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: 'Failed to save bot instance.' });
    }

    await telegramBotFactory.refreshInstances();
    return res.status(201).json({ success: true, instance: data });
  } catch (err) {
    console.error('Create bot instance error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /broadcast - Seller broadcast message to subscribers of one Telegram bot instance
router.post('/broadcast', verifyToken, broadcastUpload.single('excelFile'), async (req, res) => {
  try {
    if (req.user.role_id !== 2) {
      return res.status(403).json({ success: false, message: 'Only sellers can broadcast.' });
    }

    const { botInstanceId, concurrency } = req.body;
    if (!botInstanceId) {
      return res.status(400).json({ success: false, message: 'botInstanceId is required.' });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: 'An Excel file is required.' });
    }

    const message = extractMessageFromExcelBuffer(req.file.buffer);
    if (!message) {
      return res.status(400).json({ success: false, message: 'Excel file must include a non-empty Message column.' });
    }

    const result = await telegramBotFactory.broadcastToInstance({
      sellerId: req.user.user_id,
      instanceId: Number.parseInt(botInstanceId, 10),
      message,
      concurrency: Number.parseInt(concurrency, 10),
    });

    return res.status(200).json({
      success: true,
      message: 'Broadcast completed.',
      ...result,
    });
  } catch (err) {
    if (err.message === 'BOT_INSTANCE_NOT_RUNNING') {
      return res.status(400).json({ success: false, message: 'Bot instance is not running. Check token and active status.' });
    }
    if (err.message === 'BOT_INSTANCE_ACCESS_DENIED') {
      return res.status(403).json({ success: false, message: 'You can only broadcast from your own bot instance.' });
    }

    console.error('Broadcast error:', err);
    return res.status(500).json({ success: false, message: 'Failed to broadcast message.' });
  }
});

// POST /create - Seller creates a new marketplace bot listing
router.post('/create', verifyToken, async (req, res) => {
  try {
    // Only sellers (role_id = 2) can create listings
    if (req.user.role_id !== 2) {
      return res.status(403).json({ success: false, message: 'Only sellers can create marketplace listings.' });
    }

    const { name, description, platform, price, features, category, image_url, bot_script, github_link, config_json } = req.body;

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

    // Create the marketplace bot listing
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
        bot_script: bot_script || null,
        github_link: github_link || null,
        config_json: config_json || {},
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Create marketplace bot error:', error);
      
      // Check if it's a missing column error
      if (error.message?.includes('bot_script') || error.message?.includes('github_link') || error.message?.includes('config_json')) {
        return res.status(500).json({
          success: false,
          message: 'Database schema is not up to date. Please run the bot-creation migration SQL.',
          error: 'MIGRATION_REQUIRED',
          setupLink: 'Run: node setup-migrations.mjs',
        });
      }

      return res.status(500).json({ success: false, message: 'Failed to create listing.' });
    }

    // If bot_script is provided, store it in bot_scripts table for versioning
    if (bot_script) {
      try {
        await supabase
          .from('bot_scripts')
          .insert({
            bot_id: data.id,
            creator_id: req.user.user_id,
            script_content: bot_script,
            version: 1,
            is_current: true,
          });
      } catch (scriptErr) {
        console.warn('Warning: Failed to store bot script:', scriptErr);
        // Don't fail the listing creation if script storage fails
      }
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

// GET /my-listing/:id - Seller gets a single listing for editing
router.get('/my-listing/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role_id !== 2) {
      return res.status(403).json({ success: false, message: 'Only sellers can view their listings.' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('marketplace_bots')
      .select('*')
      .eq('id', id)
      .eq('seller_id', req.user.user_id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    res.json({ success: true, listing: data });
  } catch (err) {
    console.error('Fetch my listing error:', err);
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
    const { name, description, platform, price, features, category, image_url, status, bot_script, github_link, config_json } = req.body;

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
    if (bot_script !== undefined) updateData.bot_script = bot_script || null;
    if (github_link !== undefined) updateData.github_link = github_link || null;
    if (config_json !== undefined) updateData.config_json = config_json || {};

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

    // If bot_script is provided, update script version
    if (bot_script) {
      try {
        // Mark old scripts as not current
        await supabase
          .from('bot_scripts')
          .update({ is_current: false })
          .eq('bot_id', id);

        // Insert new script version
        await supabase
          .from('bot_scripts')
          .insert({
            bot_id: id,
            creator_id: req.user.user_id,
            script_content: bot_script,
            version: 2,
            is_current: true,
          });
      } catch (scriptErr) {
        console.warn('Warning: Failed to update bot script version:', scriptErr);
      }
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

// GET /browse or /marketplace - Browse all published marketplace bots (public)
router.get(['/browse', '/marketplace'], async (req, res) => {
  try {
    const { platform, category, search, sort } = req.query;
    const { limit, offset } = getPagination(req.query.limit, req.query.offset);

    let query = supabase
      .from('marketplace_bots')
      .select('*, users!marketplace_bots_seller_id_fkey(name, email)', { count: 'exact' })
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

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

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

    res.json({
      success: true,
      listings,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: offset + listings.length < (count || 0),
      },
    });
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

    const parsedBotId = Number.parseInt(id, 10);
    if (!Number.isFinite(parsedBotId) || parsedBotId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid bot id.' });
    }

    const { data, error } = await supabase.rpc('purchase_marketplace_bot', {
      p_buyer_id: req.user.user_id,
      p_marketplace_bot_id: parsedBotId,
    });

    if (error) {
      const msg = error.message || 'Purchase failed.';
      if (msg.includes('LISTING_NOT_FOUND')) {
        return res.status(404).json({ success: false, message: 'Listing not found or not available.' });
      }
      if (msg.includes('SELF_PURCHASE_NOT_ALLOWED')) {
        return res.status(400).json({ success: false, message: 'You cannot purchase your own bot.' });
      }
      if (msg.includes('ALREADY_PURCHASED') || msg.includes('duplicate key')) {
        return res.status(400).json({ success: false, message: 'You have already purchased this bot.' });
      }

      console.error('Purchase RPC error:', error);
      return res.status(500).json({ success: false, message: 'Failed to complete purchase.' });
    }

    const purchase = Array.isArray(data) ? data[0] : data;

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

// GET /my-purchases or /purchase-history - Buyer gets purchased bots with pagination
router.get(['/my-purchases', '/purchase-history'], verifyToken, async (req, res) => {
  try {
    if (req.user.role_id !== 3) {
      return res.status(403).json({ success: false, message: 'Only buyers can view purchases.' });
    }

    const { limit, offset } = getPagination(req.query.limit, req.query.offset);

    const { data, error, count } = await supabase
      .from('purchases')
      .select('*, marketplace_bots(*)', { count: 'exact' })
      .eq('buyer_id', req.user.user_id)
      .order('purchased_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Fetch purchases error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch purchases.' });
    }

    res.json({
      success: true,
      purchases: data || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: offset + (data?.length || 0) < (count || 0),
      },
    });
  } catch (err) {
    console.error('Fetch purchases error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /bot/:id/access - Buyer gets bot script and GitHub link (only if purchased)
router.get('/bot/:id/access', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is a buyer
    if (req.user.role_id !== 3) {
      return res.status(403).json({ success: false, message: 'Only buyers can access bot resources.' });
    }

    // Check if user has purchased this bot
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('id')
      .eq('buyer_id', req.user.user_id)
      .eq('marketplace_bot_id', id)
      .single();

    if (purchaseError || !purchase) {
      return res.status(403).json({ success: false, message: 'You must purchase this bot first to access its resources.' });
    }

    // Get the bot script and GitHub link
    const { data: bot, error: botError } = await supabase
      .from('marketplace_bots')
      .select('id, name, platform, bot_script, github_link, config_json')
      .eq('id', id)
      .single();

    if (botError || !bot) {
      return res.status(404).json({ success: false, message: 'Bot not found.' });
    }

    // Log access for audit trail
    try {
      await supabase
        .from('bot_access_logs')
        .insert({
          bot_id: id,
          user_id: req.user.user_id,
          access_type: 'script_access',
          accessed_at: new Date().toISOString(),
        });
    } catch (logErr) {
      console.warn('Warning: Failed to log bot access:', logErr);
    }

    res.json({
      success: true,
      bot: {
        id: bot.id,
        name: bot.name,
        platform: bot.platform,
        bot_script: bot.bot_script,
        github_link: bot.github_link,
        config_json: bot.config_json,
      },
    });
  } catch (err) {
    console.error('Get bot access error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

export default router;
