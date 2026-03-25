/**
 * Reusable confirmation modal for destructive actions.
 *
 * @param {boolean}  open       – Whether the modal is visible
 * @param {Function} onClose    – Called to dismiss the modal
 * @param {Function} onConfirm  – Called when the user confirms the action
 * @param {string}   title      – Modal heading
 * @param {string}   message    – Description / confirmation text
 * @param {string}   [confirmText]  – Label for the confirm button (default: 'Confirm')
 * @param {string}   [cancelText]   – Label for the cancel button (default: 'Cancel')
 * @param {string}   [variant]      – 'danger' | 'success' | 'warning' (default: 'danger')
 * @param {boolean}  [loading]      – Disable buttons while processing
 */
import Modal from './Modal';

const variantClasses = {
  danger:  'bg-red-600 hover:bg-red-700',
  success: 'bg-green-600 hover:bg-green-700',
  warning: 'bg-orange-500 hover:bg-orange-600',
};

const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  if (!open) return null;

  return (
    <Modal onClose={onClose}>
      <h3 className={`text-lg font-semibold mb-2 ${variant === 'danger' ? 'text-red-600' : 'text-gray-900'}`}>
        {title}
      </h3>
      {message && <p className="text-gray-600 mb-6">{message}</p>}
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
          disabled={loading}
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 text-white rounded-lg transition disabled:opacity-50 ${variantClasses[variant] || variantClasses.danger}`}
        >
          {loading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
