import React, { useState, useEffect } from 'react';
import { paymentsAPI } from '../utils/api';

export default function WithdrawalRequestForm({ walletBalance, onSuccess, onCancel }) {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [formData, setFormData] = useState({
    bank_account_id: '',
    amount: '',
    currency: 'USD',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const response = await paymentsAPI.getBankAccounts();
      if (response.data.success) {
        setBankAccounts(response.data.data);
        if (response.data.data.length > 0) {
          setFormData((prev) => ({
            ...prev,
            bank_account_id: response.data.data[0].id,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
      setError('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.bank_account_id) {
      setError('Please select a bank account');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (amount < 100) {
      setError('Minimum withdrawal amount is $100');
      return;
    }

    if (amount > walletBalance) {
      setError(`Insufficient balance. Available: $${walletBalance?.toFixed(2)}`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await paymentsAPI.createPayoutRequest({
        bank_account_id: formData.bank_account_id,
        amount,
        currency: formData.currency,
      });

      if (response.data.success) {
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (bankAccounts.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">⚠️ No bank accounts available. Please add a bank account first.</p>
      </div>
    );
  }

  const selectedAccount = bankAccounts.find((acc) => acc.id === formData.bank_account_id);
  const amount = parseFloat(formData.amount) || 0;
  const minAmount = 100;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Withdrawal</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Balance */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Available Balance</p>
          <p className="text-2xl font-bold text-green-600">
            ${walletBalance?.toFixed(2) || '0.00'}
          </p>
        </div>

        {/* Bank Account Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Withdraw To *
          </label>
          <select
            name="bank_account_id"
            value={formData.bank_account_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {bankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_holder_name} - {account.iban || account.account_number}
                {account.is_primary && ' (Primary)'}
              </option>
            ))}
          </select>
        </div>

        {/* Account Details Display */}
        {selectedAccount && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Account Holder</p>
                <p className="font-medium text-gray-900">{selectedAccount.account_holder_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Country</p>
                <p className="font-medium text-gray-900">{selectedAccount.bank_country}</p>
              </div>
              <div>
                <p className="text-gray-600">Account Type</p>
                <p className="font-medium text-gray-900 capitalize">{selectedAccount.account_type}</p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <p className="font-medium text-green-600">✓ Verified</p>
              </div>
            </div>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount to Withdraw *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="500.00"
              min="100"
              step="0.01"
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Minimum: $100 | Maximum: ${walletBalance?.toFixed(2) || '0.00'}
          </p>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="CAD">CAD ($)</option>
            <option value="AUD">AUD ($)</option>
          </select>
        </div>

        {/* Withdrawal Summary */}
        {amount >= minAmount && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Withdrawal Amount:</span>
              <span className="font-medium text-gray-900">${amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-blue-200 pt-2">
              <span className="text-gray-600">Processing Time:</span>
              <span className="font-medium text-gray-900">2-3 business days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium text-blue-600">🟢 Auto-processing (DEMO)</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-xs text-yellow-800">
            <strong>ℹ️ DEMO MODE:</strong> Withdrawals are auto-processed instantly and funds will appear in your wallet transaction history.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={submitting || amount < minAmount}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
          >
            {submitting ? 'Processing...' : 'Request Withdrawal'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          💰 Funds will be transferred to your bank account
        </p>
      </form>
    </div>
  );
}
