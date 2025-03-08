'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletConnectionModal from './WalletConnectionModal';
import { FaBars, FaTimes } from 'react-icons/fa';
import UserService from '@/services/UserService';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './FirebaseProvider';
import { signInWithCustomToken } from 'firebase/auth';

const userService = new UserService(supabase);

export default function Header() {
    const { publicKey, connected, wallet, connecting } = useWallet();
    const { auth } = useAuth(); 
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showWalletConnectionModal, setShowWalletConnectionModal] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, connecting, success, error

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
                return;
            }

            console.log(`Checking user in supabase...`);
            const user = await userService.getUserByWallet(publicKey.toString());

            if(!user) {
                console.log("Creating new user...");
                // Create new user if doesn't exist
                await userService.createUser({
                    wallet_ca: publicKey.toString(),
                    username: getDefaultUsername()
                });
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
                throw new Error(data.error);
            }
    
            console.log("Signing in with custom token...");
            await signInWithCustomToken(auth, data.token);
            console.log("Firebase sign in successful");

            // Then check and update userprofile
            await checkUserProfile();
            setConnectionStatus('success');
    
        } catch (error) {
            console.error('Error during authentication:', error);
            setConnectionStatus('error');
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

    const checkUserProfile = async () => {
        if (!userProfile && publicKey) {
          const user = await userService.getUserByWallet(publicKey.toString());
          setUserProfile(user);
        }
    };
     
    const WrappedClientWalletLayout = ({ children, className, ...props }) => {
        return (
            <>
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
                        Connecting wallet...
                    </div>
                )}
                {connectionStatus === 'error' && (
                    <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-sm py-1 px-3 rounded-md shadow-lg whitespace-nowrap">
                        Connection failed, try again
                    </div>
                )}
            </>
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
            />
        </header>
    );
}