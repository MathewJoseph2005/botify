/**
 * Reusable modal overlay component.
 * Redesigned for premium glassmorphic dark theme.
 */
const Modal = ({ onClose, children, maxWidth = 'max-w-md' }) => (
  <div
    className="fixed inset-0 bg-[#050505]/70 backdrop-blur-md z-[60] flex items-center justify-center p-6 animate-fadeIn"
    onClick={onClose}
  >
    <style>{`
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      .modal-content {
        background: rgba(15, 15, 15, 0.85);
        backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.5), 0 0 100px rgba(0, 0, 0, 0.2);
        animation: modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
    `}</style>
    <div
      className={`modal-content relative rounded-3xl overflow-hidden ${maxWidth} w-full p-8`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#ffd700]/30 to-transparent" />
      {children}
    </div>
  </div>
);

export default Modal;
