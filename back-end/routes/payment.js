import express from 'express';
import { createClient } from '@supabase/supabase-js';
import verifyToken, { requireRole } from '../middleware/auth.js';
import dotenv from 'dotenv';
import {
  getOrCreateUserCredits,
  listCreditPlans,
  addCredits,
} from '../services/creditService.js';

dotenv.config();

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Demo mode flag - set to true for demo/test mode
const DEMO_MODE = true; // Set to false when using real Stripe

// Platform fee settings
const PLATFORM_FEE_PERCENTAGE = parseInt(process.env.STRIPE_PLATFORM_FEE_PERCENTAGE || '5');
const MIN_PAYOUT_AMOUNT = parseFloat(process.env.STRIPE_MIN_PAYOUT_AMOUNT || '100');

/**
 * Calculate platform fees
 */
function calculateFees(amount) {
  const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENTAGE / 100));
  return {
    platformFee,
    sellerReceives: amount - platformFee,
  };
}

/**
 * GET /api/payments/credits/balance
 * Get authenticated user's credit balance.
 */
router.get('/credits/balance', verifyToken, async (req, res) => {
  try {
    const credits = await getOrCreateUserCredits(req.user.user_id);
    return res.json({
      success: true,
      data: {
        credits: Number(credits.credits_balance),
        totalPurchased: Number(credits.total_purchased || 0),
        totalUsed: Number(credits.total_used || 0),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/payments/credits/plans
 * Get available credit purchase plans.
 */
router.get('/credits/plans', verifyToken, async (_req, res) => {
  try {
    const plans = await listCreditPlans();
    return res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/credits/create-checkout-session
 * Create demo checkout for credit purchase.
 */
router.post('/credits/create-checkout-session', verifyToken, async (req, res) => {
  try {
    const { plan_id } = req.body;
    if (!plan_id) {
      return res.status(400).json({
        success: false,
        error: 'plan_id is required',
      });
    }

    const plans = await listCreditPlans();
    const plan = plans.find((p) => String(p.id) === String(plan_id));
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Credit plan not found',
      });
    }

    if (DEMO_MODE) {
      return res.json({
        success: true,
        data: {
          sessionId: `demo-credit-session-${Date.now()}`,
          purchaseId: `demo-credit-${Date.now()}`,
          amount: Number(plan.price_usd),
          credits: Number(plan.credits),
          plan,
          demoMode: true,
        },
        message: 'Demo credit checkout session created',
      });
    }

    return res.status(501).json({
      success: false,
      error: 'Live Stripe checkout for credits is not implemented yet',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/credits/confirm-demo-payment
 * Confirm demo card payment and add credits to user wallet.
 */
router.post('/credits/confirm-demo-payment', verifyToken, async (req, res) => {
  try {
    const { plan_id, cardNumber, expiryDate, cvc } = req.body;
    const user_id = req.user.user_id;

    if (!plan_id || !cardNumber || !expiryDate || !cvc) {
      return res.status(400).json({
        success: false,
        error: 'plan_id, cardNumber, expiryDate, and cvc are required',
      });
    }

    const plans = await listCreditPlans();
    const plan = plans.find((p) => String(p.id) === String(plan_id));
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Credit plan not found',
      });
    }

    const last4 = String(cardNumber).slice(-4);
    if (last4 === '0002') {
      return res.status(400).json({
        success: false,
        error: 'Demo payment declined (test card ending in 0002)',
      });
    }

    const updated = await addCredits({
      userId: user_id,
      credits: Number(plan.credits),
      amountUsd: Number(plan.price_usd),
      source: 'purchase',
      reference: `demo-credit-${Date.now()}`,
      metadata: {
        plan_id: String(plan.id),
        card_last4: last4,
        demo_mode: true,
      },
    });

    return res.json({
      success: true,
      data: {
        credits: Number(updated.credits_balance),
        purchasedCredits: Number(plan.credits),
        amountPaid: Number(plan.price_usd),
        plan,
      },
      message: `Purchased ${plan.credits} credits successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/create-checkout-session
 * Create a demo checkout session for bot purchase (DEMO MODE)
 */
router.post('/create-checkout-session', verifyToken, requireRole(3), async (req, res) => {
  try {
    const { marketplace_bot_id, quantity = 1 } = req.body;
    const buyer_id = req.user.user_id;

    if (!marketplace_bot_id) {
      return res.status(400).json({
        success: false,
        error: 'marketplace_bot_id is required',
      });
    }

    // Fetch bot details
    const { data: bot, error: botError } = await supabase
      .from('marketplace_bots')
      .select('id, seller_id, name, description, price, image_url')
      .eq('id', marketplace_bot_id)
      .single();

    if (botError || !bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot not found',
      });
    }

    // Verify seller exists and is not the buyer
    if (bot.seller_id === buyer_id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot purchase your own bot',
      });
    }

    if (DEMO_MODE) {
      console.log('[DEMO] Create checkout session for bot:', bot.name);

      // Calculate amount (in dollars)
      const totalAmount = bot.price * quantity;
      const feeInfo = calculateFees(Math.round(totalAmount * 100));

      // Return demo checkout data (no real Stripe session)
      return res.json({
        success: true,
        data: {
          purchaseId: `demo-${Date.now()}`,
          sessionId: `demo-session-${Date.now()}`,
          clientSecret: `demo-secret-${Date.now()}`,
          botName: bot.name,
          botPrice: bot.price,
          quantity,
          totalAmount,
          platformFee: feeInfo.platformFee / 100,
          sellerReceives: feeInfo.sellerReceives / 100,
          demoMode: true,
        },
        message: 'Demo checkout session created',
      });
    }
  } catch (error) {
    console.error('Checkout session error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/confirm-demo-payment
 * Confirm demo payment and credit seller wallet
 */
router.post('/confirm-demo-payment', verifyToken, requireRole(3), async (req, res) => {
  try {
    const { marketplace_bot_id, cardNumber, expiryDate, cvc } = req.body;
    const buyer_id = req.user.user_id;

    if (!marketplace_bot_id || !cardNumber || !expiryDate || !cvc) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment fields',
      });
    }

    // Fetch bot details
    const { data: bot, error: botError } = await supabase
      .from('marketplace_bots')
      .select('id, seller_id, name, price')
      .eq('id', marketplace_bot_id)
      .single();

    if (botError || !bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot not found',
      });
    }

    // Demo card validation - reject only cards ending in 0002
    const last4 = cardNumber.slice(-4);
    if (last4 === '0002') {
      console.log('[DEMO] Payment declined - test card 0002');
      return res.status(400).json({
        success: false,
        error: 'Demo payment declined (test card ending in 0002)',
      });
    }

    console.log('[DEMO] Processing demo payment for bot:', bot.name);

    // Calculate fees
    const totalAmount = bot.price;
    const amountInCents = Math.round(totalAmount * 100);
    const feeInfo = calculateFees(amountInCents);

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        buyer_id,
        marketplace_bot_id: bot.id,
        seller_id: bot.seller_id,
        amount: totalAmount,
        payment_status: 'succeeded',
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Failed to create purchase:', purchaseError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create purchase',
      });
    }

    // Fetch seller wallet
    const { data: wallet, error: walletError } = await supabase
      .from('seller_wallets')
      .select('*')
      .eq('seller_id', bot.seller_id)
      .single();

    let currentWallet = wallet;
    if (walletError || !wallet) {
      // Create wallet if doesn't exist
      const { data: newWallet, error: createError } = await supabase
        .from('seller_wallets')
        .insert({
          seller_id: bot.seller_id,
          balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create wallet:', createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create wallet',
        });
      }
      currentWallet = newWallet;
    }

    // Credit seller wallet immediately (demo mode)
    const sellerReceivesAmount = feeInfo.sellerReceives / 100;
    const newBalance = currentWallet.balance + sellerReceivesAmount;

    const { error: updateError } = await supabase
      .from('seller_wallets')
      .update({
        balance: newBalance,
        total_earned: currentWallet.total_earned + sellerReceivesAmount,
      })
      .eq('seller_id', bot.seller_id);

    if (updateError) {
      console.error('Failed to update wallet:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to credit wallet',
      });
    }

    // Create transaction audit record
    const { error: txError } = await supabase
      .from('stripe_transactions')
      .insert({
        transaction_type: 'charge',
        stripe_id: `demo-${purchase.id}`,
        buyer_id,
        seller_id: bot.seller_id,
        marketplace_bot_id: bot.id,
        amount: totalAmount,
        currency: 'USD',
        stripe_fee: (feeInfo.platformFee / 100),
        net_amount: sellerReceivesAmount,
        status: 'succeeded',
        description: `[DEMO] Bot purchase: ${bot.name}`,
        metadata: JSON.stringify({
          demo_mode: true,
          card_last4: last4,
          purchase_id: purchase.id,
        }),
      });

    if (txError) {
      console.error('Failed to create transaction:', txError);
    }

    // Create wallet transaction
    await supabase
      .from('wallet_transactions')
      .insert({
        seller_id: bot.seller_id,
        transaction_type: 'credit',
        amount: sellerReceivesAmount,
        balance_after: newBalance,
        related_stripe_transaction_id: `demo-${purchase.id}`,
        description: `Bot sale payment for ${bot.name}`,
        reference_id: purchase.id,
      });

    console.log('[DEMO] Payment succeeded - seller wallet credited $' + sellerReceivesAmount);

    return res.json({
      success: true,
      data: {
        purchaseId: purchase.id,
        transactionId: `demo-${purchase.id}`,
        amount: totalAmount,
        platformFee: feeInfo.platformFee / 100,
        sellerReceives: sellerReceivesAmount,
        status: 'succeeded',
        demoMode: true,
      },
      message: 'Demo payment processed successfully',
    });
  } catch (error) {
    console.error('Demo payment error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/seller/wallet
 * Get seller wallet details and balance
 */
router.get('/seller/wallet', verifyToken, requireRole(2), async (req, res) => {
  try {
    const seller_id = req.user.user_id;

    // Fetch wallet
    const { data: wallet, error: walletError } = await supabase
      .from('seller_wallets')
      .select('*')
      .eq('seller_id', seller_id)
      .single();

    if (walletError || !wallet) {
      // Create wallet if doesn't exist
      const newWallet = {
        seller_id,
        balance: 0,
        total_earned: 0,
        total_withdrawn: 0,
      };

      const { data: createdWallet, error: createError } = await supabase
        .from('seller_wallets')
        .insert(newWallet)
        .select()
        .single();

      if (createError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create wallet',
        });
      }

      return res.json({
        success: true,
        data: createdWallet,
      });
    }

    // Fetch recent transactions (latest 10)
    const { data: transactions } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('seller_id', seller_id)
      .order('created_at', { ascending: false })
      .limit(10);

    return res.json({
      success: true,
      data: {
        ...wallet,
        recent_transactions: transactions || [],
      },
    });
  } catch (error) {
    console.error('Wallet fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/seller/wallet/transactions
 * Get seller wallet transaction history
 */
router.get('/seller/wallet/transactions', verifyToken, requireRole(2), async (req, res) => {
  try {
    const seller_id = req.user.user_id;
    const page = parseInt(req.query.page || '0');
    const limit = parseInt(req.query.limit || '20');
    const offset = page * limit;

    // Count total transactions
    const { count, error: countError } = await supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', seller_id);

    if (countError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction count',
      });
    }

    // Fetch transactions
    const { data: transactions, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('seller_id', seller_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (txError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions',
      });
    }

    return res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/seller/bank-accounts
 * Add a bank account for seller
 */
router.post('/seller/bank-accounts', verifyToken, requireRole(2), async (req, res) => {
  try {
    const seller_id = req.user.user_id;
    const {
      account_holder_name,
      bank_country,
      account_number,
      routing_number,
      iban,
      account_type = 'checking',
    } = req.body;

    // Validate required fields
    if (!account_holder_name || !bank_country) {
      return res.status(400).json({
        success: false,
        error: 'account_holder_name and bank_country are required',
      });
    }

    // For IBAN countries, IBAN is required. Otherwise, account details are required
    if (!iban && !account_number) {
      return res.status(400).json({
        success: false,
        error: 'Either IBAN or account_number is required',
      });
    }

    // Check if this is the first account (will be marked as primary)
    const { data: existingAccounts } = await supabase
      .from('seller_bank_accounts')
      .select('id')
      .eq('seller_id', seller_id)
      .limit(1);

    const is_primary = !existingAccounts || existingAccounts.length === 0;

    // Create bank account record (auto-verified in demo mode)
    const { data: bankAccount, error: insertError } = await supabase
      .from('seller_bank_accounts')
      .insert({
        seller_id,
        account_holder_name,
        bank_country,
        account_number,
        routing_number,
        iban,
        account_type,
        is_primary,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create bank account:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create bank account',
      });
    }

    return res.json({
      success: true,
      data: bankAccount,
      message: 'Bank account added successfully',
    });
  } catch (error) {
    console.error('Bank account creation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/seller/bank-accounts
 * Get all bank accounts for seller
 */
router.get('/seller/bank-accounts', verifyToken, requireRole(2), async (req, res) => {
  try {
    const seller_id = req.user.user_id;

    console.log('[PAYMENT] Fetching bank accounts for seller:', seller_id);

    const { data: accounts, error: fetchError } = await supabase
      .from('seller_bank_accounts')
      .select('*')
      .eq('seller_id', seller_id);

    if (fetchError) {
      console.error('[PAYMENT] Supabase fetch error:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch bank accounts',
        details: fetchError.message,
      });
    }

    console.log('[PAYMENT] Found', accounts?.length || 0, 'bank accounts');

    return res.json({
      success: true,
      data: accounts || [],
    });
  } catch (error) {
    console.error('[PAYMENT] Bank accounts fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/seller/bank-accounts/:account_id
 * Delete a bank account
 */
router.delete('/seller/bank-accounts/:account_id', verifyToken, requireRole(2), async (req, res) => {
  try {
    const seller_id = req.user.user_id;
    const { account_id } = req.params;

    // Verify account belongs to seller
    const { data: account, error: fetchError } = await supabase
      .from('seller_bank_accounts')
      .select('*')
      .eq('id', account_id)
      .eq('seller_id', seller_id)
      .single();

    if (fetchError || !account) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found',
      });
    }

    // Delete account
    const { error: deleteError } = await supabase
      .from('seller_bank_accounts')
      .delete()
      .eq('id', account_id);

    if (deleteError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete bank account',
      });
    }

    // If deleted account was primary, set new primary
    if (account.is_primary) {
      const { data: nextAccount } = await supabase
        .from('seller_bank_accounts')
        .select('id')
        .eq('seller_id', seller_id)
        .limit(1);

      if (nextAccount && nextAccount.length > 0) {
        await supabase
          .from('seller_bank_accounts')
          .update({ is_primary: true })
          .eq('id', nextAccount[0].id);
      }
    }

    return res.json({
      success: true,
      message: 'Bank account deleted',
    });
  } catch (error) {
    console.error('Bank account deletion error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/seller/payout-request
 * Create a withdrawal request (auto-completes in 2 seconds in demo mode)
 */
router.post('/seller/payout-request', verifyToken, requireRole(2), async (req, res) => {
  try {
    const seller_id = req.user.user_id;
    const { bank_account_id, amount, currency = 'USD' } = req.body;

    // Validate inputs
    if (!bank_account_id || !amount) {
      return res.status(400).json({
        success: false,
        error: 'bank_account_id and amount are required',
      });
    }

    if (amount < MIN_PAYOUT_AMOUNT) {
      return res.status(400).json({
        success: false,
        error: `Minimum payout amount is $${MIN_PAYOUT_AMOUNT}`,
      });
    }

    // Verify bank account belongs to seller
    const { data: bankAccount, error: accountError } = await supabase
      .from('seller_bank_accounts')
      .select('*')
      .eq('id', bank_account_id)
      .eq('seller_id', seller_id)
      .single();

    if (accountError || !bankAccount) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found',
      });
    }

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('seller_wallets')
      .select('*')
      .eq('seller_id', seller_id)
      .single();

    if (walletError || !wallet) {
      return res.status(400).json({
        success: false,
        error: 'Seller wallet not found',
      });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: $${wallet.balance}`,
      });
    }

    // Create payout request
    const { data: payoutRequest, error: payoutError } = await supabase
      .from('seller_payout_requests')
      .insert({
        seller_id,
        bank_account_id,
        amount,
        currency,
        status: 'pending',
        net_amount: amount, // Same as amount for now (no processing fee in demo)
      })
      .select()
      .single();

    if (payoutError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create payout request',
      });
    }

    // Deduct from wallet immediately
    const newBalance = wallet.balance - amount;
    await supabase
      .from('seller_wallets')
      .update({
        balance: newBalance,
        total_withdrawn: wallet.total_withdrawn + amount,
      })
      .eq('seller_id', seller_id);

    // Log wallet transaction
    await supabase
      .from('wallet_transactions')
      .insert({
        seller_id,
        transaction_type: 'debit',
        amount: -amount,
        balance_after: newBalance,
        related_stripe_transaction_id: payoutRequest.id,
        description: 'Withdrawal request',
        reference_id: payoutRequest.id,
      });

    console.log('[DEMO] Payout request created. Auto-completing in 2 seconds...');

    // Auto-complete payout in 2 seconds (demo mode only)
    setTimeout(async () => {
      try {
        // Update payout status to completed
        await supabase
          .from('seller_payout_requests')
          .update({
            status: 'completed',
            processed_date: new Date().toISOString(),
          })
          .eq('id', payoutRequest.id);

        console.log('[DEMO] Payout request auto-completed:', payoutRequest.id);
      } catch (error) {
        console.error('[DEMO] Error auto-completing payout:', error);
      }
    }, 2000);

    return res.json({
      success: true,
      data: payoutRequest,
      message: 'Payout request created successfully (auto-completes in demo mode)',
    });
  } catch (error) {
    console.error('Payout request error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/seller/payout-requests
 * Get seller payout requests history
 */
router.get('/seller/payout-requests', verifyToken, requireRole(2), async (req, res) => {
  try {
    const seller_id = req.user.user_id;
    const page = parseInt(req.query.page || '0');
    const limit = parseInt(req.query.limit || '20');
    const offset = page * limit;

    // Count total requests
    const { count, error: countError } = await supabase
      .from('seller_payout_requests')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', seller_id);

    if (countError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch payout request count',
      });
    }

    // Fetch requests with bank account details
    const { data: requests, error: fetchError } = await supabase
      .from('seller_payout_requests')
      .select(`
        *,
        seller_bank_accounts (
          id,
          account_holder_name,
          iban,
          account_number
        )
      `)
      .eq('seller_id', seller_id)
      .order('request_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch payout requests',
      });
    }

    return res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    console.error('Payout requests fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
