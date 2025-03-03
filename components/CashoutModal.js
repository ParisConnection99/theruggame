'use client';
import { useState } from 'react';
import { useAnalytics } from '@/components/FirebaseProvider';

export default function CashoutModal({ isOpen, onClose, onSubmit, maxAmount, defaultWallet = "" }) {
  const [walletAddress, setWalletAddress] = useState(defaultWallet);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const analytics = useAnalytics();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    const amountNum = parseFloat(amount);
    if (!walletAddress.trim()) {
      setError("Wallet address cannot be empty");
      return;
    }
    
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    
    if (amountNum > maxAmount) {
      setError(`Amount cannot exceed your balance of ${maxAmount} SOL`);
      return;
    }
    
    try {
      setLoading(true);
      await onSubmit({
        walletAddress: walletAddress.trim(),
        amount: amountNum
      });
      onClose();
    } catch (error) {
      setError(error.message || "Failed to process cashout");
      analytics().logEvent('cashout_modal_error', {
        error_message: error.message,
        error_code: error.code || 'unknown',
        error_stack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-lg">
        <h3 className="text-lg font-bold mb-4 text-center">Cash Out</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="wallet" className="block text-sm font-medium mb-1">
              Destination Wallet Address
            </label>
            <input
              type="text"
              id="wallet"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter wallet address"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="amount" className="block text-sm font-medium mb-1">
              Amount (SOL)
            </label>
            <div className="relative">
              <input
                type="text"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              <div className="absolute right-3 top-2 text-gray-400">
                <button 
                  type="button" 
                  onClick={() => setAmount(maxAmount.toString())}
                  className="text-xs bg-gray-600 px-2 py-1 rounded hover:bg-gray-500"
                >
                  MAX
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Available balance: {maxAmount} SOL
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          
          <div className="bg-yellow-800 bg-opacity-30 rounded border border-yellow-700 p-3 mb-4">
            <p className="text-yellow-300 text-sm">
              Note: Cashout processing may take up to 5 hours. A 1% fee applies to all withdrawals.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded bg-green-600 hover:bg-green-500 text-white"
              disabled={loading}
            >
              {loading ? "Processing..." : "Confirm Cashout"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}