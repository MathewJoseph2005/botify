import React, { useState } from 'react';
import { paymentsAPI } from '../utils/api';

export default function BankAccountForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    account_holder_name: '',
    bank_country: 'US',
    account_number: '',
    routing_number: '',
    iban: '',
    account_type: 'checking',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useIBAN, setUseIBAN] = useState(false);

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
    if (!formData.account_holder_name || !formData.bank_country) {
      setError('Name and country are required');
      return;
    }

    if (useIBAN && !formData.iban) {
      setError('IBAN is required');
      return;
    }

    if (!useIBAN && !formData.account_number) {
      setError('Account number is required');
      return;
    }

    if (!useIBAN && !formData.routing_number) {
      setError('Routing number is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        account_holder_name: formData.account_holder_name,
        bank_country: formData.bank_country,
        account_type: formData.account_type,
      };

      if (useIBAN) {
        payload.iban = formData.iban;
      } else {
        payload.account_number = formData.account_number;
        payload.routing_number = formData.routing_number;
      }

      const response = await paymentsAPI.addBankAccount(payload);

      if (response.data.success) {
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add bank account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Bank Account</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Holder Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Holder Name *
          </label>
          <input
            type="text"
            name="account_holder_name"
            value={formData.account_holder_name}
            onChange={handleChange}
            placeholder="John Doe"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Bank Country */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Country *
          </label>
          <select
            name="bank_country"
            value={formData.bank_country}
            onChange={(e) => {
              handleChange(e);
              setUseIBAN(e.target.value !== 'US');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="US">🇺🇸 United States</option>
            <option value="UK">🇬🇧 United Kingdom</option>
            <option value="CA">🇨🇦 Canada</option>
            <option value="AU">🇦🇺 Australia</option>
            <option value="DE">🇩🇪 Germany</option>
            <option value="FR">🇫🇷 France</option>
            <option value="ES">🇪🇸 Spain</option>
            <option value="IT">🇮🇹 Italy</option>
            <option value="NL">🇳🇱 Netherlands</option>
            <option value="IE">🇮🇪 Ireland</option>
            <option value="SG">🇸🇬 Singapore</option>
            <option value="JP">🇯🇵 Japan</option>
            <option value="IN">🇮🇳 India</option>
            <option value="MX">🇲🇽 Mexico</option>
            <option value="BR">🇧🇷 Brazil</option>
          </select>
        </div>

        {/* Account Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Type
          </label>
          <select
            name="account_type"
            value={formData.account_type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="iban">IBAN</option>
          </select>
        </div>

        {/* Account Details (IBAN or Account Number) */}
        {useIBAN || formData.bank_country !== 'US' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IBAN *
            </label>
            <input
              type="text"
              name="iban"
              value={formData.iban}
              onChange={handleChange}
              placeholder="DE89370400440532013000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: DE89 3704 0044 0532 0130 00
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number *
              </label>
              <input
                type="text"
                name="account_number"
                value={formData.account_number}
                onChange={handleChange}
                placeholder="123456789012"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Routing Number *
              </label>
              <input
                type="text"
                name="routing_number"
                value={formData.routing_number}
                onChange={handleChange}
                placeholder="021000021"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                ABA/Routing Number (9 digits)
              </p>
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
          >
            {loading ? 'Adding...' : 'Add Account'}
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
          🔒 Your bank details are stored securely and encrypted
        </p>
      </form>
    </div>
  );
}
