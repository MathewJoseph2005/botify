-- Stripe Integration Migration for Botify
-- Tables for payment processing, seller wallets, and payouts

-- =====================================================================
-- 1. SELLER WALLETS - Track money earned from bot sales
-- =====================================================================
CREATE TABLE IF NOT EXISTS seller_wallets (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL UNIQUE,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    total_earned DECIMAL(12, 2) DEFAULT 0.00,
    total_withdrawn DECIMAL(12, 2) DEFAULT 0.00,
    last_withdrawal_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

-- =====================================================================
-- 2. SELLER BANK ACCOUNTS - Multiple withdrawal accounts per seller
-- =====================================================================
CREATE TABLE IF NOT EXISTS seller_bank_accounts (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL,
    stripe_account_id VARCHAR(255),
    account_holder_name VARCHAR(150) NOT NULL,
    bank_country VARCHAR(2) NOT NULL,
    account_number VARCHAR(50),
    routing_number VARCHAR(20),
    swift_code VARCHAR(20),
    iban VARCHAR(34),
    account_type VARCHAR(20) NOT NULL, -- 'checking', 'savings', 'iban'
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    stripe_verification_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- =====================================================================
-- 3. STRIPE TRANSACTIONS - Track all Stripe payment events
-- =====================================================================
CREATE TABLE IF NOT EXISTS stripe_transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_type VARCHAR(50) NOT NULL, -- 'charge', 'payout', 'refund'
    stripe_id VARCHAR(255) NOT NULL UNIQUE,
    buyer_id BIGINT,
    seller_id BIGINT,
    marketplace_bot_id BIGINT,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    stripe_fee DECIMAL(12, 2) DEFAULT 0.00,
    net_amount DECIMAL(12, 2),
    status VARCHAR(50) NOT NULL, -- 'pending', 'succeeded', 'failed', 'refunded'
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (marketplace_bot_id) REFERENCES marketplace_bots(id) ON DELETE SET NULL
);

-- =====================================================================
-- 4. WALLET TRANSACTIONS - Track all wallet movements (for audit)
-- =====================================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'credit', 'debit', 'pending'
    amount DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2),
    related_stripe_transaction_id VARCHAR(255),
    description TEXT,
    reference_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- =====================================================================
-- 5. PAYOUT REQUESTS - Track seller withdrawal requests
-- =====================================================================
CREATE TABLE IF NOT EXISTS payout_requests (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL,
    bank_account_id BIGINT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    stripe_payout_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    failure_reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (bank_account_id) REFERENCES seller_bank_accounts(id) ON DELETE RESTRICT
);

-- =====================================================================
-- 6. UPDATE PURCHASES TABLE - Add Stripe payment status
-- =====================================================================
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS stripe_payment_id VARCHAR(255);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending'; -- 'pending', 'succeeded', 'failed'
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50);

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_seller_wallets_seller_id ON seller_wallets(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_bank_accounts_seller_id ON seller_bank_accounts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_bank_accounts_primary ON seller_bank_accounts(seller_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_stripe_id ON stripe_transactions(stripe_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_buyer ON stripe_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_seller ON stripe_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_status ON stripe_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_seller ON wallet_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_payout_requests_seller ON payout_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
ALTER TABLE seller_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

COMMIT;
