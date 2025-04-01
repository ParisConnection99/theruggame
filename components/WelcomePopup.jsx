import { useState } from 'react';
import Link from 'next/link';

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
                <h2 className="text-2xl font-bold text-center mb-6">Welcome to The Rug Game</h2>

                <p className="text-center mb-6">
                    Predict whether Solana memecoins will <span className="text-green-400">Pump</span> or <span className="text-red-400">Rug</span> before the market closes. Our system tracks liquidity and price changes to determine the outcome.
                </p>

                <div className="space-y-2 mb-6">
                    <p className="text-center"><span className="font-medium">Step 1:</span> Choose an active memecoin market</p>
                    <p className="text-center"><span className="font-medium">Step 2:</span> Predict: Pump or Rug?</p>
                    <p className="text-center"><span className="font-medium">Step 3:</span> Place your bet</p>
                    <p className="text-center"><span className="font-medium">Step 4:</span> Wait for the results and collect if you're right</p>
                </div>

                <p className="text-center text-sm mb-6">
                    Markets typically resolve in 10-30 minutes, so you'll know quickly if you've won!
                </p>

                <button
                    onClick={handleReadyClick}
                    className="bg-green-400 hover:bg-green-500 text-gray-900 font-medium py-3 px-4 rounded-md w-full transition duration-200"
                >
                    Let's Play
                </button>

                <div className="text-center text-sm text-gray-500 mt-4">
                    <Link 
                        href="/docs/privacy-policy" 
                        className="hover:text-gray-300"
                        target="_blank"
                    >
                        Privacy Policy
                    </Link>
                    <span className="mx-2">|</span>
                    <Link 
                        href="/docs/terms-of-service" 
                        className="hover:text-gray-300"
                        target="_blank"
                    >
                        Terms of Service
                    </Link>
                    <span className="mx-2">|</span>
                    <Link 
                        href="/how-it-works" 
                        className="hover:text-gray-300"
                        target="_blank"
                    >
                        How It Works
                    </Link>
                </div>
            </div>
        </div>
    );
}