# Demo Payment System - Quick Start

## 🚀 What's New

You now have a **complete demo payment system** with:
- ✅ Demo checkout modal for buyers
- ✅ Seller wallet with transaction history
- ✅ Bank account management
- ✅ Withdrawal request system (auto-completes in 2 sec)
- ✅ No real Stripe keys needed
- ✅ All fees calculated and tracked

---

## ⚡ Quick Start (5 minutes)

### 1. Start Backend & Frontend
```bash
# Terminal 1 - Backend
cd back-end
npm run dev

# Terminal 2 - Frontend  
cd front-end
npm run dev
```

### 2. Create a Test Seller Account
1. Go to http://localhost:3000
2. Click "Sign Up"
3. Fill in details:
   - Name: "Test Seller"
   - Email: seller@test.com
   - Password: anything
   - **Role: Select "Seller"**
4. Click Sign Up
5. You're now logged in as a Seller

### 3. Create a Bot to Sell
1. From Seller Dashboard, click **"+ Create Email Bot"**
2. Fill in bot details (name, subject line, message template)
3. Click "Create Bot"
4. Go to **"Create Marketplace Bot"** to list it for sale
5. Fill in:
   - Bot Name: "My First Bot"
   - Price: **$50.00** (important for testing)
   - Description: "A test bot"
6. Click "Create Listing"
7. Your bot is now on marketplace!

### 4. Switch to Buyer (New Incognito Tab)
1. Open Incognito/Private window
2. Go to http://localhost:3000
3. Sign Up as Buyer:
   - Name: "Test Buyer"
   - Email: buyer@test.com
   - Password: anything
   - **Role: Select "Buyer"**

