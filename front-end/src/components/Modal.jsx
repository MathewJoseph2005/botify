/**
 * Reusable modal overlay component.
 *
 * @param {Function}       onClose   – Called when the backdrop is clicked
 * @param {React.ReactNode} children – Modal body content
 * @param {string}         [maxWidth] – Tailwind max-width class (default: 'max-w-md')
 */
const Modal = ({ onClose, children, maxWidth = 'max-w-md' }) => (
  <div
    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className={`bg-white rounded-xl shadow-xl ${maxWidth} w-full p-6`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

export default Modal;
