
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
    const [connectionInProgress, setConnectionInProgress] = useState(false);
    const [connectionError, setConnectionError] = useState('');

    useEffect(() => {
        if (connected && publicKey && auth) {
            console.log("Wallet connected:", publicKey.toString());
            handleWalletConnection();
        }
    }, [connected, publicKey, auth]);
    
    const handleWalletConnection = async () => {
        try {
            setConnectionInProgress(true);
            setConnectionError('');
            
            console.log("Starting wallet connection process");
            if (!publicKey || !auth) {
                console.log("Wallet connection aborted: publicKey or auth not available");
                setConnectionInProgress(false);
                return;
            }

            console.log(`Checking user in supabase...`);
            const user = await userService.getUserByWallet(publicKey.toString());

            console.log(`User: ${user}`);

            if(!user) {
                console.log("Creating new user...");
                // Create new user if doesnt exist
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
            console.log("Response from auth endpoint:", data);
    
            if (data.error) {
                throw new Error(data.error);
            }
    
            console.log("Signing in with custom token...");
            await signInWithCustomToken(auth, data.token);
            console.log("Firebase sign in successful");

            // Then check and update userprofile
            await checkUserProfile();
            
            setConnectionInProgress(false);
        } catch (error) {
            console.error('Error during authentication:', error);
            setConnectionError(error.message || 'Failed to complete wallet connection');
            setConnectionInProgress(false);
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
                        className={`text-white text-md hover:scale-105 hover:underline cursor-pointer flex items-center gap-2
                            ${(connecting || connectionInProgress) ? 'opacity-70 pointer-events-none' : ''}`}
                    >
                        {(connecting || connectionInProgress) ? (
                            <>
                                <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse"></div>
                                CONNECTING...
                            </>
                        ) : (
                            "CONNECT WALLET"
                        )}
                    </div>
                ) : (
                    <Link 
                        href="/profile"
                        onClick={closeMenu} // Close the burger menu when clicking profile
                        className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer border border-white hover:scale-105"
                    >
                        <Image
                            src="/images/cool_ruggy.svg"
                            alt="Profile"
                            width={20}
                            height={20}
                            className="rounded-full"
                        />
                        {/* <span className="text-white text-sm">
                            {getDefaultUsername()}
                        </span> */}
                    </Link>
                )}
                
                {/* Connection error toast */}
                {connectionError && (
                  <div className="fixed bottom-4 right-4 bg-red-900 text-white p-3 rounded shadow-lg z-50 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-bold">Connection Error</p>
                      <p className="text-sm">{connectionError}</p>
                    </div>
                    <button 
                      onClick={() => setConnectionError('')}
                      className="ml-2 text-white"
                    >
                      ✕
                    </button>
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
            {/* Top Banner */}

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