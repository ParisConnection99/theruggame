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
import { Alfa_Slab_One } from "next/font/google";

const alfaSlabOne = Alfa_Slab_One({
  subsets: ['latin'],
  weight: "400"
});

const userService = new UserService(supabase);

export default function Header() {
    const { publicKey, connected, wallet } = useWallet();
    const { auth } = useAuth(); 
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showWalletConnectionModal, setShowWalletConnectionModal] = useState(false);
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        if (connected && publicKey) {
            console.log("Wallet connected:", publicKey.toString());
            handleWalletConnection();
        }
    }, [connected, publicKey]);

    const handleWalletConnection = async () => {
        try {
            console.log("Starting wallet connection process");
            if (!publicKey) return;
    
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
    
        } catch (error) {
            console.error('Error during authentication:', error);
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

    const WrappedClientWalletLayout = ({ children, className, ...props }) => {
        return (
            <>
                {!connected ? (
                    <div 
                        onClick={() => {
                            closeMenu(); // Close the burger menu
                            setShowWalletConnectionModal(true);
                        }}
                        className={`${alfaSlabOne.className} text-white text-md hover:scale-105 hover:underline cursor-pointer`}
                    >
                        CONNECT WALLET
                    </div>
                ) : (
                    <Link 
                        href="/profile"
                        onClick={closeMenu} // Close the burger menu when clicking profile
                        className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer border border-white hover:scale-105"
                    >
                        <Image
                            src="/images/pepe.webp"
                            alt="Profile"
                            width={20}
                            height={20}
                            className="rounded-full"
                        />
                        <span className="text-white text-sm">
                            {getDefaultUsername()}
                        </span>
                    </Link>
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
                    className={`${alfaSlabOne.className} text-white text-md hover:scale-105 hover:underline`}
                    onClick={closeMenu}
                >
                    HOW IT WORKS
                </Link>
                <a
                    href="https://t.me/theruggamegroup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${alfaSlabOne.className} text-white text-md hover:scale-105 hover:underline`}
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
            <div className="w-[calc(100%-2rem)] h-10 bg-blue-300 flex items-center justify-center rounded-lg ml-4 mt-4 mr-4 gap-4 px-4">
                <Image
                    className="rounded-full"
                    src="/images/pepe.webp"
                    alt="banner"
                    width={25}
                    height={25}
                    priority
                />
                <h1 className="text-black text-sm font-semibold">
                    MoneyMagnet bet 3 SOL ($600) on HoodAI to Rug 🚀
                </h1>
            </div>

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
                    <Link href="/how-it-works" className={`${alfaSlabOne.className} text-white text-md hover:scale-105 hover:underline`}>
                        HOW IT WORKS
                    </Link>
                    <a
                        href="https://t.me/theruggamegroup"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${alfaSlabOne.className} text-white text-md hover:scale-105 hover:underline`}
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