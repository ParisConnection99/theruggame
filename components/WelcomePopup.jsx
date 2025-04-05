
import { useState, useEffect } from 'react';
import Link from 'next/link';
import LogoTipPopup from '@/components/LogoTipPopup'; // Import the new component

export default function WelcomePopup({ onClose }) {
    const [isVisible, setIsVisible] = useState(true);
    const [showLogoTip, setShowLogoTip] = useState(false);
    const [isPrivateBrowsing, setIsPrivateBrowsing] = useState(false);

    useEffect(() => {
        // Check for private browsing mode
        const detectPrivateMode = async () => {
            try {
                // Try to use localStorage as a test
                localStorage.setItem('__test__', 'test');
                localStorage.removeItem('__test__');
                setIsPrivateBrowsing(false);
            } catch (e) {
                // If localStorage is unavailable, might be private browsing
                setIsPrivateBrowsing(true);
            }
        };

        detectPrivateMode();
    }, []);

    const handleReadyClick = () => {
        setIsVisible(false);
        
        // Check if we should show the logo tip
        let shouldShowLogoTip = true;
        try {
            const logoTipShown = localStorage.getItem('logo_tip_shown');
            shouldShowLogoTip = logoTipShown !== 'true';
        } catch (e) {
            // If localStorage fails, we'll still show the tip
        }
        
        if (shouldShowLogoTip) {
            setShowLogoTip(true);
        } else if (onClose) {
            onClose();
        }
    };
    
    const handleLogoTipClose = () => {
        setShowLogoTip(false);
        if (onClose) onClose();
    };

    if (!isVisible && !showLogoTip) return null;

    if (showLogoTip) {
        return <LogoTipPopup onClose={handleLogoTipClose} />;
    }

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

                {isPrivateBrowsing && (
                    <div className="bg-yellow-500 text-black p-3 rounded mb-6 text-sm">
                        ⚠️ You're using a private browsing mode, which may cause some features to not work properly. For the best experience, please use a standard browsing window.
                    </div>
                )}

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
                    <Link href="/docs/privacy-policy" className="hover:text-gray-300">
                        Privacy Policy
                    </Link>
                    <span className="mx-2">|</span>
                    <Link href="/docs/terms-of-service" className="hover:text-gray-300">
                        Terms of Service
                    </Link>
                    <span className="mx-2">|</span>
                    <Link href="/how-it-works" className="hover:text-gray-300">
                        How It Works
                    </Link>
                </div>
            </div>
        </div>
    );
}