import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function LogoTipPopup({ onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  const handleGotItClick = () => {
    setIsVisible(false);
    if (onClose) onClose();
    
    // Store in localStorage that this tip has been shown
    try {
      localStorage.setItem('logo_tip_shown', 'true');
    } catch (e) {
      // Handle localStorage errors silently
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-gray-900 text-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl border border-gray-800">
        <h3 className="text-xl font-bold text-center mb-4">Quick Tip</h3>
        
        <div className="flex flex-col items-center justify-center mb-4">
          <div className="relative w-24 h-24 mb-2">
            <Image 
              src="/images/logo1.png" 
              alt="The Rug Game Logo" 
              width={96} 
              height={96}
              className="animate-pulse"
            />
          </div>
          
          <p className="text-center">
            Click our logo anytime to return to the home page.
          </p>
        </div>
        
        <button
          onClick={handleGotItClick}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md w-full transition duration-200"
        >
          Got It
        </button>
      </div>
    </div>
  );
}