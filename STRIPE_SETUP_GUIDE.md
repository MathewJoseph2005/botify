# Stripe Integration Setup Guide

## Overview
This guide walks through the complete Stripe integration setup for the Botify payment system.

## Phase 1: Get Stripe API Keys (Required before deployment)

### 1.1 Create a Stripe Account
- Go to https://stripe.com
- Sign up for a new account
- Verify your email address

### 1.2 Get Your API Keys
1. Log in to your Stripe Dashboard: https://dashboard.stripe.com
2. Go to **Developers** → **API Keys**
3. You should see two keys (scroll to see the full keys):
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)

⚠️ **IMPORTANT**: For development, use `pk_test_*` and `sk_test_*` keys. Never use live keys in development.

### 1.3 Get Your Webhook Secret
1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook endpoint: `https://your-domain.com/api/payments/webhook`
4. For local development with ngrok, use: `https://your-ngrok-domain.ngrok-free.dev/api/payments/webhook`
5. Select events to listen for:
   - `charge.succeeded`
   - `charge.failed`
   - `charge.refunded`
   - `payout.paid`
   - `payout.failed`
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_`)

### 1.4 Update Backend .env File
Edit `back-end/.env` and replace the placeholder values:

```env
# Replace these with your actual Stripe keys
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here

# Optional: Platform fee settings (defaults shown)
STRIPE_PLATFORM_FEE_PERCENTAGE=5
STRIPE_MIN_PAYOUT_AMOUNT=100
```

## Phase 2: Execute Database Migration (Required before running backend)

### 2.1 Run Migration via Supabase SQL Editor
1. Log in to your Supabase Project: https://app.supabase.com
2. Go to the **SQL Editor** section
3. Click **New query**
4. Copy the entire contents of `back-end/config/stripe-integration-migration.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for the query to complete successfully

### 2.2 Verify Tables Were Created
In Supabase, go to **Table Editor** and verify these new tables exist:
- `seller_wallets` - Tracks seller account balances
- `seller_bank_accounts` - Stores bank account details for payouts
- `stripe_transactions` - Audit log of all Stripe payments
- `wallet_transactions` - Detailed ledger of wallet movements
- `payout_requests` - Tracks withdrawal requests

Also verify these columns were added to `purchases` table:
- `stripe_payment_id` - Links to Stripe payment
- `payment_status` - pending/succeeded/failed
- `refund_status` - Nil/refunded
- `stripe_session_id` - Links to checkout session

## Phase 3: Restart Backend

```bash
cd back-end
npm run dev
```

The backend will now:
- Accept new payment endpoints on `http://localhost:5000/api/payments/*`
- Auto-create seller wallets during signup (role_id=2)
- Process Stripe webhooks at `/api/payments/webhook`

## Phase 4: Test Stripe Integration (Optional - for development)

### 4.1 Use Stripe Test Card Numbers
In your frontend checkout, use these card numbers:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Auth Required**: 4000 0025 0000 3155

All test cards:
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)

### 4.2 Test the Payment Flow
1. Start frontend dev server: `cd front-end && npm run dev`
2. Start backend dev server: `cd back-end && npm run dev`
3. Start local webhook listener for testing:
   ```bash
   # Install stripe CLI if not already installed
   # https://stripe.com/docs/stripe-cli
   
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```
4. Go to Marketplace page as a Buyer
5. Try purchasing a bot (sellers must have bots listed)
6. Use test card 4242 4242 4242 4242
7. Check seller wallet balance and transaction history

### 4.3 Manual Webhook Testing (if stripe CLI not available)
Use REST client to simulate webhook event:
```bash
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "stripe-signature: t=1614556800,v1=test_signature" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "charge.succeeded",
    "data": {
      "object": {
        "id": "ch_1234567890",
        "amount": 5000,
        "currency": "usd",
        "payment_intent": "pi_1234567890"
      }
    }
  }'
```

## API Endpoints Overview

### Payment Endpoints (Requires Buyer role)
- **POST** `/api/payments/create-checkout-session` - Initiate bot purchase
  - Body: `{ marketplace_bot_id, quantity }`
  - Returns: `{ sessionId, clientSecret, purchaseId }`

### Seller Endpoints (Requires Seller role)
- **GET** `/api/seller/wallet` - Get wallet balance and stats
  - Returns: Wallet object with balance, total_earned, total_withdrawn, recent_transactions

- **GET** `/api/seller/wallet/transactions` - Paginated transaction history
  - Query params: `page`, `limit`
  - Returns: Transactions array with pagination

- **GET** `/api/seller/bank-accounts` - List all bank accounts
  - Returns: Array of bank account objects

- **POST** `/api/seller/bank-accounts` - Add a bank account
  - Body: `{ account_holder_name, bank_country, iban or account_number, routing_number?, account_type }`
  - Returns: Created bank account object

- **DELETE** `/api/seller/bank-accounts/:account_id` - Remove a bank account
  - Returns: Success message

- **POST** `/api/seller/payout-request` - Request withdrawal
  - Body: `{ bank_account_id, amount, currency }`
  - Returns: Created payout request object

- **GET** `/api/seller/payout-requests` - Get withdrawal history
  - Query params: `page`, `limit`
  - Returns: Payout requests with pagination

## Webhook Events Handled

The webhook endpoint (`POST /api/payments/webhook`) handles:

1. **charge.succeeded** → Credit seller wallet, update purchase status
2. **charge.failed** → Mark purchase as failed
3. **checkout.session.completed** → Link Stripe payment to purchase
4. **charge.refunded** → Deduct from seller wallet
5. **payout.paid** → Mark withdrawal as completed
6. **payout.failed** → Return funds to seller wallet

## Fee Structure

- **Stripe Processing Fee**: 2.9% + $0.30 per transaction
- **Platform Fee**: 5% (configurable via `STRIPE_PLATFORM_FEE_PERCENTAGE`)
- **Seller Receives**: Amount - Stripe Fee - Platform Fee

Example: $100 bot purchase
- Stripe Fee: $3.20 (2.9% + $0.30)
- Platform Fee: $5.00 (5%)
- Seller Receives: $91.80

## Troubleshooting

### "STRIPE_SECRET_KEY undefined" Error
- Check that `.env` file exists in `back-end/` directory
- Verify `.env` has `STRIPE_SECRET_KEY=sk_test_*` (not empty or placeholder)
- Restart backend after updating .env

### Webhook Not Being Called
- Verify endpoint URL is correct in Stripe Dashboard
- For local development, use Stripe CLI: `stripe listen --forward-to localhost:5000/api/payments/webhook`
- Check backend logs for webhook processing events
- Verify webhook secret matches in .env

### Payment Shows as Pending Indefinitely
- Check webhook is being called (should see in logs)
- Verify database migration was executed successfully
- Check `purchases` table has `payment_status` column

### Seller Wallet Not Created
- For new sellers, wallet auto-created during signup
- For existing sellers, manually create via:
  ```bash
  # In Supabase SQL Editor:
  INSERT INTO seller_wallets (seller_id, balance, total_earned, total_withdrawn)
  VALUES ('user_id_here', 0, 0, 0);
  ```

## Security Checklist

- [ ] Never commit `.env` file with real Stripe keys to Git
- [ ] Use test keys (`pk_test_*`, `sk_test_*`) in development only
- [ ] Rotate `STRIPE_WEBHOOK_SECRET` immediately if exposed
- [ ] Keep Node.js and dependencies updated (`npm audit fix`)
- [ ] Implement rate limiting on payment endpoints (done in server.js)
- [ ] Validate all amounts on backend (don't trust client)
- [ ] Use HTTPS on production (Stripe requires it)
- [ ] Enable Stripe's 3D Secure for fraud prevention
- [ ] Monitor webhook logs for failures in Stripe Dashboard

## Next Steps

1. ✅ Install Stripe npm package (`npm install stripe`)
2. ✅ Execute database migration (seller_wallets, stripe_transactions, etc.)
3. ✅ Update `.env` with Stripe API keys
4. ✅ Create payment endpoint handlers
5. 🔄 Create frontend checkout page (buyer payment UI)
6. 🔄 Create seller wallet dashboard (balance, transactions, withdrawals)
7. 🔄 Create bank account management form
8. 🔄 Create withdrawal request UI
9. 🔄 Test full payment flow end-to-end
10. 🔄 Deploy to production with live Stripe keys

## Reference Documentation

- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Checkout Session API](https://stripe.com/docs/api/checkout/sessions)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Notifying Sellers About Payments](https://stripe.com/docs/payouts/guide)
