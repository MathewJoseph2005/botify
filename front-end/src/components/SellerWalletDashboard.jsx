import React, { useState, useEffect } from 'react';
import { paymentsAPI } from '../utils/api';
import BankAccountForm from './BankAccountForm';
import WithdrawalRequestForm from './WithdrawalRequestForm';

export default function SellerWalletDashboard() {
  const [wallet, setWallet] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview, accounts, withdrawals
  const [showBankForm, setShowBankForm] = useState(false);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);

  useEffect(() => {
    fetchWalletData();
    const interval = setInterval(fetchWalletData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchWalletData = async () => {
    try {
      // Fetch wallet data
      const walletRes = await paymentsAPI.getSellerWallet();
      if (walletRes.data.success) {
        setWallet(walletRes.data.data);
      }

      // Fetch bank accounts (non-blocking)
      try {
        const accountsRes = await paymentsAPI.getBankAccounts();
        if (accountsRes.data.success) {
          setBankAccounts(accountsRes.data.data);
        }
      } catch (err) {
        console.error('Error fetching bank accounts:', err);
        setBankAccounts([]);
      }

      // Fetch payouts (non-blocking)
      try {
        const payoutsRes = await paymentsAPI.getPayoutRequests();
        if (payoutsRes.data.success) {
          setPayoutRequests(payoutsRes.data.data.requests || []);
        }
      } catch (err) {
        console.error('Error fetching payouts:', err);
        setPayoutRequests([]);
      }

      setError('');
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError('Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountAdded = () => {
    setShowBankForm(false);
    fetchWalletData();
  };

  const handleWithdrawalRequested = () => {
    setShowWithdrawalForm(false);
    fetchWalletData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-green-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Seller Wallet</h1>
        <p className="text-gray-600 mt-2">Manage your earnings and withdraw funds</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      {wallet && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Current Balance */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Balance</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  ${wallet.balance?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
            {wallet.balance >= 100 && (
              <button
                onClick={() => setShowWithdrawalForm(true)}
                className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition"
              >
                Request Withdrawal
              </button>
            )}
          </div>

          {/* Total Earned */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earned</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  ${wallet.total_earned?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="text-4xl">📈</div>
            </div>
          </div>

          {/* Total Withdrawn */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Withdrawn</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  ${wallet.total_withdrawn?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="text-4xl">💳</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 Recent Transactions
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'accounts'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          🏦 Bank Accounts ({bankAccounts.length})
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'withdrawals'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          💸 Withdrawals ({payoutRequests.length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && wallet?.recent_transactions && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {wallet.recent_transactions.length > 0 ? (
              wallet.recent_transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 hover:bg-gray-50 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        tx.transaction_type === 'credit'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {tx.transaction_type === 'credit' ? '✅' : '❌'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tx.description}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(tx.created_at).toLocaleDateString()} at{' '}
                        {new Date(tx.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        tx.transaction_type === 'credit'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {tx.transaction_type === 'credit' ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Balance: ${tx.balance_after?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>🤷 No transactions yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bank Accounts Tab */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowBankForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition"
          >
            + Add Bank Account
          </button>

          {showBankForm && (
            <BankAccountForm
              onSuccess={handleAccountAdded}
              onCancel={() => setShowBankForm(false)}
            />
          )}

          {bankAccounts.length > 0 ? (
            <div className="grid gap-4">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {account.account_holder_name}
                        </p>
                        {account.is_primary && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Primary
                          </span>
                        )}
                        {account.is_verified && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {account.iban || account.account_number}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {account.bank_country} • {account.account_type}
                      </p>
                    </div>
                    <button
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                      onClick={async () => {
                        if (window.confirm('Delete this bank account?')) {
                          try {
                            await paymentsAPI.deleteBankAccount(account.id);
                            fetchWalletData();
                          } catch (err) {
                            console.error('Error deleting account:', err);
                          }
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-center">
              <p>⚠️ No bank accounts added yet. Add one to enable withdrawals.</p>
            </div>
          )}
        </div>
      )}

      {/* Withdrawals Tab */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowWithdrawalForm(true)}
            disabled={!wallet || wallet.balance < 100}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-lg transition"
          >
            + Request Withdrawal
          </button>

          {showWithdrawalForm && (
            <WithdrawalRequestForm
              walletBalance={wallet?.balance}
              onSuccess={handleWithdrawalRequested}
              onCancel={() => setShowWithdrawalForm(false)}
            />
          )}

          {payoutRequests.length > 0 ? (
            <div className="grid gap-4">
              {payoutRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          ${request.amount.toFixed(2)}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            request.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : request.status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : request.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {request.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        To: {request.seller_bank_accounts?.[0]?.account_holder_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Requested: {new Date(request.requested_at).toLocaleDateString()}
                        {request.completed_at &&
                          ` • Completed: ${new Date(request.completed_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl">
                        {request.status === 'completed'
                          ? '✅'
                          : request.status === 'processing'
                          ? '⏳'
                          : request.status === 'pending'
                          ? '⏳'
                          : '❌'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 text-gray-600 p-8 rounded-lg text-center">
              <p>📭 No withdrawal requests yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
