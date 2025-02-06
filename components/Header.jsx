'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaTelegram, FaTwitter, FaInstagram } from 'react-icons/fa';
import { ClientWalletLayout } from './ClientWalletLayout';

export default function Header() {
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
            {/* Left Section: Logo, Nav Links, and Social Media */}
            <div className="flex flex-col">
              {/* Logo and Navigation Links */}
              <div className="flex items-center gap-6">
                {/* Logo */}
                <Link href="/">
                  <Image
                    src="/logo.png" // Change this to your actual logo path
                    alt="The Rug Game Logo"
                    width={55}
                    height={55}
                    className="cursor-pointer"
                  />
                </Link>
                {/* Navigation Links */}
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

              {/* Social Media Row - Properly Centered */}
              <div className="flex items-center gap-6 mt-1 ml-[75px]">
                <a
                  href="https://telegram.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-500"
                >
                  <FaTelegram className="w-6 h-6" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400"
                >
                  <FaTwitter className="w-6 h-6" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400"
                >
                  <FaInstagram className="w-6 h-6" />
                </a>
              </div>
            </div>

            {/* Right Section: Connect Wallet */}
            <ClientWalletLayout className="text-white text-md hover:scale-105 hover:underline">
              {'<connect wallet>'}
            </ClientWalletLayout>
          </div>
        </header>
  );
}