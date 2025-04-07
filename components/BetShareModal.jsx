// import React, { useRef, useState, useEffect } from 'react';
// import { errorLog } from '@/utils/ErrorLog';
// import html2canvas from 'html2canvas';
// import { saveAs } from 'file-saver';

// const BetShareModal = ({ isOpen, onClose, bet }) => {
//   const [isGenerating, setIsGenerating] = useState(false);
//   const cardRef = useRef(null);

//   // Only render if modal is open and bet data exists
//   if (!isOpen || !bet) return null;

//   const calculateGainPercentage = (bet) => {
//     if (bet.status === 'WON') {
//       // Calculate percentage gain based on potential_payout vs matched_amount
//       const gain = (bet.potential_payout / bet.matched_amount - 1) * 100;
//       return `+${gain.toFixed(2)}`;
//     } else if (bet.status === 'LOST') {
//       return -100; // Lost the entire matched amount
//     }
//     return 0;
//   };

//   // Format the market name as in MarketCard
//   const tokenNameNoSpaces = bet.token_name ? bet.token_name.replace(/\s+/g, "") : "";
//   const questionStart = "Will ";
//   const questionEnd = " Pump or Rug in 20 mins?";

//   const generateImage = async () => {
//     if (!cardRef.current) return;

//     setIsGenerating(true);

//     try {
//       const canvas = await html2canvas(cardRef.current, {
//         backgroundColor: null, // Make background transparent
//         scale: 2, // Higher resolution
//         logging: false,
//         useCORS: true // To handle cross-origin images
//       });

//       canvas.toBlob((blob) => {
//         saveAs(blob, `bet-outcome-${bet.id}.png`);
//         setIsGenerating(false);
//       });

//       // 
//     } catch (error) {
//       console.error("Error generating image:", error);
//       await errorLog("RESULT_SHARE_IMAGE_ERROR",
//         error.message || 'Error object with empty message',
//         error.stack || "no stack trace available",
//         "BET-SHARE",
//         "SERIOUS");
//       setIsGenerating(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
//       <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
//         <div className="flex justify-between items-center mb-4">
//           <h3 className="text-xl font-bold text-white">Share Your Bet Outcome</h3>
//           <button
//             onClick={onClose}
//             className="text-gray-400 hover:text-white"
//           >
//             ✕
//           </button>
//         </div>

//         {/* Preview Card - This will be converted to image */}
//         <div
//           ref={cardRef}
//           className="relative rounded-lg overflow-hidden mb-4 w-full"
//           style={{
//             height: "400px"
//           }}
//         >
//           {/* Background Image with overlay */}
//           <div
//             className="absolute inset-0 bg-cover bg-center"
//             style={{
//               backgroundImage: "url('/images/morfeus.webp')",
//               filter: "brightness(0.7)"
//             }}
//           />

//           {/* Content Container */}
//           <div className="relative z-10 h-full flex flex-col p-6">
//             <div className="flex justify-between items-start">
//               <div>
//                 <div className="text-purple-400 text-lg font-bold">
//                   THE RUG GAME
//                 </div>
//                 <div className="text-sm mt-1">
//                   {questionStart}
//                   <span className="text-amber-400 font-bold drop-shadow-sm">{tokenNameNoSpaces}</span>
//                   {questionEnd}
//                 </div>
//               </div>
//               <img
//                 src="/images/logo1.png"
//                 alt="Rug Game Logo"
//                 className="h-12 w-12"
//               />
//             </div>

//             <div className="mt-8 flex-grow flex flex-col justify-center">
//               <div className={`text-5xl font-bold ${bet.status === 'WON' ? 'text-green-400' : 'text-red-400'}`}>
//                 {calculateGainPercentage(bet)}%
//               </div>
//             </div>

//             <div className="mt-auto">
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <div className="text-gray-300">Initial</div>
//                   <div className="text-purple-400 text-lg">{bet.matched_amount} SOL</div>
//                 </div>
//                 <div>
//                   <div className="text-gray-300">Result</div>
//                   <div className={`text-lg ${bet.status === 'WON' ? 'text-green-400' : 'text-red-400'}`}>
//                     {bet.status === 'WON'
//                       ? `${bet.potential_payout} SOL`
//                       : '0 SOL'}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Action Buttons */}
//         <div className="flex justify-center space-x-4">
//           <button
//             onClick={generateImage}
//             disabled={isGenerating}
//             className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
//           >
//             {isGenerating ? 'Generating...' : 'Download Image'}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default BetShareModal;

import React, { useRef, useState, useEffect } from 'react';
import { errorLog } from '@/utils/ErrorLog';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

const BetShareModal = ({ isOpen, onClose, bet }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [potentialPayout, setPotentialPayout] = useState(0);
  const cardRef = useRef(null);

  // Calculate the potential payout from matches when bet data changes
  useEffect(() => {
    if (bet && bet.matches && bet.matches.length > 0) {
      let totalWinAmount = 0;
      
      bet.matches.forEach(match => {
        // Determine which odds to use based on bet type
        const oddsToUse = bet.bet_type === 'PUMP' ? match.pump_odds : match.rug_odds;
        
        // Calculate win amount for this match
        const winAmountForMatch = parseFloat(match.amount) * oddsToUse;
        totalWinAmount += winAmountForMatch;
      });
      
      setPotentialPayout(totalWinAmount);
    } else {
      // Fallback to using the potential_payout property if matches aren't available
      setPotentialPayout(bet?.potential_payout || 0);
    }
  }, [bet]);

  // Only render if modal is open and bet data exists
  if (!isOpen || !bet) return null;

  const calculateGainPercentage = () => {
    if (bet.status === 'WON') {
      // Calculate percentage gain based on calculated potential payout vs matched_amount
      const gain = (potentialPayout / bet.matched_amount - 1) * 100;
      return `+${gain.toFixed(2)}`;
    } else if (bet.status === 'LOST') {
      return -100; // Lost the entire matched amount
    }
    return 0;
  };

  // Format SOL amounts consistently
  const formatSol = (amount) => {
    return parseFloat(amount).toFixed(4);
  };

  // Format the market name as in MarketCard
  const tokenNameNoSpaces = bet.token_name ? bet.token_name.replace(/\s+/g, "") : "";
  const questionStart = "Will ";
  const questionEnd = " Pump or Rug in 20 mins?";

  const generateImage = async () => {
    if (!cardRef.current) return;

    setIsGenerating(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null, // Make background transparent
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
      await errorLog("RESULT_SHARE_IMAGE_ERROR",
        error.message || 'Error object with empty message',
        error.stack || "no stack trace available",
        "BET-SHARE",
        "SERIOUS");
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
          className="relative rounded-lg overflow-hidden mb-4 w-full"
          style={{
            height: "400px"
          }}
        >
          {/* Background Image with overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/images/morfeus.webp')",
              filter: "brightness(0.7)"
            }}
          />

          {/* Content Container */}
          <div className="relative z-10 h-full flex flex-col p-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-purple-400 text-lg font-bold">
                  THE RUG GAME
                </div>
                <div className="text-sm mt-1">
                  {questionStart}
                  <span className="text-amber-400 font-bold drop-shadow-sm">{tokenNameNoSpaces}</span>
                  {questionEnd}
                </div>
              </div>
              <img
                src="/images/logo1.png"
                alt="Rug Game Logo"
                className="h-12 w-12"
              />
            </div>

            <div className="mt-8 flex-grow flex flex-col justify-center">
              <div className={`text-5xl font-bold ${bet.status === 'WON' ? 'text-green-400' : 'text-red-400'}`}>
                {calculateGainPercentage()}%
              </div>
            </div>

            <div className="mt-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-300">Initial</div>
                  <div className="text-purple-400 text-lg">{formatSol(bet.matched_amount)} SOL</div>
                </div>
                <div>
                  <div className="text-gray-300">Result</div>
                  <div className={`text-lg ${bet.status === 'WON' ? 'text-green-400' : 'text-red-400'}`}>
                    {bet.status === 'WON'
                      ? `${formatSol(potentialPayout)} SOL`
                      : '0 SOL'}
                  </div>
                </div>
              </div>
              
              {/* Website URL at the bottom */}
              <div className="text-center mt-4 text-gray-400 text-sm font-medium">
                theruggame.fun
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