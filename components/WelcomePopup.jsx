import { useState } from 'react';

export default function WelcomePopup({ onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  const handleReadyClick = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-gray-900 text-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl border border-gray-800">
        <h2 className="text-2xl font-bold text-center mb-6">how it works</h2>
        
        <p className="text-center mb-6">
          <span>pump allows </span>
          <span className="text-blue-400">anyone</span>
          <span> to create coins. all coins created on Pump are </span>
          <span className="text-green-400">fair-launch</span>
          <span>, meaning everyone has equal access to buy and sell when the coin is first created.</span>
        </p>
        
        <div className="space-y-2 mb-6">
          <p className="text-center"><span className="font-medium">step 1:</span> pick a coin that you like</p>
          <p className="text-center"><span className="font-medium">step 2:</span> buy the coin on the bonding curve</p>
          <p className="text-center"><span className="font-medium">step 3:</span> sell at any time to lock in your profits or losses</p>
        </div>
        
        <p className="text-center text-sm mb-6">
          by clicking this button you agree to the terms and conditions and certify that you are over 18
        </p>
        
        <button 
          onClick={handleReadyClick}
          className="bg-green-400 hover:bg-green-500 text-gray-900 font-medium py-3 px-4 rounded-md w-full transition duration-200"
        >
          I'm ready to pump
        </button>
        
        <div className="text-center text-sm text-gray-500 mt-4">
          <a href="/privacy" className="hover:text-gray-300">privacy policy</a>
          <span className="mx-2">|</span>
          <a href="/terms" className="hover:text-gray-300">terms of service</a>
          <span className="mx-2">|</span>
          <a href="/fees" className="hover:text-gray-300">fees</a>
        </div>
      </div>
    </div>
  );
}