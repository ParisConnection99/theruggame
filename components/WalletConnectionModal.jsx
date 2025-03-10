import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import nacl from 'tweetnacl';

export const WalletConnectionModal = ({ isOpen, onClose, onError }) => {
  const { select, connecting, connected } = useWallet();
  const [isAttemptingConnect, setIsAttemptingConnect] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dappEncryptionPublicKey, setDappEncryptionPublicKey] = useState('');

  useEffect(() => {
    // Generate encryption keypair
    const keypair = nacl.box.keyPair();
    const publicKey = Buffer.from(keypair.publicKey).toString('base64');
    setDappEncryptionPublicKey(publicKey);

    // Store the private key securely (e.g., in state or context)
    const privateKey = Buffer.from(keypair.secretKey).toString('base64');
    localStorage.setItem('dappEncryptionPrivateKey', privateKey);

    // Detect if the user is on a mobile device
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    setIsMobile(isMobileDevice);
  }, []);

  const handleDirectPhantomLink = () => {
    if (!isMobile) return;

    try {
      const appUrl = encodeURIComponent('https://theruggame.fun');
      const redirectUrl = encodeURIComponent('https://theruggame.fun/wallet-callback');
      const deepLink = `https://phantom.app/ul/v1/connect?app_url=${appUrl}&redirect_link=${redirectUrl}&dapp_encryption_public_key=${dappEncryptionPublicKey}`;

      // Open the deep link
      window.location.href = deepLink;
    } catch (error) {
      console.error('Direct link error:', error);
      if (onError) {
        onError('Failed to open Phantom app. Please try connecting manually.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1c1c28] rounded-lg p-6 border border-white" style={{ width: isMobile ? '85%' : '24rem', maxWidth: '420px' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl">Connect a wallet on Solana</h2>
          <button onClick={onClose} className="text-white hover:text-gray-300">
            ✕
          </button>
        </div>

        {/* Mobile-specific instructions */}
        {isMobile && (
          <div className="mb-4 py-2 px-3 bg-blue-900/30 rounded-md text-white text-sm">
            You'll be redirected to the Phantom app. After connecting, return to this browser to continue.
          </div>
        )}

        {/* Wallet options */}
        <div className="space-y-2">
          <div
            onClick={isMobile ? handleDirectPhantomLink : () => select('Phantom')}
            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer bg-[#2a2a38] hover:bg-[#3a3a48] text-white"
          >
            <Image
              src="/images/phantom_wallet.png" // Replace with your Phantom logo path
              alt="Phantom Wallet logo"
              width={24}
              height={24}
              className="rounded-full"
            />
            <div className="flex justify-between flex-1">
              <span>Phantom</span>
              <span>{isMobile ? 'Mobile App' : 'Detected'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnectionModal;