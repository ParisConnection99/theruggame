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
                <h2 className="text-2xl font-bold text-center mb-6">how it works</h2>

                <p className="text-center mb-6">
                    <span>theruggame allows </span>
                    <span className="text-blue-400">anyone</span>
                    <span> to predict wether a coin with Pump (go up) </span>
                    <span className="text-green-400">Or Rug (go down) within a designated time</span>
                    <span>, usually 10-30 mins.</span>
                </p>

                <div className="space-y-2 mb-6">
                    <p className="text-center"><span className="font-medium">step 1:</span> pick a market</p>
                    <p className="text-center"><span className="font-medium">step 2:</span> select if you think it will pump or rug</p>
                    <p className="text-center"><span className="font-medium">step 3:</span> decide how much you want to bet </p>
                    <p className="text-center"><span className="font-medium">step 4:</span> wait for market resolution and collect your winnings if correct</p>
                </div>

                <p className="text-center text-sm mb-6">
                    by clicking this button you agree to the terms and conditions and certify that you are over 18
                </p>

                <button
                    onClick={handleReadyClick}
                    className="bg-green-400 hover:bg-green-500 text-gray-900 font-medium py-3 px-4 rounded-md w-full transition duration-200"
                >
                    I'm ready to play
                </button>

                <div className="text-center text-sm text-gray-500 mt-4">
                    <Link href="/docs/privacy-policy" className="hover:text-gray-300">privacy policy</Link>
                    <span className="mx-2">|</span>
                    <Link href="/docs/terms-of-service" className="hover:text-gray-300">terms of service</Link>
                    <span className="mx-2">|</span>
                    <Link href="/docs/fees" className="hover:text-gray-300">fees</Link>
                </div>

                {/* <div className="text-center text-sm text-gray-500 mt-4">
          <a href="/privacy" className="hover:text-gray-300">privacy policy</a>
          <span className="mx-2">|</span>
          <a href="/terms" className="hover:text-gray-300">terms of service</a>
          <span className="mx-2">|</span>
          <a href="/fees" className="hover:text-gray-300">fees</a>
        </div> */}
            </div>
        </div>
    );
}