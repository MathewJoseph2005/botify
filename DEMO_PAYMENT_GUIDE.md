# Demo Payment System - User Guide

## Overview

The Botify marketplace now includes a **complete demo payment system** that simulates real payments without requiring Stripe integration. This allows you to:

✅ **Buyers**: Purchase bots using a demo checkout with test card numbers  
✅ **Sellers**: Receive instant credit to their wallet  
✅ **Sellers**: Manage bank accounts and request withdrawals  
✅ **Demo Mode**: Auto-completes withdrawals to simulate the full payment flow  

---

## How to Use - Step by Step

### 1. Buyer: Purchasing a Bot

#### Step 1a: Browse Marketplace
1. Log in as a **Buyer** (role_id = 3)
2. Go to **Marketplace** page
3. Browse available bots or search/filter by platform

#### Step 1b: Initiate Checkout
1. Click **"Buy Now"** button on any bot card
2. A demo checkout modal appears showing:
   - Bot details (name, description, image)
   - Price breakdown
   - Total amount to pay

#### Step 1c: Complete Payment
1. Fill in demo card details:
   - **Card Number**: Use any 16-digit number (e.g., `4242 4242 4242 4242`)
   - **Expiry**: Any future date (e.g., `12/25`)
   - **CVC**: Any 3 digits (e.g., `123`)
2. Click **"Pay $[amount]"** button
3. Wait for "Processing your payment..." (1-2 seconds)
4. See success message ✅
5. Modal auto-closes and refreshes marketplace

#### Special Case: Test Card Decline
- Use card ending in **0002** (e.g., `4242 4242 4242 0002`) to simulate a declined payment
- You'll see error message but can retry with a valid test card

#### Result
- Payment shows as "succeeded" in wallet transactions (seller side)
- Seller's wallet immediately credited with funds minus platform fee
- Buyer can see purchase in their dashboard (future phase)

---

### 2. Seller: Managing Wallet & Withdrawals

#### Step 2a: View Wallet Dashboard
1. Log in as a **Seller** (role_id = 2)
2. Go to **Seller Dashboard**
3. Click **"💰 Wallet & Earnings"** tab
4. See three stat cards:
   - **Current Balance** ($0.00 when starting)
   - **Total Earned** (sum of all sales)
   - **Total Withdrawn** (sum of completed payouts)

#### Step 2b: View Recent Transactions
- **Recent Transactions** section shows last 10 transactions
- Each transaction shows:
  - Transaction type (Credit/Debit/Pending)
  - Description (e.g., "Bot sale payment")
  - Timestamp
  - Amount and balance after transaction

#### Step 2c: Add Bank Account
1. Click **"🏦 Bank Accounts"** tab
2. Click **"+ Add Bank Account"** button
3. Fill in form:
   - **Account Holder Name** (your name)
   - **Bank Country** (dropdown with country selection)
   - **Account Type** (Checking/Savings/IBAN)
   - For **US banks**:
     - Account Number (12 digits)
     - Routing Number (9 digits, ABA code)
   - For **Non-US banks**:
     - IBAN (International Bank Account Number)
4. Click **"Add Account"** button
5. Account immediately shows in list (marked as Primary if first account)
6. Status shows as "✓ Verified" (auto-verified in demo mode)

#### Step 2d: Request Withdrawal
1. Click **"💸 Withdrawals"** tab
2. Click **"+ Request Withdrawal"** button
3. Form shows:
   - **Available Balance** (in green card)
   - **Withdraw To** (dropdown - select from added bank accounts)
   - Account details confirmation box
4. Fill in:
   - **Amount to Withdraw** ($100 minimum, max available balance)
   - **Currency** (USD, EUR, GBP, CAD, AUD)
5. Review withdrawal summary (shows 2-3 business days processing time)
6. Click **"Request Withdrawal"** button
7. Status changes to "⏳ Pending"
8. **Auto-completes after 2 seconds** (demo behavior)
9. Status shows "✅ Completed"
10. Transaction appears in balance and transaction history

#### Important Notes
- Minimum withdrawal: **$100**
- Each seller automatically gets a wallet on signup
- Bank accounts can be added anytime
- First bank account is automatically set as Primary
- Multiple bank accounts supported (ideal for multiple currencies/countries)

---

## Demo Mode Behavior

### Key Differences from Production

| Feature | Demo Mode | Production |
|---------|-----------|-----------|
| Card Processing | Any card number works | Real Stripe validation |
| Payment Timing | Instant | 2-5 seconds |
| Withdrawal Processing | Auto-complete in 2 sec | 2-3 business days |
| Bank Verification | Auto-verified | Requires Stripe Connect |
| Fees | Applied (5% platform) | Applied (5% + Stripe fees 2.9%+$0.30) |
| Test Cards | All numbers valid | Only specific test cards |
| Failure | Card ending 0002 only | Multiple reasons (insufficient funds, etc.) |
| Data Persistence | Saved in database | Saved in database |

---

## Testing Scenarios

### Scenario 1: Complete Purchase Flow
1. **Seller A** creates a bot and lists on marketplace ($50)
2. **Buyer B** purchases using checkout modal
3. **Seller A's** wallet credited with $47.50 ($50 - 5% platform fee)
4. **Seller A** sees transaction in wallet (Credit: $47.50)
5. **Seller A** requests $50 withdrawal
6. Withdrawal auto-completes and Seller A balance drops to -$2.50... wait that's wrong.

Actually, let me recalculate: If seller earned $47.50 and then requests $50 withdrawal, that would fail because balance is only $47.50. The form should prevent this. Let me test this scenario properly:

