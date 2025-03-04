import React, { useRef, useState, useEffect } from 'react';
import { useAnalytics } from '@/components/FirebaseProvider';
import { logEvent } from 'firebase/analytics';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

const BetShareModal = ({ isOpen, onClose, bet }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef(null);
  const analytics = useAnalytics();

  // Fetch market data when bet changes
  useEffect(() => {
    const fetchMarketData = async () => {
      if (!bet || !bet.market_id) {
        console.log("No market_id available in bet:", bet);
        return;
      }
      
      try {
        setLoading(true);
        console.log(`Fetching market with ID: ${bet.market_id}`);
        
        // Log the exact URL being called
        const url = `/api/markets/market/${bet.market_id}`;
        console.log(`Calling API endpoint: ${url}`);
        
        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`API error (${response.status}):`, errorData);
          throw new Error(`Failed to fetch market data: ${response.status}`);
        }

        const marketData = await response.json();
        console.log("Market data received:", marketData);
        setMarket(marketData);
      } catch (error) {
        console.error('Error fetching market data: ', error);
        if (analytics) {
          logEvent(analytics, 'bet_share_modal_error', {
            error_message: error.message,
            error_code: error.code || 'unknown',
            market_id: bet.market_id
          });
        }
        setMarket(null);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && bet) {
      fetchMarketData();
    }
  }, [bet, isOpen, analytics]);

  // Only render if modal is open and bet data exists
  if (!isOpen || !bet) return null;

  const calculateGainPercentage = (bet) => {
    if (bet.status === 'WON') {
      // Calculate percentage gain based on potential_payout vs matched_amount
      const gain = (bet.potential_payout / bet.matched_amount - 1) * 100;
      return gain.toFixed(2);
    } else if (bet.status === 'LOST') {
      return -100; // Lost the entire matched amount
    }
    return 0;
  };
  
  // Format the market name as in MarketCard
  const tokenNameNoSpaces = market?.name ? market.name.replace(/\s+/g, "") : "";
  const questionStart = "Will ";
  const questionEnd = " Pump or Rug in 10 mins?";

  const generateImage = async () => {
    if (!cardRef.current) return;

    setIsGenerating(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#000033',
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true // To handle cross-origin images
      });

      canvas.toBlob((blob) => {
        saveAs(blob, `bet-outcome-${bet.id}.png`);
        setIsGenerating(false);
      });
    } catch (error) {
      console.error("Error generating image:", error);
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Share Your Bet Outcome</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Preview Card - This will be converted to image */}
        <div
          ref={cardRef}
          className="bg-black rounded-lg overflow-hidden mb-4 w-full"
          style={{
            backgroundImage: "url('/images/stars-bg.jpg')", // Replace with your background
            backgroundSize: "cover",
            height: "400px",
            padding: "20px"
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="text-purple-400 text-lG font-bold">
                THE RUG GAME
              </div>
              {market && (
                <div className="text-sm mt-1">
                  {questionStart}
                  <span className="text-amber-400 font-bold drop-shadow-sm">{tokenNameNoSpaces}</span>
                  {questionEnd}
                </div>
              )}
              {loading && <div className="text-sm mt-1 text-gray-400">Loading market details...</div>}
            </div>
            <img
              src="/images/logo1.png"
              alt="Rug Game Logo"
              className="h-12 w-12"
            />
          </div>

          <div className="mt-8">
            <div className={`text-7xl font-bold ${bet.status === 'WON' ? 'text-green-400' : 'text-red-400'
              }`}>
              {calculateGainPercentage(bet)}%
            </div>
          </div>

          <div className="mt-10 text-gray-300">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-500">Initial</div>
                <div className="text-purple-400 text-lg">{bet.matched_amount} SOL</div>
              </div>
              <div>
                <div className="text-gray-500">Result</div>
                <div className={`text-lg ${bet.status === 'WON' ? 'text-green-400' : 'text-red-400'
                  }`}>
                  {bet.status === 'WON'
                    ? `${bet.potential_payout} SOL`
                    : '0 SOL'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={generateImage}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
          >
            {isGenerating ? 'Generating...' : 'Download Image'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetShareModal;