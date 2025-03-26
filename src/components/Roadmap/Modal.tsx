/* ------------------------------------------------------------------
   5) A Simple Modal
   ------------------------------------------------------------------ */

import { useEffect, useState } from 'react';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ onClose, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className={`fixed inset-0 z-50 bg-black bg-opacity-40 flex justify-end transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div
        className={`relative bg-white shadow-lg w-full max-w-screen transition-transform duration-300 transform ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
        <div className="p-4 overflow-y-auto max-h-screen">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