### Scenario 1: Complete Purchase Flow (Corrected)
1. **Seller A** creates a bot ($50)
2. **Buyer B** purchases bot
3. **Seller A's** wallet: +$47.50 (shows in transaction history)
4. **Seller A** adds bank account
5. **Seller A** requests $47.50 withdrawal
6. Withdrawal completed, balance → $0
7. Can't request more withdrawals until next sale

### Scenario 2: Multiple Purchases Building Up Balance
1. **Buyer B** purchases bot #1 ($50) → Seller A balance: $47.50
2. **Buyer C** purchases bot #2 ($75) → Seller A balance: $97.25 ($47.50 + $71.25 after fee)
3. **Seller A** withdraws $97.25 → Balance: $0

### Scenario 3: Declined Payment
1. **Buyer** tries to purchase with test card `4242424242420002`
2. System shows error: "Demo payment declined"
3. Can retry with valid card number

### Scenario 4: Bank Account Management
1. **Seller** adds US bank account
2. System shows account as Primary (first one)
3. **Seller** adds EUR IBAN account
4. **Seller** requests withdrawal to EUR account (multi-currency support)
5. **Seller** deletes US account
6. EUR account becomes Primary

---

## API Endpoints Used

### Buyer Endpoints
- `POST /api/payments/create-checkout-session` - Create demo checkout
- `POST /api/payments/confirm-demo-payment` - Confirm payment (demo card validation)

### Seller Endpoints
- `GET /api/seller/wallet` - Get wallet balance & recent transactions
- `GET /api/seller/wallet/transactions` - Paginated transaction history
- `GET /api/seller/bank-accounts` - List all bank accounts
- `POST /api/seller/bank-accounts` - Add new bank account
- `DELETE /api/seller/bank-accounts/:id` - Delete bank account
- `POST /api/seller/payout-request` - Create withdrawal request
- `GET /api/seller/payout-requests` - Get withdrawal history

---

## Demo Card Numbers

These work in demo mode (any expiry future date, any 3-digit CVC):

| Number | Type | Result |
|--------|------|--------|
| 4242 4242 4242 4242 | Visa | ✅ Success |
| 5555 5555 5555 4444 | Mastercard | ✅ Success |
| 3782 822463 10005 | American Express | ✅ Success |
| 4242 4242 4242 0002 | Visa | ❌ Declined (demo error) |

---

## Important Workflow Notes

### Auto-wallet Creation
- When a seller signs up, wallet automatically created with balance: $0

### Fee Calculation
- **Platform Fee**: 5% (default, changeable via env var `STRIPE_PLATFORM_FEE_PERCENTAGE`)
- Example: $100 purchase → Seller receives $95 (after 5% fee)
- In production, additional Stripe fee (2.9% + $0.30) would apply

### Transaction History
- Includes credits from bot sales
- Includes debits from payout requests
- Includes pending payouts (while processing)
- Shows balance after each transaction for audit trail

### Minimum Payout
- Minimum: $100 (changeable via env var `STRIPE_MIN_PAYOUT_AMOUNT`)
- Prevents small frequent withdrawals

### Primary Bank Account
- First account added automatically becomes Primary
- Can be used in forms as default selection
- If deleted, next account becomes Primary automatically

---

## Troubleshooting

### Wallet Not Appearing?
- Refresh the page
- Make sure you're logged in as a Seller (role_id = 2)
- Check browser console for errors

### Can't Request Withdrawal?
- Balance must be ≥ $100
- Must have at least one bank account added
- Amount requested can't exceed available balance

### Bank Account Not Showing?
- Refresh page
- Make sure account was successfully added (no error messages)
- Check transaction history to see if debit was applied

###  Payment Failing?
- Try different test card number (not ending in 0002)
- Check card number is 16 digits
- Verify expiry date is in future (MM/YY format)
- Verify CVC is 3 digits

### Withdrawal Still Pending After 5 Seconds?
- Demo auto-completes after 2 seconds
- Refresh page to see completion
- Check transaction history for "Completed" status

---

## Converting to Production (Future)

To switch from demo to real Stripe:

1. Update `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_live_***
   STRIPE_PUBLISHABLE_KEY=pk_live_***
   STRIPE_WEBHOOK_SECRET=whsec_***
   ```

2. Modify `payment.js`:
   - Change `DEMO_MODE = false`
   - Replace demo checkout with real Stripe.js
   - Implement real webhook handling

3. Update frontend:
   - Replace DemoCheckoutModal with Stripe Elements component
   - Add Stripe.js SDK
   - Implement real payment confirmation

4. Database considerations:
   - Migration to Stripe Connect for seller payouts
   - Enhanced KYC verification
   - Real bank account verification workflow

---

## FAQ

**Q: Are payments really happening?**  
A: No, this is demo mode. Payments are simulated but logged to database. Seller wallets are credited with fake demo transactions.

**Q: Can I use real card numbers?**  
A: No, any number works. Never enter real card details. This is for demo/testing only.

**Q: What happens if I close the modal mid-payment?**  
A: Session is cancelled and you can try again. No funds are transferred.

**Q: Can sellers see fake payments?**  
A: Yes, in their wallet transactions they'll see demo payments marked with "DEMO:" prefix.

**Q: How do I test as both buyer and seller?**  
A: Sign up twice with different email addresses - once as Seller, once as Buyer.

**Q: What if I forget minimum withdrawal amount?**  
A: Form tells you "$100 minimum" and won't allow less.

**Q: Can I delete a bank account?**  
A: Yes, click Delete button. Last account becomes Primary if you delete the current one.

---

## Summary

This demo payment system provides a **complete end-to-end workflow** for testing:
- ✅ Bot purchases from buyer perspective
- ✅ Wallet crediting and transaction tracking  
- ✅ Bank account management
- ✅ Withdrawal request processing
- ✅ Fee calculations and ledger tracking

All with realistic UI/UX and database persistence, ready to convert to real Stripe payments.
