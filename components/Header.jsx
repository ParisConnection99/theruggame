'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from './FirebaseProvider';
import { signInWithCustomToken } from 'firebase/auth';
import { logInfo, logError } from '@/utils/logger';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export default function Header() {
    const { publicKey, connected, connect, disconnect, select, wallet, connecting } = useWallet();
    const { auth } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showWalletConnectionModal, setShowWalletConnectionModal] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, connecting, success, error, disconnected
    const [errorMessage, setErrorMessage] = useState('');
    const [showErrorToast, setShowErrorToast] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [returningFromWalletApp, setReturningFromWalletApp] = useState(false);
    const [isEffectivelyConnected, setIsEffectivelyConnected] = useState(false);
    const [dappEncryptionPublicKey, setDappEncryptionPublicKey] = useState('');
    const keypairRef = useRef(null);

    // Detect if user is on mobile device
    useEffect(() => {
        const checkMobile = () => {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent
            );
            setIsMobile(isMobileDevice);
        };

        checkMobile();
    }, []);

    // Create a keypair for the dapp
    useEffect(() => {
        // Check if we already have a keypair stored
        const storedPrivateKey = localStorage.getItem('dappEncryptionPrivateKey');
        const storedPublicKey = localStorage.getItem('dappEncryptionPublicKey');

        if (storedPrivateKey && storedPublicKey) {
            try {
                // Use existing keypair
                const existingKeypair = nacl.box.keyPair.fromSecretKey(bs58.decode(storedPrivateKey));
                keypairRef.current = existingKeypair;
                setDappEncryptionPublicKey(storedPublicKey);
                
                logInfo('Using existing keypair', {
                    component: 'Header',
                    publicKey: storedPublicKey
                });
            } catch (error) {
                logError(error, {
                    component: 'Header',
                    action: 'loading existing keypair'
                });
                // If there's an error with stored keys, remove them and generate new ones
                localStorage.removeItem('dappEncryptionPrivateKey');
                localStorage.removeItem('dappEncryptionPublicKey');
                generateNewKeypair();
            }
        } else {
            // No existing keypair, generate new one
            generateNewKeypair();
        }

        function generateNewKeypair() {
            const keypair = nacl.box.keyPair();
            keypairRef.current = keypair;

            const publicKeyBase58 = bs58.encode(keypair.publicKey);
            const privateKeyBase58 = bs58.encode(keypair.secretKey);

            setDappEncryptionPublicKey(publicKeyBase58);
            localStorage.setItem('dappEncryptionPublicKey', publicKeyBase58);
            localStorage.setItem('dappEncryptionPrivateKey', privateKeyBase58);

            logInfo('Generated new keypair', {
                component: 'Header',
                publicKey: publicKeyBase58
            });
        }
    }, []); // Empty dependency array means this runs once on mount

    // Handle wallet connection when connected
    useEffect(() => {
        if (connected && publicKey && auth) {
            console.log("Wallet connected:", publicKey.toString());
            handleWalletConnection();
        }
    }, [connected, publicKey, auth]);

    // Listen for wallet disconnect event
    useEffect(() => {
        let isDisconnecting = false; // Flag to prevent multiple calls

        const handleWalletDisconnect = async () => {
            // If already disconnecting, ignore subsequent calls
            if (isDisconnecting) {
                logInfo('Disconnect already in progress, ignoring call', {
                    component: 'Header'
                });
                return;
            }

            isDisconnecting = true; // Set flag

            try {
                const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                    navigator.userAgent
                );
            
                logInfo('Disconnect triggered', {
                    component: 'Header',
                    isMobileDevice: isMobileDevice,
                    userAgent: navigator.userAgent,
                    hasSession: !!localStorage.getItem('phantomSession')
                });

                if (isMobileDevice) {
                    logInfo('Disconnecting from mobile', {
                        component: 'Header',
                        isMobile: isMobileDevice,
                    });
                    await handleMobileDisconnect();
                } else {
                    if (connected) {
                        await disconnect();
                        logInfo('Wallet disconnected', {
                            component: 'Header',
                            walletState: {
                                connected: connected,
                                publicKey: publicKey?.toString()
                            }
                        });
                    }
                }

                // Remove the event listener after successful disconnect
                window.removeEventListener('wallet-disconnect-event', handleWalletDisconnect);

            } catch (error) {
                logError(error, {
                    component: 'Header',
                    action: 'wallet disconnect'
                });
            } finally {
                isDisconnecting = false; // Reset flag regardless of success or failure
            }
        };

        // Add event listener
        window.addEventListener('wallet-disconnect-event', handleWalletDisconnect);

        // Cleanup
        return () => {
            window.removeEventListener('wallet-disconnect-event', handleWalletDisconnect);
        };
    }, [connected, disconnect]);

    const encryptPayload = (payload, sharedSecret) => {
        if (!sharedSecret) throw new Error("missing shared secret");

        const nonce = nacl.randomBytes(24);
        const encryptedPayload = nacl.box.after(
            Buffer.from(JSON.stringify(payload)),
            nonce,
            sharedSecret
        );

        return [nonce, encryptedPayload];
    };

    const handleMobileDisconnect = async () => {
        try {
            const session = localStorage.getItem('phantomSession');
            const sharedSecret = localStorage.getItem('phantomSharedSecret');
            
            if (!session || !sharedSecret) {
                throw new Error('Missing session or shared secret');
            }

            logInfo('Starting disconnect process', {
                component: 'Header',
                hasSession: !!session,
                hasSharedSecret: !!sharedSecret
            });

            const payload = {
                session: session
            };

            // Use the encryptPayload function
            const [nonce, encryptedPayload] = encryptPayload(
                payload, 
                bs58.decode(sharedSecret) // Convert shared secret back to Uint8Array
            );

            // Create the deep link URL
            const params = new URLSearchParams({
                dapp_encryption_public_key: localStorage.getItem('dappEncryptionPublicKey'),
                nonce: bs58.encode(nonce),
                redirect_link: 'https://theruggame.fun/disconnect-callback',
                payload: bs58.encode(encryptedPayload)
            });

            const disconnectDeepLink = `https://phantom.app/ul/v1/disconnect?${params.toString()}`;
            window.location.href = disconnectDeepLink;

        } catch (error) {
            logError(error, {
                component: 'Header',
                action: 'mobile disconnect'
            });
        }
    };

    // Monitor connection states
    useEffect(() => {
        if (connected) {
            logInfo('Wallet connected successfully', {
                component: 'Header',
                publicKey: publicKey?.toString()
            });
            setConnectionStatus('success');
            setIsEffectivelyConnected(true);
        }
    }, [connected, publicKey]);

    const handleConnect = async () => {
        try {
            setConnectionStatus('connecting');

            // Log initial state
            logInfo('Starting wallet connection', {
                component: 'Header',
                walletState: {
                    connecting,
                    connected,
                    hasWallet: !!wallet,
                    hasPhantom: !!window?.phantom?.solana
                }
            });

            // Check if Phantom is available
            if (!window?.phantom?.solana) {
                throw new Error('Phantom wallet is not installed');
            }

            // Attempt connection
            await select('Phantom');
            await connect();

            logInfo('Connection successful', {
                component: 'Header',
                walletState: {
                    connecting,
                    connected,
                    hasWallet: !!wallet,
                    hasPhantom: !!window?.phantom?.solana
                }
            });

        } catch (error) {
            console.error('Connection error:', error);
            setConnectionStatus('error');
            showConnectionError(error.message || 'Connection failed, please try again');
        }
    };

    const handleMobileWalletConnection = async () => {
        if (!isMobile) return;


        try {
            setConnectionStatus('connecting');

            localStorage.setItem('wallet_connect_pending', 'true');
            localStorage.setItem('wallet_connect_timestamp', Date.now().toString());

            const appUrl = 'https://theruggame.fun/';
            const redirectUrl = 'https://theruggame.fun/wallet-callback';

            const params = new URLSearchParams({
                dapp_encryption_public_key: dappEncryptionPublicKey,
                cluster: "mainnet-beta",
                app_url: appUrl,
                redirect_link: redirectUrl
            });

            const deepLink = `https://phantom.app/ul/v1/connect?${params.toString()}`;

            logInfo('Deeplink', {
                link: deepLink
            });

            // Direct link to Phantom with callback to our site
            window.location.href = deepLink;

            // Log initial state
        } catch (error) {
            console.error('Connection error:', error);
            logError(error, {
                component: 'Header',
                action: 'Error during mobile wallet connection'
            });
            setConnectionStatus('error');
            showConnectionError(error.message || 'Connection failed, please try again');
        }
    };

    //Handle wallet callback
    useEffect(() => {
        const handleWalletCallbackEvent = async (event) => {
            try {
                setConnectionStatus('connecting');

                logInfo('Recieved wallet-callback event', {
                    component: 'Header',
                    event: event.detail
                });

                // Process the connection with the received data
                if (event.detail && event.detail.publicKey) {
                    await handleWalletCallbackConnection({
                        publicKey: event.detail.publicKey,
                        session: event.detail.session
                    });

                    setConnectionStatus('success');
                    setIsEffectivelyConnected(true);
                }


            } catch (error) {
                console.error('Error during wallet callback:', error);
                setConnectionStatus('error');
                showConnectionError(error.message || 'Connection failed, please try again');
                logError(error, {
                    component: 'Header',
                    action: 'Error during wallet callback'
                });
            }
        };

        window.addEventListener('wallet-callback-event', handleWalletCallbackEvent);
        return () => window.removeEventListener('wallet-callback-event', handleWalletCallbackEvent);
    }, []);


    // Function to handle wallet connection from callback data
    const handleWalletCallbackConnection = async (walletData) => {
        try {
            console.log("Starting wallet callback connection process");
            setConnectionStatus('connecting');

            logInfo("Starting wallet callback connection process", {
                component: 'Header'
            });

            if (!walletData.publicKey || !auth) {
                console.log("Wallet connection aborted: publicKey or auth not available");
                setConnectionStatus('error');
                // Show error message to user
                const errorMessage = !walletData.publicKey ? "Wallet not connected properly" : "Authentication service unavailable";
                showConnectionError(errorMessage);
                logError(
                    new Error(errorMessage),
                    {
                        component: 'Header',
                        method: 'handleWalletCallbackConnection',
                        publicKeyAvailable: !!walletData.publicKey,
                        authAvailable: !!auth,
                        connectionStatus: 'error'
                    }
                );
                return;
            }

            console.log(`Checking user in supabase...`);
            logInfo("Checking user in supabase...", {
                component: 'Header'
            });
            const userResponse = await fetch(`/api/users?wallet=${walletData.publicKey}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            let user = null;

            if (userResponse.status === 404) {
                // User not found, need to create a new user
                console.log("User not found, creating new user...");

                logInfo('User not found in database', {
                    component: "Header"
                });
                const createUserResponse = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        wallet_ca: walletData.publicKey,
                        username: walletData.publicKey.slice(0, 6) // Simple username from public key
                    })
                });

                if (!createUserResponse.ok) {
                    const errorData = await createUserResponse.json();
                    throw new Error(errorData.error || 'Failed to create user');
                }

                // Fetch the newly created user
                user = await createUserResponse.json();

                logInfo('Fetched user', {
                    component: "Header",
                    user: JSON.stringify(user, null, 2)
                });

            } else if (!userResponse.ok) {
                // Handle other API errors
                const errorData = await userResponse.json();
                throw new Error(errorData.error || 'Failed to fetch user');
            } else {
                // User exists
                user = await userResponse.json();
            }

            // Get Firebase custom token
            console.log("Getting Firebase token for:", walletData.publicKey);
            logInfo("Getting Firebase token for:", {
                component: "Header",
                publicKey: walletData.publicKey
            });

            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicKey: walletData.publicKey })
            });

            const data = await response.json();

            if (data.error) {
                setConnectionStatus('error');
                showConnectionError(`Authentication error: ${data.error}`);
                throw new Error(data.error);
            }

            console.log("Signing in with custom token...");

            logInfo("Signing in with custom token...", {
                component: "Header"
            });

            await signInWithCustomToken(auth, data.token);
            console.log("Firebase sign in successful");

            logInfo("Firebase sign in successful", {
                component: "Header"
            });

            // Set the user profile from the API response
            setUserProfile(user);
            setConnectionStatus('success');

            logInfo('Checking connected value', {
                is_connected: connected,
                component: 'Header'
            });
        } catch (error) {
            console.error('Error during authentication:', error);
            setConnectionStatus('error');

            logError(error, {
                component: 'Header',
                action: 'Error during authentication'
            });

            // Provide specific error messages based on where the failure occurred
            if (error.message?.includes('Firebase')) {
                showConnectionError('Failed to authenticate with the server');
            } else if (error.message?.includes('token')) {
                showConnectionError('Failed to create user session');
            } else {
                showConnectionError(error.message || 'Connection failed, please try again');
            }
        }
    };

    const handleWalletConnection = async () => {
        try {
            console.log("Starting wallet connection process");
            setConnectionStatus('connecting');

            if (!publicKey || !auth) {
                console.log("Wallet connection aborted: publicKey or auth not available");
                setConnectionStatus('error');
                // Show error message to user
                const errorMessage = !publicKey ? "Wallet not connected properly" : "Authentication service unavailable";
                showConnectionError(errorMessage);
                return;
            }

            console.log(`Checking user in supabase...`);
            const userResponse = await fetch(`/api/users?wallet=${publicKey.toString()}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            let user = null;

            if (userResponse.status === 404) {
                // User not found, need to create a new user
                console.log("User not found, creating new user...");
                const createUserResponse = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        wallet_ca: publicKey.toString(),
                        username: getDefaultUsername()
                    })
                });

                if (!createUserResponse.ok) {
                    const errorData = await createUserResponse.json();
                    throw new Error(errorData.error || 'Failed to create user');
                }

                // Fetch the newly created user
                user = await createUserResponse.json();
            } else if (!userResponse.ok) {
                // Handle other API errors
                const errorData = await userResponse.json();
                throw new Error(errorData.error || 'Failed to fetch user');
            } else {
                // User exists
                user = await userResponse.json();
            }

            // Get Firebase custom token
            console.log("Getting Firebase token for:", publicKey.toString());
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicKey: publicKey.toString() })
            });

            const data = await response.json();

            if (data.error) {
                setConnectionStatus('error');
                showConnectionError(`Authentication error: ${data.error}`);
                throw new Error(data.error);
            }

            console.log("Signing in with custom token...");
            await signInWithCustomToken(auth, data.token);
            console.log("Firebase sign in successful");

            // Set the user profile from the API response
            setUserProfile(user);
            setConnectionStatus('success');

        } catch (error) {
            console.error('Error during authentication:', error);
            setConnectionStatus('error');

            // Provide specific error messages based on where the failure occurred
            if (error.message?.includes('Firebase')) {
                showConnectionError('Failed to authenticate with the server');
            } else if (error.message?.includes('token')) {
                showConnectionError('Failed to create user session');
            } else {
                showConnectionError(error.message || 'Connection failed, please try again');
            }
        }
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    const getDefaultUsername = () => {
        return publicKey ? publicKey.toBase58().slice(0, 6) : '';
    };

    // Function to show error toast with message
    const showConnectionError = (message) => {
        setErrorMessage(message);
        setShowErrorToast(true);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            setShowErrorToast(false);
        }, 5000);
    };

    const WrappedClientWalletLayout = ({ children, className, ...props }) => {
        return (
            <div>
                {!isEffectivelyConnected ? (
                    <div
                        onClick={() => {
                            if (isMobile) {
                                handleMobileWalletConnection();
                            } else {
                                handleConnect();
                            }

                            closeMenu(); // Close the burger menu
                        }}
                        className="text-white text-md hover:scale-105 hover:underline cursor-pointer relative"
                    >
                        CONNECT WALLET
                    </div>
                ) : (
                    <Link
                        href="/profile"
                        onClick={closeMenu} // Close the burger menu when clicking profile
                        className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer border border-white hover:scale-105 relative"
                    >
                        <Image
                            src="/images/cool_ruggy.svg"
                            alt="Profile"
                            width={20}
                            height={20}
                            className="rounded-full"
                        />
                        {/* No wallet address displayed as per original design */}
                        {connectionStatus === 'success' && (
                            <span className="absolute -top-2 -right-2 h-4 w-4 bg-green-500 rounded-full animate-pulse" />
                        )}
                    </Link>
                )}

                {/* Connection status indicators */}
                {connectionStatus === 'connecting' && (
                    <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-[#1c1c28] text-white text-sm py-1 px-3 rounded-md shadow-lg whitespace-nowrap">
                        {returningFromWalletApp
                            ? "Completing connection..."
                            : "Connecting wallet..."}
                    </div>
                )}
                {showErrorToast && (
                    <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-sm py-1 px-3 rounded-md shadow-lg whitespace-nowrap z-50">
                        {errorMessage || 'Connection failed, try again'}
                    </div>
                )}
            </div>
        );
    };

    const MenuItems = () => (
        <>
            {/* Navigation Links */}
            <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
                <Link
                    href="/how-it-works"
                    className="text-white text-md hover:scale-105 hover:underline"
                    onClick={closeMenu}
                >
                    HOW IT WORKS
                </Link>
                <a
                    href="https://t.me/theruggamesupport"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white text-md hover:scale-105 hover:underline"
                    onClick={closeMenu}
                >
                    SUPPORT
                </a>

                {/* Wallet and Profile Links */}
                <div className="flex flex-col md:flex-row items-center gap-4 mt-4 md:mt-0">
                    <WrappedClientWalletLayout />
                </div>
            </div>
        </>
    );

    return (
        <header className="w-full relative">
            {/* Navigation Container */}
            <div className="flex justify-between items-center w-full px-5 mt-5">
                {/* Logo */}
                <Link href="/">
                    <Image
                        src="/logo.png"
                        alt="The Rug Game Logo"
                        width={55}
                        height={55}
                        className="cursor-pointer hover:scale-105"
                    />
                </Link>

                {/* Hamburger Menu for Mobile */}
                <div className="md:hidden">
                    <button
                        onClick={toggleMenu}
                        className="text-white focus:outline-none"
                        aria-label="Toggle menu"
                    >
                        {isMenuOpen ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
                    </button>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-6">
                    <Link href="/how-it-works" className="text-white text-md hover:scale-105 hover:underline">
                        HOW IT WORKS
                    </Link>
                    <a
                        href="https://t.me/theruggamesupport"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white text-md hover:scale-105 hover:underline"
                    >
                        SUPPORT
                    </a>

                    <WrappedClientWalletLayout />
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={closeMenu}>
                    <div
                        className="fixed top-0 right-0 w-64 h-full bg-gray-800 p-6 transform translate-x-0 transition-transform duration-300 ease-in-out"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={closeMenu}
                            className="absolute top-4 right-4 text-white"
                            aria-label="Close menu"
                        >
                            <FaTimes className="w-6 h-6" />
                        </button>
                        <MenuItems />
                    </div>
                </div>
            )}

            {/* <WalletConnectionModal
                isOpen={showWalletConnectionModal}
                onClose={() => setShowWalletConnectionModal(false)}
                onError={showConnectionError}
            /> */}

            {/* Mobile-specific instructions for wallet connection */}
            {isMobile && isEffectivelyConnected && connectionStatus === 'connecting' && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-sm py-2 px-4 rounded-md shadow-lg z-50 max-w-xs text-center">
                    <p>After approving in your wallet app, return to this browser</p>
                </div>
            )}

            {/* Global error toast for connection issues */}
            {showErrorToast && (
                <div className="fixed bottom-4 right-4 bg-red-600 text-white text-sm py-2 px-4 rounded-md shadow-lg z-50 max-w-xs">
                    <div className="flex items-center justify-between">
                        <span>{errorMessage}</span>
                        <button
                            onClick={() => setShowErrorToast(false)}
                            className="ml-2 text-white hover:text-gray-200"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
}