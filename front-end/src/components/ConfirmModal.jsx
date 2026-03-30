/**
 * Reusable confirmation modal for destructive actions.
 * Updated with premium dark UI tokens and refined typography.
 */
import Modal from './Modal';

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
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5 opacity-80 ${variant === 'danger' ? 'bg-red-500/10 text-red-400' : 'bg-[#ffd700]/10 text-[#ffd700]'}`}>
          <span className="text-xl">{variant === 'danger' ? '⚠️' : '🎯'}</span>
        </div>
        
        <h3 className={`text-lg font-bold tracking-tight mb-2 text-white/95`}>
          {title}
        </h3>
        {message && <p className="text-white/40 text-[13px] leading-relaxed mb-8 px-2">{message}</p>}
        
        <div className="flex flex-col sm:flex-row-reverse gap-3 justify-center">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3 px-6 rounded-2xl text-[13px] font-bold tracking-wide transition-all duration-200 active:scale-[0.97]
              ${variant === 'danger' 
                ? 'bg-red-500/90 text-white hover:bg-red-500 shadow-xl shadow-red-500/10' 
                : 'bg-[#ffd700] text-[#050505] hover:bg-[#fff6a0] shadow-xl shadow-[#ffd700]/5'
              } 
              disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2`}
          >
            {loading && (
              <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
            {loading ? 'PROCESSING...' : confirmText.toUpperCase()}
          </button>
          
          <button
            onClick={onClose}
            className="flex-1 py-3 px-6 border border-white/10 hover:border-white/20 hover:bg-white/5 text-white/60 hover:text-white rounded-2xl transition-all duration-200 text-[13px] font-bold active:scale-[0.97]"
            disabled={loading}
          >
            {cancelText.toUpperCase()}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
