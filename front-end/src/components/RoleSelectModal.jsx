import React from 'react';
import Modal from './Modal';

export default function RoleSelectModal({ isOpen, onSelectRole, isLoading = false }) {
  if (!isOpen) return null;

  const handleBuyerClick = () => {
    onSelectRole(3); // buyer role_id
  };

  const handleSellerClick = () => {
    onSelectRole(2); // seller role_id
  };

  return (
    <Modal onClose={() => {}} maxWidth="max-w-md">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Choose Your Role</h2>
        <p className="text-gray-600 mb-6">How would you like to use Botify?</p>

        <div className="flex gap-4">
          <button
            onClick={handleBuyerClick}
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            {isLoading ? 'Processing...' : 'Buy Bots'}
          </button>
          <button
            onClick={handleSellerClick}
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            {isLoading ? 'Processing...' : 'Sell Bots'}
          </button>
        </div>

        <p className="text-gray-500 text-sm text-center mt-6">
          You can always change your account type later by contacting support.
        </p>
      </div>
    </Modal>
  );
}
