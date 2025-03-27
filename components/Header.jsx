'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from './FirebaseProvider';
import { signOut } from 'firebase/auth';
import { signInWithCustomToken } from 'firebase/auth';
import { logInfo, logError } from '@/utils/logger';
import { handlePhantomConnect, handlePhantomDisconnection, handleCleanup } from '@/utils/PhantomConnectAction';
import { UAParser } from 'ua-parser-js';
import { LogActivity } from '@/components/LogActivity';

export default function Header() {
    const { publicKey, connected, connect, disconnect, select, wallet, connecting } = useWallet();
    const { auth } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showWalletConnectionModal, setShowWalletConnectionModal] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, connecting, success, error, disconnected
    const [errorMessage, setErrorMessage] = useState('');
    const [showErrorToast, setShowErrorToast] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [returningFromWalletApp, setReturningFromWalletApp] = useState(false);
    const [isEffectivelyConnected, setIsEffectivelyConnected] = useState(false);
    const parser = new UAParser();

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
            setConnectionStatus('success');
        }
    }, [connected, publicKey]);

    // < -- HANDLE DESKTOP CONNECTIONS --> 

    const handleDesktopWalletConnection = async () => {
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
            showConnectionError('Connection failed, please try again');
        }
    };

    const handleDesktopDisconnect = async () => {
        try {
            await signOut(auth);

            if (connected) {
                await disconnect();
                // Clear any stored session data
                setIsEffectivelyConnected(false);
                logInfo('Desktop wallet disconnected', {
                    component: 'Header',
                    walletState: {
                        connected: connected,
                        publicKey: publicKey?.toString()
                    }
                });
            }
        } catch (error) {
            logError(error, {
                component: 'Header',
                action: 'desktop wallet disconnect'
            });
            throw error;
        }
    };

    useEffect(() => {
        const handleAsyncEffect = async () => {
            try {
                if (connected && publicKey && auth) {
                    logInfo("Wallet connected:", {
                        publicKey: publicKey.toString(),
                    });
                    await handleDesktopUserConnection();
                    setIsEffectivelyConnected(true);
                }
            } catch (error) {
                logError(error, {
                    component: "Header",
                    action: "Handling wallet connection",
                });
            }
        };

        handleAsyncEffect();
    }, [connected, publicKey, auth]);

    const handleDesktopUserConnection = async () => {
        try {
            await connectDesktopUser(publicKey);
        } catch (error) {
            logError(error, {
                component: 'Header',
                action: 'Connecting user'
            })
        }
    };

    const connectDesktopUser = async (publicKey) => {
        try {
            setConnectionStatus("connecting");

            if (!publicKey || !auth) {
                const errorMessage = !publicKey
                    ? "Wallet not connected properly"
                    : "Authentication service unavailable";

                setConnectionStatus("error");
                showConnectionError(errorMessage);
                return;
            }

            // Fetch Firebase custom token
            const response = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ publicKey: publicKey.toString() }),
            });

            const data = await response.json();

            if (data.error) {
                logInfo("Error fetching Firebase custom token", {
                    component: "Header",
                    error: data.error,
                });

                setConnectionStatus("error");
                showConnectionError("Error authenticating user.");
                throw new Error(data.error);
            }

            // Sign in with the custom token
            await signInWithCustomToken(auth, data.token);
            
            // Instead of fetching the user we want to check if the user exists
            const userResponse = await fetch(`/api/users/check`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
                },
            });

            if (!userResponse.ok) {
                const errorData = await userResponse.json();
                throw new Error(errorData.error || "Failed to check if user exists.");
            }

            setConnectionStatus("success");
            await handleLogActivity('user_login');
        } catch (error) {
            console.error("Error during authentication:", error);
            setConnectionStatus("error");

            if (error.message?.includes("Firebase")) {
                showConnectionError("Connection failed, please try again");
            } else if (error.message?.includes("token")) {
                showConnectionError("Connection failed, please try again");
            } else {
                showConnectionError("Connection failed, please try again");
            }
        }
    }

    const handleLogActivity = async (type, additional_meta = "Nothing much rn.") => {
        if (!auth || !auth.currentUser) {
            logInfo("Unable to log activity User data not available", {});
        }

        logInfo('Handling log activity', {});

        try {
            const deviceInfo = {
                browser: parser.getBrowser(),
                device: parser.getDevice(),
                os: parser.getOS()
            };

            const token = await auth.currentUser?.getIdToken();

            const activityResponse = await fetch(`/api/activity_log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    action_type: type,
                    device_info: deviceInfo,
                    additional_metadata: additional_meta 
                }),
            });
        
            // Handle response
            if (!activityResponse.ok) {
                const errorData = await activityResponse.json();
                logInfo('Activity Log Error', {
                    error: errorData,
                    timestamp: new Date(),
                });
                throw new Error(`Failed to log activity: ${errorData.error || 'Unknown error'}`);
            }
        } catch(error) {
           console.error(error);
        }
        
    };

    // < -- HANDLE MOBILE CONNECTIONS -- >
    const handleMobileDisconnect = async () => {
        const uid = auth.currentUser.uid;

        try {
            await signOut(auth);

            logInfo('UID',{
                component: 'Header',
                uid: uid
            });

            const url = await disconnectFromPhantom(uid);

            logInfo('Fetched disconnect url', {
                component: 'Header',
                url: url
            });

            try {
                window.location.href = url;
            } catch (error) {
                logError(error, {
                    component: 'Header',
                    action: 'disconnect user from phantom'
                });
                throw error;
            }

            setIsEffectivelyConnected(false);

            // Remove data
            await cleanup(uid);

        } catch (error) {
            logError(error, {
                component: 'Header',
                action: 'mobile disconnect'
            });
            throw error;
        }
    };

    const disconnectFromPhantom = async (uid) => {
        if (!uid) {
            throw new Error('Key needed to disconnect.');
        }

        logInfo('Disconnect from phantom.', {
            component: 'Header'
        });

        try {
            const response = await handlePhantomDisconnection(uid);
            return response;
        } catch (error) {
            console.error('Error disconnecting from phantom: ',error);
        }
    }

    const cleanup = async (uid) => {
        if (!uid) {
            throw new Error('Key needed to cleanup.');
        }

        logInfo('Cleaning session data,', {});

        try {
            await handleCleanup(uid);
        } catch (error) {
            logError(error, {
                component: 'Header',
                action: 'Cleaning data'
            });
        }
    }

    // Listen for wallet disconnect event
    useEffect(() => {
        let isDisconnecting = false;

        const handleWalletDisconnect = async () => {
            if (isDisconnecting) {
                logInfo('Disconnect already in progress, ignoring call', {
                    component: 'Header'
                });
                return;
            }

            isDisconnecting = true;

            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent
            );

            try {
                logInfo('Disconnect triggered', {
                    component: 'Header',
                    isMobile: isMobileDevice,
                    hasSession: !!window.localStorage.getItem('phantomSession')
                });

                await handleLogActivity('user_logout');

                if (isMobileDevice) {
                    await handleMobileDisconnect();
                } else {
                    await handleDesktopDisconnect();
                }

                window.removeEventListener('wallet-disconnect-event', handleWalletDisconnect);

            } catch (error) {
                logError(error, {
                    component: 'Header',
                    action: 'wallet disconnect'
                });
            } finally {
                isDisconnecting = false;
            }
        };

        window.addEventListener('wallet-disconnect-event', handleWalletDisconnect);
        return () => window.removeEventListener('wallet-disconnect-event', handleWalletDisconnect);
    }, [connected, disconnect]);

    const connectToPhantom = async () => {
        try {
            const response = await handlePhantomConnect();
            return response;
        } catch (error) {
            console.error('Error connecting to phantom: ',error);
        }
    };

    const handleMobileWalletConnection = async () => {
        if (!isMobile) return;

        try {
            setConnectionStatus('connecting');
            localStorage.setItem('wallet_connect_pending', 'true');
            localStorage.setItem('wallet_connect_timestamp', Date.now().toString());

            logInfo('Connecting to phantom connect', {
                component: 'Header'
            });

            //const  { deepLink, id } = await phantomConnect.connect();
            const { deepLink, id } = await connectToPhantom();

            localStorage.setItem('session_id', id);

            try {
                window.location.href = deepLink;
            } catch (error) {
                logError(error, {
                    component: 'Header',
                    action: 'connecting phantom wallet'
                });
                throw error;
            }

        } catch (error) {
            logError(error, {
                component: 'Header',
                action: 'Error during mobile wallet connection'
            });
            setConnectionStatus('error');
            showConnectionError('Connection failed, please try again');
        }
    };

    // Function to handle wallet connection from callback data
    const handleWalletCallbackConnection = async (walletData) => {
        try {
            await connectMobileUser(walletData.publicKey);
        } catch (error) {
            logError(error, {
                component: 'Header',
                action: 'Connecting user'
            })
        }
    };

    // Handle mobile wallet callback
    useEffect(() => {
        const handleWalletCallbackEvent = async (event) => {
            try {
                setConnectionStatus('connecting');

                logInfo('Recieved wallet-callback event', {
                    component: 'Header',
                    publicKey: event.detail.publicKey
                });

                // Process the connection with the received data
                if (event.detail.publicKey) {
                    logInfo('Handle wallet callback connection', {});
                    await handleWalletCallbackConnection({
                        publicKey: event.detail.publicKey
                    });

                    setConnectionStatus('success');
                    setIsEffectivelyConnected(true);
                } else {
                    logInfo('Public Key is null', { component: 'Header' });
                }


            } catch (error) {
                setConnectionStatus('error');
                showConnectionError('Connection failed, please try again');
                logError(error, {
                    component: 'Header',
                    action: 'Error during wallet callback'
                });
            }
        };

        window.addEventListener('wallet-callback-event', handleWalletCallbackEvent);
        return () => window.removeEventListener('wallet-callback-event', handleWalletCallbackEvent);
    }, []);
    
    const connectMobileUser = async (publicKey) => {
        try {
            setConnectionStatus("connecting");

            if (!publicKey || !auth) {
                const errorMessage = !publicKey
                    ? "Wallet not connected properly"
                    : "Authentication service unavailable";

                setConnectionStatus("error");
                showConnectionError(errorMessage);
                return;
            }

            // Fetch Firebase custom token
            const response = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ publicKey: publicKey.toString() }),
            });

            const data = await response.json();

            if (data.error) {
                logInfo("Error fetching Firebase custom token", {
                    component: "Header",
                    error: data.error,
                });

                setConnectionStatus("error");
                showConnectionError("Error authenticating user.");
                throw new Error(data.error);
            }

            // Sign in with the custom token
            const userCredential = await signInWithCustomToken(auth, data.token);
            logInfo("Firebase sign-in successful", {
                component: "Header",
                user: userCredential.user,
            });

            // Instead of fetching the user we want to check if the user exists
            const userResponse = await fetch(`/api/users/check`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
                },
            });

            if (!userResponse.ok) {
                const errorData = await userResponse.json();
                throw new Error(errorData.error || "Failed to check if user exists.");
            }

            setConnectionStatus("success");

            await handleLogActivity('user_login');
        } catch (error) {
            console.error("Error during authentication:", error);
            setConnectionStatus("error");

            if (error.message?.includes("Firebase")) {
                showConnectionError("Connection failed, please try again");
            } else if (error.message?.includes("token")) {
                showConnectionError("Connection failed, please try again");
            } else {
                showConnectionError("Connection failed, please try again");
            }
        }
    }

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
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
                            if (connectionStatus === 'connecting') return;

                            if (isMobile) {
                                handleMobileWalletConnection();
                            } else {
                                handleDesktopWalletConnection();
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