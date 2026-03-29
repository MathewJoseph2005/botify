-- Migration: Wallet System Tables (Seller Wallets, Transactions, Bank Accounts, Payouts)
-- This migration adds tables needed for the demo payment system

-- Create seller_wallets table
CREATE TABLE IF NOT EXISTS seller_wallets (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL UNIQUE,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_earned DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_withdrawn DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'credit', 'debit', 'withdrawal', 'refund'
    amount DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    description TEXT,
    related_stripe_transaction_id VARCHAR(255),
    reference_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create stripe_transactions table (for audit trail)
CREATE TABLE IF NOT EXISTS stripe_transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_type VARCHAR(50) NOT NULL, -- 'charge', 'refund', 'payout'
    stripe_id VARCHAR(255) UNIQUE,
    buyer_id BIGINT,
    seller_id BIGINT,
    marketplace_bot_id BIGINT,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    stripe_fee DECIMAL(12, 2) DEFAULT 0.00,
    net_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'succeeded', 'failed'
    description TEXT,
    metadata TEXT, -- JSON stored as text
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (marketplace_bot_id) REFERENCES marketplace_bots(id) ON DELETE SET NULL
);

-- Create seller_bank_accounts table
CREATE TABLE IF NOT EXISTS seller_bank_accounts (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    bank_country VARCHAR(2) NOT NULL, -- ISO country code
    account_number VARCHAR(50),
    routing_number VARCHAR(50),
    iban VARCHAR(50),
    account_type VARCHAR(50) DEFAULT 'checking', -- 'checking', 'savings', 'business'
    is_primary BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50) DEFAULT 'verified', -- For demo, auto-verified
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_bank_account_details CHECK (
        (account_number IS NOT NULL AND routing_number IS NOT NULL) OR iban IS NOT NULL
    )
);

-- Create seller_payout_requests table
CREATE TABLE IF NOT EXISTS seller_payout_requests (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL,
    bank_account_id BIGINT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processing_fee DECIMAL(12, 2) DEFAULT 0.00,
    net_amount DECIMAL(12, 2) NOT NULL,
    request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP WITH TIME ZONE,
    stripe_payout_id VARCHAR(255),
    failure_reason TEXT,
    metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (bank_account_id) REFERENCES seller_bank_accounts(id) ON DELETE RESTRICT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_seller_wallets_seller ON seller_wallets(seller_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_seller ON wallet_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_date ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_buyer ON stripe_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_seller ON stripe_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_status ON stripe_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_seller ON seller_bank_accounts(seller_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_primary ON seller_bank_accounts(seller_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_payout_requests_seller ON seller_payout_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON seller_payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_date ON seller_payout_requests(request_date DESC);

-- Enable Row Level Security
ALTER TABLE seller_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_payout_requests ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON seller_wallets, wallet_transactions, stripe_transactions, seller_bank_accounts, seller_payout_requests TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
