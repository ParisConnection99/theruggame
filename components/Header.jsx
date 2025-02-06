'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaTelegram, FaTwitter, FaInstagram } from 'react-icons/fa';
import { ClientWalletLayout } from './ClientWalletLayout';
import { useWallet } from '@solana/wallet-adapter-react';

export default function Header() {
    const { connected } = useWallet();

    return (
        <header className="w-full">
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

            {/* Navigation Menu */}
            <div className="flex justify-between items-center w-full px-5 mt-5">
                <div className="flex flex-col">
                    {/* Logo and Navigation Links */}
                    <div className="flex items-center gap-6">
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
                        {/* Navigation Links */}
                        <div className="flex items-center gap-6">
                            <Link href="/how-it-works" className="text-white text-md hover:scale-105 hover:underline">
                                {`<how it works>`}
                            </Link>
                            <a
                                href="https://t.me/theruggamegroup"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white text-md hover:scale-105 hover:underline"
                            >
                                {`<support>`}
                            </a>
                        </div>
                    </div>

                    {/* Social Media Row */}
                    <div className="flex items-center gap-6 ml-[75px]">
                        <a href="https://telegram.org" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500">
                            <FaTelegram className="w-5 h-5" />
                        </a>
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">
                            <FaTwitter className="w-5 h-5" />
                        </a>
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">
                            <FaInstagram className="w-5 h-5" />
                        </a>
                    </div>
                </div>

                {/* Right Section: Connect Wallet */}
                <div className="flex flex-col items-end gap-2">
                    <ClientWalletLayout className="text-white text-md hover:scale-105 hover:underline">
                        {'<connect wallet>'}
                    </ClientWalletLayout>
                    {connected && (
                        <Link href="/profile" className="text-white text-md hover:scale-105 hover:underline">
                            {'<view profile>'}
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}