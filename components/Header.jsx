'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
//import WalletConnectionModal from './WalletConnectionModal';
import { FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from './FirebaseProvider';
import { signInWithCustomToken } from 'firebase/auth';
import { logInfo, logError } from '@/utils/logger';


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
    

    console.log('Header re-rendered. isEffectivelyConnected:', isEffectivelyConnected);
    logInfo(`Header re-rendered. isEffectivelyConnected:, ${isEffectivelyConnected}`, {});
    logInfo(`Connection state: ${connected}`);

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

    // Monitor connection states
    useEffect(() => {
        if (connected) {
            logInfo('Wallet connected successfully', {
                component: 'Header',
                publicKey: publicKey?.toString()
            });
            setConnectionStatus('success');
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
            select('Phantom');

            logInfo('Checking wallet state after select', {
                component: 'Header',
                walletState: {
                    connecting,
                    connected,
                    hasWallet: !!wallet,
                    hasPhantom: !!window?.phantom?.solana
                }
            });
            
            logInfo('Select called successfully', {
                component: 'Header'
            });

        } catch (error) {
            console.error('Connection error:', error);
            setConnectionStatus('error');
            showConnectionError(error.message || 'Connection failed, please try again');
        }
    };

    // Update effective connection state
    // useEffect(() => {
    //     if (connected || (userProfile && userProfile.wallet_ca)) {
    //         logInfo('Use effect is connected.');
    //         setIsEffectivelyConnected(true);

    //         //logInfo(`User is Effectively connected: ${isEffectivelyConnected}`, {});
    //     } else {
    //         logInfo('Connected is false', {
    //             component: 'Header',
    //             isEffectively: `${isEffectivelyConnected}`
    //         });

    //         setIsEffectivelyConnected(false);

    //         // logInfo('IsEffectivelyConneted after update', {
    //         //     isUserConnected: `${isEffectivelyConnected}`,
    //         //     component: 'Header'
    //         // });

    //     }
    // }, [connected, userProfile]);

    // useEffect(() => {
    //     const handleWalletCallbackEvent = async (event) => {
    //         // logInfo('Recieved wallet-callback event', {
    //         //     component: 'Header'
    //         // })

    //         // Check if we have the data
    //         if (event.detail && event.detail.publicKey) {
    //             await handleWalletCallbackConnection({
    //                 publicKey: event.detail.publicKey,
    //                 session: event.detail.session
    //             });

    //             localStorage.setItem('wallet_return_reconnect', 'false');
    //         }
    //     };

    //     window.addEventListener('wallet-callback-event', handleWalletCallbackEvent);
    // }, []);

    // useEffect(() => {
    //     const handleWalletDisconnectEvent = async (event) => {
    //         logInfo('Received wallet disconnect event', {
    //             component: 'Header'
    //         });

    //         // logInfo('Check user connection before disconnect', {
    //         //     component: 'Header',
    //         //     isUserConnected: `${connected}`
    //         // });

    //         // check if on mobile
    //         setIsEffectivelyConnected(false);

    //         try {
    //             await disconnect();
    //         } catch (error) {
    //             logError(error, {
    //                 component: 'Header',
    //                 action: 'Disconnecting wallet'
    //             })
    //         }
            
    //         //setIsEffectivelyConnected(false);

    //         // logInfo('Check user connection after disconnect', {
    //         //     component: 'Header',
    //         //     isUserConnected: `${connected}`
    //         // });
    //     };

    //     window.addEventListener('wallet-disconnect-event', handleWalletDisconnectEvent);
    // }, []);

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

    // Handle visibility changes for mobile wallet connections
    // useEffect(() => {
    //     const handleVisibilityChange = () => {
    //         // If we're becoming visible again and we're on mobile
    //         if (!document.hidden && isMobile && connectionStatus === 'connecting') {
    //             console.log("Returning from wallet app, checking connection...");
    //             setReturningFromWalletApp(true);

    //             // Give a moment for connection to establish
    //             setTimeout(() => {
    //                 if (!isEffectivelyConnected) {
    //                     // If still not connected after returning
    //                     showConnectionError('Wallet connection not completed. Please try again.');
    //                     setConnectionStatus('error');
    //                 }
    //                 setReturningFromWalletApp(false);
    //             }, 2000);
    //         }
    //     };

    //     document.addEventListener('visibilitychange', handleVisibilityChange);
    //     return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // }, [isMobile, connectionStatus, isEffectivelyConnected]);

    // useEffect(() => {
    //     if (connected && publicKey && auth) {
    //         console.log("Wallet connected:", publicKey.toString());
    //         handleWalletConnection();
    //     }
    // }, [connected, publicKey, auth]);

    // Watch connection status changes
    // useEffect(() => {
    //     if (connecting) {
    //         setConnectionStatus('connecting');
    //     } else if (connected || isEffectivelyConnected) {
    //         setConnectionStatus('success');
    //         // Reset status after showing success
    //         const timer = setTimeout(() => {
    //             setConnectionStatus('idle');
    //         }, 3000);
    //         return () => clearTimeout(timer);
    //     } 
    // }, [connecting, connected, isEffectivelyConnected]);


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
        logInfo(`Checking connected value in the layout: ${isEffectivelyConnected}`);
        return (
            <div>
                {!isEffectivelyConnected ? (
                    <div
                        onClick={() => {
                            handleConnect();
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

/*
// In Header.jsx - modify the useEffect for wallet-callback-event
    // useEffect(() => {
    //     const handleWalletCallbackEvent = async (event) => {
    //         console.log("Received wallet-callback event:", event.detail);
    //         logInfo("Received wallet-callback event:", {
    //             component: 'Header'
    //         });

    //         logInfo('Checking public key', {
    //             component: 'Header',
    //             publicKey: event.detail.publicKey
    //         });

    //         // Check if we have the necessary data
    //         if (event.detail && event.detail.publicKey) {
    //             try {
    //                 // Ensure the wallet adapter is ready before attempting connection
    //                 // Allow time for the adapter to initialize
    //                 await new Promise(resolve => setTimeout(resolve, 1500));

    //                 // Select the wallet adapter if not already selected
    //                 if (!wallet) {
    //                     const phantomAdapter = new PhantomWalletAdapter();

    //                     logInfo();

    //                     setTimeout(() => {
    //                         phantomAdapter.connect().catch((err) => console.error('Auto-reconnect failed:', err));
    //                     }, 500); // Delay ensures provider is ready
    //                 }
    //                 // Manually update the wallet adapter state
    //                 // if (wallet && wallet.adapter) {
    //                 //     try {
    //                 //         // Create a PublicKey instance from the string
    //                 //         const pubKey = new PublicKey(event.detail.publicKey);

    //                 //         // Set the public key on the adapter
    //                 //         wallet.adapter.publicKey = pubKey;

    //                 //         // Update connection state
    //                 //         wallet.adapter.connected = true;

    //                 //         // Emit connect event to notify listeners
    //                 //         if (typeof wallet.adapter.emit === 'function') {
    //                 //             wallet.adapter.emit('connect', pubKey);
    //                 //         }

    //                 //         logInfo("Manually updated wallet adapter state", {
    //                 //             component: 'Header',
    //                 //             publicKey: pubKey.toString()
    //                 //         });
    //                 //     } catch (error) {
    //                 //         logError(error, {
    //                 //             component: 'Header',
    //                 //             action: 'manually updating wallet adapter'
    //                 //         });
    //                 //     }
    //                 // }

    //                 // Now process the connection data
    //                 handleWalletCallbackConnection({
    //                     publicKey: event.detail.publicKey,
    //                     session: event.detail.session
    //                 });

    //                 logInfo("Wallet connected successfully after callback", {});

    //                 logInfo('Check wallet', {
    //                     component: 'Header',
    //                     wallet: JSON.stringify(wallet, null, 2)
    //                 });

    //             } catch (error) {
    //                 logError(error, {
    //                     component: 'Header',
    //                     action: 'handling wallet connection'
    //                 });
    //                 console.error("Failed to connect wallet after callback:", error);
    //                 showConnectionError("Failed to connect wallet. Please try again.");
    //             }
    //         }
    //     };

    //     // Add event listener for our custom event
    //     window.addEventListener('wallet-callback-event', handleWalletCallbackEvent);

    //    // Also check localStorage on mount in case we missed the event
    //     const shouldReconnect = localStorage.getItem('wallet_return_reconnect');
    //     if (shouldReconnect === 'true') {
    //         const publicKey = localStorage.getItem('phantomPublicKey');
    //         const session = localStorage.getItem('phantomSession');

    //         if (publicKey && session) {
    //             console.log("Found wallet data in localStorage, processing...");
    //             logInfo("Found wallet data in localStorage, processing...");

    //             handleWalletCallbackConnection({ publicKey, session });

    //             setTimeout(() => {
    //                 handleWalletCallbackConnection({ publicKey, session });

    //                 // Also manually update the wallet adapter state
    //                 if (wallet && wallet.adapter) {
    //                     try {
    //                         const pubKey = new PublicKey(publicKey);
    //                         wallet.adapter.publicKey = pubKey;
    //                         wallet.adapter.connected = true;

    //                         if (typeof wallet.adapter.emit === 'function') {
    //                             wallet.adapter.emit('connect', pubKey);
    //                         }
    //                     } catch (error) {
    //                         logError(error, {
    //                             component: 'Header',
    //                             action: 'updating wallet from localStorage'
    //                         });
    //                     }
    //                 }
    //             }, 1000);

    //             // Clear the reconnect flag to prevent repeated processing
    //             localStorage.setItem('wallet_return_reconnect', 'false');
    //         }
    //     }

    //     // Clean up the event listener
    //     return () => {
    //         window.removeEventListener('wallet-callback-event', handleWalletCallbackEvent);
    //     };
    // }, [wallet, auth, publicKey]); // Include select and publicKey in dependencies

*/

// 'use client';

// import React, { useState, useEffect } from 'react';
// import Image from 'next/image';
// import Link from 'next/link';
// import { useWallet } from '@solana/wallet-adapter-react';
// import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
// import WalletConnectionModal from './WalletConnectionModal';
// import { FaBars, FaTimes } from 'react-icons/fa';
// import { useAuth } from './FirebaseProvider';
// import { signInWithCustomToken } from 'firebase/auth';
// import { logInfo, logError } from '@/utils/logger';


// export default function Header() {
//     const { publicKey, connected, connect, select, wallet, connecting } = useWallet();
//     const { auth } = useAuth();
//     const [isMenuOpen, setIsMenuOpen] = useState(false);
//     const [showWalletConnectionModal, setShowWalletConnectionModal] = useState(false);
//     const [userProfile, setUserProfile] = useState(null);
//     const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, connecting, success, error
//     const [errorMessage, setErrorMessage] = useState('');
//     const [showErrorToast, setShowErrorToast] = useState(false);
//     const [isMobile, setIsMobile] = useState(false);
//     const [returningFromWalletApp, setReturningFromWalletApp] = useState(false);

//     // Detect if user is on mobile device
//     useEffect(() => {
//         const checkMobile = () => {
//             const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
//                 navigator.userAgent
//             );
//             setIsMobile(isMobileDevice);
//         };

//         checkMobile();
//     }, []);

//     // In Header.jsx - modify the useEffect for wallet-callback-event
// useEffect(() => {
//     const handleWalletCallbackEvent = async (event) => {
//       console.log("Received wallet-callback event:", event.detail);
//       logInfo("Received wallet-callback event:", {
//         component: 'Header'
//       });

//       logInfo('Checking public key', {
//         component: 'Header',
//         publicKey: publicKey
//       });

//       // Check if we have the necessary data
//       if (event.detail && event.detail.publicKey) {
//         try {
//           // Ensure the wallet adapter is ready before attempting connection
//           // Allow time for the adapter to initialize
//           await new Promise(resolve => setTimeout(resolve, 1500));

//           if (!wallet) {
//             const phantomAdapter = new PhantomWalletAdapter();

//             setTimeout(() => {
//                 phantomAdapter.connect().catch((err) => console.error('Auto-reconnect failed:', err));
//             }, 500);
//           }

//           // Select the wallet adapter if not already selected
//         //   if (!wallet) {
//         //     select(new PhantomWalletAdapter());
//         //     // Allow time for selection to complete
//         //     await new Promise(resolve => setTimeout(resolve, 1500));
//         //   }
//           // Now process the connection data without expecting a signature
//           handleWalletCallbackConnection({
//             publicKey: event.detail.publicKey,
//             session: event.detail.session
//           });

//           logInfo("Wallet connected successfully after callback", {});

//           logInfo('Check wallet', {
//             component: 'Header',
//             wallet: JSON.stringify(wallet, null, 2)
//           })

//         } catch (error) {
//           logError(error, {
//             component: 'Header',
//             action: 'handling wallet connection'
//           });
//           console.error("Failed to connect wallet after callback:", error);
//           showConnectionError("Failed to connect wallet. Please try again.");
//         }
//       }
//     };

//     // Add event listener for our custom event
//     window.addEventListener('wallet-callback-event', handleWalletCallbackEvent);

//     // Also check localStorage on mount in case we missed the event
//     const shouldReconnect = localStorage.getItem('wallet_return_reconnect');
//     if (shouldReconnect === 'true') {
//       const publicKey = localStorage.getItem('phantomPublicKey');
//       const session = localStorage.getItem('phantomSession');

//       if (publicKey && session) {
//         console.log("Found wallet data in localStorage, processing...");
//         logInfo("Found wallet data in localStorage, processing...");
//         // Add short delay to ensure components are mounted
//         setTimeout(() => {
//           handleWalletCallbackConnection({ publicKey, session });
//         }, 1000);

//         // Clear the reconnect flag to prevent repeated processing
//         localStorage.setItem('wallet_return_reconnect', 'false');
//       }
//     }

//     // Clean up the event listener
//     return () => {
//       window.removeEventListener('wallet-callback-event', handleWalletCallbackEvent);
//     };
//   }, [wallet, select, auth]); // Include select in dependencies

//     // NEW EFFECT: Listen for wallet-callback event
//     // useEffect(() => {
//     //     const handleWalletCallbackEvent = async (event) => {
//     //         console.log("Received wallet-callback event:", event.detail);

//     //         logInfo("Received wallet-callback event:", {
//     //             component: 'Header'
//     //         });

//     //         await new Promise(resolve => setTimeout(resolve, 1000));

//     //         // Check if we have the necessary data
//     //         if (event.detail && event.detail.publicKey) {
//     //             // Process the wallet connection using the provided data
//     //             //
//     //             try {
//     //                 // Ensure the wallet is selected
//     //                 if (!wallet) {
//     //                     select(new PhantomWalletAdapter());

//     //                     await new Promise(resolve => setTimeout(resolve, 500));
//     //                 }

//     //                 logInfo('Attempting to connect wallet...', {
//     //                     component: 'Header',
//     //                     wallet: wallet?.name || 'No wallet selected'
//     //                 });

//     //                 // Call connect()
//     //                 await connect();

//     //                 handleWalletCallbackConnection(event.detail);

//     //                 logInfo("Wallet connected successfully after callback", {});
//     //             } catch (error) {
//     //                 logError(error, {
//     //                     component: 'Header',
//     //                     action: 'handling wallet connection'
//     //                 });
//     //                 console.error("Failed to connect wallet after callback:", error);
//     //                 showConnectionError("Failed to connect wallet. Please try again.");
//     //             }
//     //         }
//     //     };

//     //     // Add event listener for our custom event
//     //     window.addEventListener('wallet-callback-event', handleWalletCallbackEvent);

//     //     // Also check localStorage on mount in case we missed the event
//     //     const shouldReconnect = localStorage.getItem('wallet_return_reconnect');
//     //     if (shouldReconnect === 'true') {
//     //         const publicKey = localStorage.getItem('phantomPublicKey');
//     //         const session = localStorage.getItem('phantomSession');
//     //         //const signature = localStorage.getItem('phantomSignature');

//     //         if (publicKey && session) {
//     //             logInfo("Found wallet data in localStorage, processing...", {
//     //                 component: 'Header'
//     //             });

//     //             setTimeout(() => {
//     //                 handleWalletCallbackConnection({ publicKey, session });
//     //             }, 1000)
//     //             // Clear the reconnect flag to prevent repeated processing
//     //             localStorage.setItem('wallet_return_reconnect', 'false');
//     //         }
//     //     }

//     //     // Clean up the event listener
//     //     return () => {
//     //         window.removeEventListener('wallet-callback-event', handleWalletCallbackEvent);
//     //     };
//     // }, [auth]); // Only depends on auth being available

//     // Function to handle wallet connection from callback data
//     const handleWalletCallbackConnection = async (walletData) => {
//         try {
//             console.log("Starting wallet callback connection process");
//             setConnectionStatus('connecting');

//             logInfo("Starting wallet callback connection process", {
//                 component: 'Header'
//             });

//             if (!walletData.publicKey || !auth) {
//                 console.log("Wallet connection aborted: publicKey or auth not available");
//                 setConnectionStatus('error');
//                 // Show error message to user
//                 const errorMessage = !walletData.publicKey ? "Wallet not connected properly" : "Authentication service unavailable";
//                 showConnectionError(errorMessage);
//                 logError(
//                     new Error(errorMessage),
//                     {
//                         component: 'Header',
//                         method: 'handleWalletCallbackConnection',
//                         publicKeyAvailable: !!walletData.publicKey,
//                         authAvailable: !!auth,
//                         connectionStatus: 'error'
//                     }
//                 );
//                 return;
//             }

//             console.log(`Checking user in supabase...`);
//             logInfo("Checking user in supabase...", {
//                 component: 'Header'
//             });
//             const userResponse = await fetch(`/api/users?wallet=${walletData.publicKey}`, {
//                 method: 'GET',
//                 headers: { 'Content-Type': 'application/json' }
//             });

//             let user = null;

//             if (userResponse.status === 404) {
//                 // User not found, need to create a new user
//                 console.log("User not found, creating new user...");

//                 logInfo('User not found in database', {
//                     component: "Header"
//                 });
//                 const createUserResponse = await fetch('/api/users', {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify({
//                         wallet_ca: walletData.publicKey,
//                         username: walletData.publicKey.slice(0, 6) // Simple username from public key
//                     })
//                 });

//                 if (!createUserResponse.ok) {
//                     const errorData = await createUserResponse.json();
//                     throw new Error(errorData.error || 'Failed to create user');
//                 }

//                 // Fetch the newly created user
//                 user = await createUserResponse.json();

//                 logInfo('Fetched user', {
//                     component: "Header",
//                     user: JSON.stringify(user, null, 2)
//                 });

//             } else if (!userResponse.ok) {
//                 // Handle other API errors
//                 const errorData = await userResponse.json();
//                 throw new Error(errorData.error || 'Failed to fetch user');
//             } else {
//                 // User exists
//                 user = await userResponse.json();
//             }

//             // Get Firebase custom token
//             console.log("Getting Firebase token for:", walletData.publicKey);
//             logInfo("Getting Firebase token for:", {
//                 component: "Header",
//                 publicKey: walletData.publicKey
//             });

//             const response = await fetch('/api/auth', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ publicKey: walletData.publicKey })
//             });

//             const data = await response.json();

//             if (data.error) {
//                 setConnectionStatus('error');
//                 showConnectionError(`Authentication error: ${data.error}`);
//                 throw new Error(data.error);
//             }

//             console.log("Signing in with custom token...");

//             logInfo("Signing in with custom token...", {
//                 component: "Header"
//             });

//             await signInWithCustomToken(auth, data.token);
//             console.log("Firebase sign in successful");

//             logInfo("Firebase sign in successful", {
//                 component: "Header"
//             });

//             // Set the user profile from the API response
//             setUserProfile(user);
//             setConnectionStatus('success');

//             logInfo('Checking connected value', {
//                 is_connected: connected,
//                 component: 'Header'
//             });
//         } catch (error) {
//             console.error('Error during authentication:', error);
//             setConnectionStatus('error');

//             logError(error, {
//                 component: 'Header',
//                 action: 'Error during authentication'
//             });

//             // Provide specific error messages based on where the failure occurred
//             if (error.message?.includes('Firebase')) {
//                 showConnectionError('Failed to authenticate with the server');
//             } else if (error.message?.includes('token')) {
//                 showConnectionError('Failed to create user session');
//             } else {
//                 showConnectionError(error.message || 'Connection failed, please try again');
//             }
//         }
//     };

//     // Handle visibility changes for mobile wallet connections
//     useEffect(() => {
//         const handleVisibilityChange = () => {
//             // If we're becoming visible again and we're on mobile
//             if (!document.hidden && isMobile && connectionStatus === 'connecting') {
//                 console.log("Returning from wallet app, checking connection...");
//                 setReturningFromWalletApp(true);

//                 // Give a moment for connection to establish
//                 setTimeout(() => {
//                     if (!connected) {
//                         // If still not connected after returning
//                         showConnectionError('Wallet connection not completed. Please try again.');
//                         setConnectionStatus('error');
//                     }
//                     setReturningFromWalletApp(false);
//                 }, 2000);
//             }
//         };

//         document.addEventListener('visibilitychange', handleVisibilityChange);
//         return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
//     }, [isMobile, connectionStatus, connected]);

//     useEffect(() => {
//         if (connected && publicKey && auth) {
//             console.log("Wallet connected:", publicKey.toString());
//             handleWalletConnection();
//         }
//     }, [connected, publicKey, auth]);

//     // Watch connection status changes
//     useEffect(() => {
//         if (connecting) {
//             setConnectionStatus('connecting');
//         } else if (connected) {
//             setConnectionStatus('success');
//             // Reset status after showing success
//             const timer = setTimeout(() => {
//                 setConnectionStatus('idle');
//             }, 3000);
//             return () => clearTimeout(timer);
//         }
//     }, [connecting, connected]);


//     const handleWalletConnection = async () => {
//         try {
//             console.log("Starting wallet connection process");
//             setConnectionStatus('connecting');

//             if (!publicKey || !auth) {
//                 console.log("Wallet connection aborted: publicKey or auth not available");
//                 setConnectionStatus('error');
//                 // Show error message to user
//                 const errorMessage = !publicKey ? "Wallet not connected properly" : "Authentication service unavailable";
//                 showConnectionError(errorMessage);
//                 return;
//             }

//             console.log(`Checking user in supabase...`);
//             const userResponse = await fetch(`/api/users?wallet=${publicKey.toString()}`, {
//                 method: 'GET',
//                 headers: { 'Content-Type': 'application/json' }
//             });

//             let user = null;

//             if (userResponse.status === 404) {
//                 // User not found, need to create a new user
//                 console.log("User not found, creating new user...");
//                 const createUserResponse = await fetch('/api/users', {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify({
//                         wallet_ca: publicKey.toString(),
//                         username: getDefaultUsername()
//                     })
//                 });

//                 if (!createUserResponse.ok) {
//                     const errorData = await createUserResponse.json();
//                     throw new Error(errorData.error || 'Failed to create user');
//                 }

//                 // Fetch the newly created user
//                 user = await createUserResponse.json();
//             } else if (!userResponse.ok) {
//                 // Handle other API errors
//                 const errorData = await userResponse.json();
//                 throw new Error(errorData.error || 'Failed to fetch user');
//             } else {
//                 // User exists
//                 user = await userResponse.json();
//             }

//             // Get Firebase custom token
//             console.log("Getting Firebase token for:", publicKey.toString());
//             const response = await fetch('/api/auth', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ publicKey: publicKey.toString() })
//             });

//             const data = await response.json();

//             if (data.error) {
//                 setConnectionStatus('error');
//                 showConnectionError(`Authentication error: ${data.error}`);
//                 throw new Error(data.error);
//             }

//             console.log("Signing in with custom token...");
//             await signInWithCustomToken(auth, data.token);
//             console.log("Firebase sign in successful");

//             // Set the user profile from the API response
//             setUserProfile(user);
//             setConnectionStatus('success');

//         } catch (error) {
//             console.error('Error during authentication:', error);
//             setConnectionStatus('error');

//             // Provide specific error messages based on where the failure occurred
//             if (error.message?.includes('Firebase')) {
//                 showConnectionError('Failed to authenticate with the server');
//             } else if (error.message?.includes('token')) {
//                 showConnectionError('Failed to create user session');
//             } else {
//                 showConnectionError(error.message || 'Connection failed, please try again');
//             }
//         }
//     };

//     const toggleMenu = () => {
//         setIsMenuOpen(!isMenuOpen);
//     };

//     const closeMenu = () => {
//         setIsMenuOpen(false);
//     };

//     const getDefaultUsername = () => {
//         return publicKey ? publicKey.toBase58().slice(0, 6) : '';
//     };

//     // Function to show error toast with message
//     const showConnectionError = (message) => {
//         setErrorMessage(message);
//         setShowErrorToast(true);

//         // Auto-hide after 5 seconds
//         setTimeout(() => {
//             setShowErrorToast(false);
//         }, 5000);
//     };

//     const WrappedClientWalletLayout = ({ children, className, ...props }) => {
//         return (
//             <div>
//                 {!connected ? (
//                     <div
//                         onClick={() => {
//                             closeMenu(); // Close the burger menu
//                             setShowWalletConnectionModal(true);
//                         }}
//                         className="text-white text-md hover:scale-105 hover:underline cursor-pointer relative"
//                     >
//                         CONNECT WALLET
//                     </div>
//                 ) : (
//                     <Link
//                         href="/profile"
//                         onClick={closeMenu} // Close the burger menu when clicking profile
//                         className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer border border-white hover:scale-105 relative"
//                     >
//                         <Image
//                             src="/images/cool_ruggy.svg"
//                             alt="Profile"
//                             width={20}
//                             height={20}
//                             className="rounded-full"
//                         />
//                         {/* No wallet address displayed as per original design */}
//                         {connectionStatus === 'success' && (
//                             <span className="absolute -top-2 -right-2 h-4 w-4 bg-green-500 rounded-full animate-pulse" />
//                         )}
//                     </Link>
//                 )}

//                 {/* Connection status indicators */}
//                 {connectionStatus === 'connecting' && (
//                     <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-[#1c1c28] text-white text-sm py-1 px-3 rounded-md shadow-lg whitespace-nowrap">
//                         {returningFromWalletApp
//                             ? "Completing connection..."
//                             : "Connecting wallet..."}
//                     </div>
//                 )}
//                 {showErrorToast && (
//                     <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-sm py-1 px-3 rounded-md shadow-lg whitespace-nowrap z-50">
//                         {errorMessage || 'Connection failed, try again'}
//                     </div>
//                 )}
//             </div>
//         );
//     };

//     const MenuItems = () => (
//         <>
//             {/* Navigation Links */}
//             <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
//                 <Link
//                     href="/how-it-works"
//                     className="text-white text-md hover:scale-105 hover:underline"
//                     onClick={closeMenu}
//                 >
//                     HOW IT WORKS
//                 </Link>
//                 <a
//                     href="https://t.me/theruggamesupport"
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="text-white text-md hover:scale-105 hover:underline"
//                     onClick={closeMenu}
//                 >
//                     SUPPORT
//                 </a>

//                 {/* Wallet and Profile Links */}
//                 <div className="flex flex-col md:flex-row items-center gap-4 mt-4 md:mt-0">
//                     <WrappedClientWalletLayout />
//                 </div>
//             </div>
//         </>
//     );

//     return (
//         <header className="w-full relative">
//             {/* Navigation Container */}
//             <div className="flex justify-between items-center w-full px-5 mt-5">
//                 {/* Logo */}
//                 <Link href="/">
//                     <Image
//                         src="/logo.png"
//                         alt="The Rug Game Logo"
//                         width={55}
//                         height={55}
//                         className="cursor-pointer hover:scale-105"
//                     />
//                 </Link>

//                 {/* Hamburger Menu for Mobile */}
//                 <div className="md:hidden">
//                     <button
//                         onClick={toggleMenu}
//                         className="text-white focus:outline-none"
//                         aria-label="Toggle menu"
//                     >
//                         {isMenuOpen ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
//                     </button>
//                 </div>

//                 {/* Desktop Navigation */}
//                 <div className="hidden md:flex items-center gap-6">
//                     <Link href="/how-it-works" className="text-white text-md hover:scale-105 hover:underline">
//                         HOW IT WORKS
//                     </Link>
//                     <a
//                         href="https://t.me/theruggamesupport"
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className="text-white text-md hover:scale-105 hover:underline"
//                     >
//                         SUPPORT
//                     </a>

//                     <WrappedClientWalletLayout />
//                 </div>
//             </div>

//             {/* Mobile Menu Overlay */}
//             {isMenuOpen && (
//                 <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={closeMenu}>
//                     <div
//                         className="fixed top-0 right-0 w-64 h-full bg-gray-800 p-6 transform translate-x-0 transition-transform duration-300 ease-in-out"
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <button
//                             onClick={closeMenu}
//                             className="absolute top-4 right-4 text-white"
//                             aria-label="Close menu"
//                         >
//                             <FaTimes className="w-6 h-6" />
//                         </button>
//                         <MenuItems />
//                     </div>
//                 </div>
//             )}

//             <WalletConnectionModal
//                 isOpen={showWalletConnectionModal}
//                 onClose={() => setShowWalletConnectionModal(false)}
//                 onError={showConnectionError}
//             />

//             {/* Mobile-specific instructions for wallet connection */}
//             {isMobile && connected && connectionStatus === 'connecting' && (
//                 <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-sm py-2 px-4 rounded-md shadow-lg z-50 max-w-xs text-center">
//                     <p>After approving in your wallet app, return to this browser</p>
//                 </div>
//             )}

//             {/* Global error toast for connection issues */}
//             {showErrorToast && (
//                 <div className="fixed bottom-4 right-4 bg-red-600 text-white text-sm py-2 px-4 rounded-md shadow-lg z-50 max-w-xs">
//                     <div className="flex items-center justify-between">
//                         <span>{errorMessage}</span>
//                         <button
//                             onClick={() => setShowErrorToast(false)}
//                             className="ml-2 text-white hover:text-gray-200"
//                         >
//                             ✕
//                         </button>
//                     </div>
//                 </div>
//             )}
//         </header>
//     );
// }