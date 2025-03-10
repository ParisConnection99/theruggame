'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletConnectionModal from './WalletConnectionModal';
import { FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from './FirebaseProvider';
import { signInWithCustomToken } from 'firebase/auth';
import { logError } from '@/utils/errorLogger';



export default function Header() {
    const { publicKey, connected, wallet, connecting } = useWallet();
    const { auth } = useAuth(); 
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showWalletConnectionModal, setShowWalletConnectionModal] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, connecting, success, error
    const [errorMessage, setErrorMessage] = useState('');
    const [showErrorToast, setShowErrorToast] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [returningFromWalletApp, setReturningFromWalletApp] = useState(false);

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

    // NEW EFFECT: Listen for wallet-callback event
    useEffect(() => {
        const handleWalletCallbackEvent = (event) => {
            console.log("Received wallet-callback event:", event.detail);
            
            // Check if we have the necessary data
            if (event.detail && event.detail.publicKey) {
                // Process the wallet connection using the provided data
                handleWalletCallbackConnection(event.detail);
            }
        };

        // Add event listener for our custom event
        window.addEventListener('wallet-callback-event', handleWalletCallbackEvent);

        // Also check localStorage on mount in case we missed the event
        const shouldReconnect = localStorage.getItem('wallet_return_reconnect');
        if (shouldReconnect === 'true') {
            const publicKey = localStorage.getItem('phantomPublicKey');
            const session = localStorage.getItem('phantomSession');
            const signature = localStorage.getItem('phantomSignature');
            
            if (publicKey && session && signature) {
                console.log("Found wallet data in localStorage, processing...");
                handleWalletCallbackConnection({ publicKey, session, signature });
                
                // Clear the reconnect flag to prevent repeated processing
                localStorage.setItem('wallet_return_reconnect', 'false');
            }
        }

        // Clean up the event listener
        return () => {
            window.removeEventListener('wallet-callback-event', handleWalletCallbackEvent);
        };
    }, [auth]); // Only depends on auth being available

    // Function to handle wallet connection from callback data
    const handleWalletCallbackConnection = async (walletData) => {
        try {
            console.log("Starting wallet callback connection process");
            setConnectionStatus('connecting');
            
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
            const userResponse = await fetch(`/api/users?wallet=${walletData.publicKey}`, {
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

    // Handle visibility changes for mobile wallet connections
    useEffect(() => {
        const handleVisibilityChange = () => {
            // If we're becoming visible again and we're on mobile
            if (!document.hidden && isMobile && connectionStatus === 'connecting') {
                console.log("Returning from wallet app, checking connection...");
                setReturningFromWalletApp(true);
                
                // Give a moment for connection to establish
                setTimeout(() => {
                    if (!connected) {
                        // If still not connected after returning
                        showConnectionError('Wallet connection not completed. Please try again.');
                        setConnectionStatus('error');
                    }
                    setReturningFromWalletApp(false);
                }, 2000);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isMobile, connectionStatus, connected]);

    useEffect(() => {
        if (connected && publicKey && auth) {
            console.log("Wallet connected:", publicKey.toString());
            handleWalletConnection();
        }
    }, [connected, publicKey, auth]);

    // Watch connection status changes
    useEffect(() => {
        if (connecting) {
            setConnectionStatus('connecting');
        } else if (connected) {
            setConnectionStatus('success');
            // Reset status after showing success
            const timer = setTimeout(() => {
                setConnectionStatus('idle');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [connecting, connected]);

    
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
                {!connected ? (
                    <div 
                        onClick={() => {
                            closeMenu(); // Close the burger menu
                            setShowWalletConnectionModal(true);
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

            <WalletConnectionModal 
                isOpen={showWalletConnectionModal}
                onClose={() => setShowWalletConnectionModal(false)}
                onError={showConnectionError}
            />
            
            {/* Mobile-specific instructions for wallet connection */}
            {isMobile && connected && connectionStatus === 'connecting' && (
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