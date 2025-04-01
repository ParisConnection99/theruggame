// import React, { useRef, useState, useEffect } from 'react';
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
//         backgroundColor: '#000033',
//         scale: 2, // Higher resolution
//         logging: false,
//         useCORS: true // To handle cross-origin images
//       });

//       canvas.toBlob((blob) => {
//         saveAs(blob, `bet-outcome-${bet.id}.png`);
//         setIsGenerating(false);
//       });
//     } catch (error) {
//       console.error("Error generating image:", error);
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
//           className="bg-black rounded-lg overflow-hidden mb-4 w-full"
//           style={{
//             backgroundImage: "url('/images/stars-bg.jpg')", // Replace with your background
//             backgroundSize: "cover",
//             height: "400px",
//             padding: "20px"
//           }}
//         >
//           <div className="flex justify-between items-start">
//             <div>
//               <div className="text-purple-400 text-lG font-bold">
//                 THE RUG GAME
//               </div>
//               <div className="text-sm mt-1">
//                   {questionStart}
//                   <span className="text-amber-400 font-bold drop-shadow-sm">{tokenNameNoSpaces}</span>
//                   {questionEnd}
//                 </div>
//             </div>
//             <img
//               src="/images/logo1.png"
//               alt="Rug Game Logo"
//               className="h-12 w-12"
//             />
//           </div>

//           <div className="mt-8">
//             <div className={`text-5xl font-bold ${bet.status === 'WON' ? 'text-green-400' : 'text-red-400'
//               }`}>
//               {calculateGainPercentage(bet)}%
//             </div>
//           </div>

//           <div className="mt-10 text-gray-300">
//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <div className="text-gray-500">Initial</div>
//                 <div className="text-purple-400 text-lg">{bet.matched_amount} SOL</div>
//               </div>
//               <div>
//                 <div className="text-gray-500">Result</div>
//                 <div className={`text-lg ${bet.status === 'WON' ? 'text-green-400' : 'text-red-400'
//                   }`}>
//                   {bet.status === 'WON'
//                     ? `${bet.potential_payout} SOL`
//                     : '0 SOL'}
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
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

const BetShareModal = ({ isOpen, onClose, bet }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef(null);
  
  // Only render if modal is open and bet data exists
  if (!isOpen || !bet) return null;

  const calculateGainPercentage = (bet) => {
    if (bet.status === 'WON') {
      // Calculate percentage gain based on potential_payout vs matched_amount
      const gain = (bet.potential_payout / bet.matched_amount - 1) * 100;
      return `+${gain.toFixed(2)}`;
    } else if (bet.status === 'LOST') {
      return -100; // Lost the entire matched amount
    }
    return 0;
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
              backgroundImage: "url('/images/background.webp')",
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
                {calculateGainPercentage(bet)}%
              </div>
            </div>

            <div className="mt-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-300">Initial</div>
                  <div className="text-purple-400 text-lg">{bet.matched_amount} SOL</div>
                </div>
                <div>
                  <div className="text-gray-300">Result</div>
                  <div className={`text-lg ${bet.status === 'WON' ? 'text-green-400' : 'text-red-400'}`}>
                    {bet.status === 'WON'
                      ? `${bet.potential_payout} SOL`
                      : '0 SOL'}
                  </div>
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