### 5. Buy the Bot
1. Go to **Marketplace**
2. Find your bot from "Test Seller"
3. Click **"Buy Now"**
4. Demo checkout modal appears
5. Enter any 16-digit card number:
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/25`
   - CVC: `123`
6. Click **"Pay $50.00"**
7. Wait 1-2 seconds for processing
8. See ✅ Success message
9. Modal closes automatically

### 6. Back to Seller - Check Wallet
1. Switch back to **Seller** tab
2. Go to **Seller Dashboard**
3. Click **"💰 Wallet & Earnings"** tab
4. You should see:
   - **Current Balance**: $47.50 (after 5% platform fee)
   - **Total Earned**: $47.50
   - **Recent Transaction**: Credit $47.50 "Bot sale payment"

### 7. Test Withdrawal
1. Still on Wallet tab
2. Click **"🏦 Bank Accounts"** tab
3. Click **"+ Add Bank Account"**
4. Fill in:
   - Account Holder: "John Doe"
   - Country: "United States"
   - Account Number: `123456789012`
   - Routing Number: `021000021`
5. Click "Add Account"
6. Click **"💸 Withdrawals"** tab
7. Click **"+ Request Withdrawal"**
8. Fill in:
   - Withdraw To: Select the account you just added
   - Amount: $47.50 (or any amount up to balance)
9. Click **"Request Withdrawal"**
10. See status change from ⏳ **Pending** to ✅ **Completed** (auto in 2 sec)
11. Balance becomes $0
12. Check transaction history - shows **Debit** for withdrawal

---

## 📊 Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **DemoCheckoutModal** | `src/components/DemoCheckoutModal.jsx` | Card input + payment simulation |
| **SellerWalletDashboard** | `src/components/SellerWalletDashboard.jsx` | Wallet overview + tabs |
| **BankAccountForm** | `src/components/BankAccountForm.jsx` | Add/manage bank accounts |
| **WithdrawalRequestForm** | `src/components/WithdrawalRequestForm.jsx` | Request money |
| **payment.js routes** | `back-end/routes/payment.js` | All payment API endpoints |

---

## 🎯 Test Cases to Try

### ✅ Success Path
- [ ] Create seller account
- [ ] List bot on marketplace
- [ ] Buy bot as buyer
- [ ] See wallet credited
- [ ] Add bank account
- [ ] Request withdrawal
- [ ] See withdrawal completed

### ❌ Error Path
- [ ] Try buying bot with card ending in `0002` (should decline)
- [ ] Try withdrawing with insufficient balance (should error)
- [ ] Try adding withdrawal without bank account (should block)
- [ ] Delete bank account and verify next account becomes Primary

### 💰 Multiple Transactions
- [ ] Make 2-3 purchases as different buyers
- [ ] Verify seller wallet balance accumulates correctly
- [ ] Verify transaction history shows all transactions
- [ ] Request partial withdrawal

---

## 🔧 Important Notes

### Demo Cards
- ✅ **Works**: `4242 4242 4242 4242`
- ❌ **Declines**: `4242 4242 4242 0002` (ends in 0002)

### Minimum Amounts
- Minimum withdrawal: **$100** (configurable in .env)

### No Real Charges
- This is **complete demo mode**
- No real money changes hands
- No Stripe account needed
- Perfect for development/testing

### Frontend/Backend Sync
- Changes should be instant
- If wallet doesn't update, refresh browser
- Check browser console for any errors
- Check backend terminal for API call logs

---

## 📱 Testing Tips

### Tip 1: Use Incognito Windows
- Seller in Chrome normal window
- Buyer in Chrome incognito window
- Easy to switch between roles

### Tip 2: Watch Console Logs
- Backend prints demo events: `[DEMO] Payment processed`
- Frontend shows all API responses
- Helps debug any issues

### Tip 3: Multiple Sellers/Buyers
Sign up several times:
- seller1@test.com
- seller2@test.com
- buyer1@test.com
- buyer2@test.com

Test cross-seller purchases.

### Tip 4: Mobile Testing
- Demo checkout is mobile-friendly
- Test on phone for responsive design verification

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Wallet not showing?" | Refresh page, must be logged in as Seller |
| "Purchase button disabled?" | Try different test card or check backend logs |
| "Withdrawal not processing?" | Minimum $100, must have bank account, balance must be sufficient |
| "Backend won't start?" | Check `npm install stripe` was successful |
| "API 404 errors?" | Verify routes registered in backend server.js |

---

## 📝 Demo Database Schema

### seller_wallets
- seller_id: User ID
- balance: Current spendable amount
- total_earned: All-time earnings
- total_withdrawn: All-time withdrawals

### wallet_transactions
- seller_id: Which seller
- transaction_type: 'credit', 'debit', 'pending'
- amount: How much (with sign)
- description: "Bot sale", "Withdrawal", etc.
- balance_after: For audit trail

### seller_bank_accounts
- seller_id: Which seller
- iban: International bank account
- account_number: US account
- is_primary: Default for withdrawals
- is_verified: ✓ (auto in demo)

### stripe_transactions
- transaction_type: 'charge', 'payout'
- stripe_id: Unique ID
- amount: Transaction amount
- status: 'pending', 'succeeded', 'failed'
- metadata: JSON with extra details (marked 'DEMO')

---

## 🎓 Learning Outcomes

After going through this demo, you'll understand:
- ✅ How e-commerce checkout works
- ✅ How seller wallets are managed
- ✅ How bank account verification flows
- ✅ How withdrawal requests process
- ✅ How transaction histories track money
- ✅ How fees are calculated and stored
- ✅ Multi-payment handling (multiple sellers/buyers)
- ✅ Demo vs production patterns

---

## 🚀 Next Steps

After comfortable with demo:
1. Read [DEMO_PAYMENT_GUIDE.md](./DEMO_PAYMENT_GUIDE.md) for detailed docs
2. Review API endpoints in [payment.js](./back-end/routes/payment.js)
3. Study database schema in migrations
4. Plan Stripe integration if needed
5. Design additional transaction types (refunds, disputes, etc.)
6. Implement notifications/emails on payment events

---

## 💡 Tips for Production Migration

If converting to real Stripe later:
- Keep same database schema (already designed for Stripe)
- Replace `confirm-demo-payment` with real Stripe webhook
- Add Stripe SDK to frontend
- Implement KYC/verification via Stripe Connect
- Same withdrawal flow but with real bank account verification
- Switch env variables to live keys

---

## Questions?

Check these files for details:
- `DEMO_PAYMENT_GUIDE.md` - Comprehensive feature guide
- `back-end/routes/payment.js` - All endpoint logic
- `front-end/src/components/DemoCheckoutModal.jsx` - Payment UI code
- Backend console logs - Real-time API debugging

**Happy testing! 🎉**
