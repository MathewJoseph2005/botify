import React, { useState } from 'react';
import { paymentsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function DemoCheckoutModal({ bot, isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const [step, setStep] = useState('confirm'); // confirm, payment, processing, success, error
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [error, setError] = useState('');
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(false);

  // Format card number with spaces
  const formatCardNumber = (value) => {
    return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
  };

  // Format expiry
  const formatExpiry = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const handleCreateCheckout = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await paymentsAPI.createCheckoutSession({
        marketplace_bot_id: bot.id,
        quantity: 1,
      });

      if (response.data.success) {
        setPurchase(response.data.data);
        setStep('payment');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create checkout session');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!cardNumber || !expiry || !cvc) {
      setError('Please fill all card details');
      return;
    }

    if (cardNumber.replace(/\s/g, '').length !== 16) {
      setError('Card number must be 16 digits');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setStep('processing');

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const response = await paymentsAPI.confirmDemoPayment({
        marketplace_bot_id: bot.id,
        cardNumber: cardNumber.replace(/\s/g, ''),
        expiryDate: expiry,
        cvc,
      });

      if (response.data.success) {
        setPurchase(prev => ({
          ...prev,
          ...response.data.data,
        }));
        setStep('success');
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setCardNumber('');
    setExpiry('');
    setCvc('');
    setError('');
    setPurchase(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-lg text-black">
          <h2 className="text-xl font-bold">
            {step === 'success' ? '✅ Payment Successful' : `Checkout - ${bot.name}`}
          </h2>
        </div>

        <div className="p-6">
          {/* Confirm Step */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{bot.name}</h3>
                    <p className="text-sm text-gray-600">{bot.description}</p>
                  </div>
                  {bot.image_url && (
                    <img src={bot.image_url} alt={bot.name} className="w-12 h-12 rounded" />
                  )}
                </div>

                <div className="borderb-t pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bot Price:</span>
                    <span className="font-semibold">${bot.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>Platform Fee (5%):</span>
                    <span>${(bot.price * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-bold text-gray-900">
                    <span>Total:</span>
                    <span>${bot.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>🎮 DEMO MODE:</strong> This is a demo payment. Use any card number.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleCreateCheckout}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
                >
                  {loading ? 'Creating Session...' : 'Continue to Payment'}
                </button>
                <button
                  onClick={handleClose}
                  className="w-full border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Payment Step */}
          {step === 'payment' && (
            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  value={formatCardNumber(cardNumber)}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                  placeholder="4242 4242 4242 4242"
                  maxLength="19"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black caret-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Use: 4242... (success) or ...0002 (decline)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry (MM/YY)
                  </label>
                  <input
                    type="text"
                    value={formatExpiry(expiry)}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="12/25"
                    maxLength="5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black caret-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CVC
                  </label>
                  <input
                    type="text"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="123"
                    maxLength="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black caret-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
                >
                  {loading ? 'Processing...' : `Pay $${bot.price.toFixed(2)}`}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('confirm')}
                  className="w-full border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="animate-spin">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full"></div>
              </div>
              <p className="text-gray-600 text-center">Processing your payment...</p>
              <p className="text-xs text-gray-500">Please wait, this may take a few seconds</p>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-4">
              <div className="text-5xl">✅</div>
              <div>
                <p className="text-lg font-bold text-gray-900">Payment Successful!</p>
                <p className="text-sm text-gray-600 mt-2">
                  ${purchase?.amountCredited?.toFixed(2)} has been added to the seller's wallet
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                <p>
                  <strong>Transaction ID:</strong> {purchase?.purchaseId}
                </p>
                <p className="text-xs mt-1">Closing in 3 seconds...</p>
              </div>
            </div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="text-center py-6 space-y-4">
              <div className="text-5xl">❌</div>
              <div>
                <p className="text-lg font-bold text-gray-900">Payment Failed</p>
                <p className="text-sm text-red-600 mt-2">{error}</p>
              </div>
              <button
                onClick={() => setStep('payment')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
