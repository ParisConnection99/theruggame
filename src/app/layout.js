import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import { WalletProviderComponent } from '@/components/WalletProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import '@solana/wallet-adapter-react-ui/styles.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "The Rug Game",
  description: "Guess pump or rug correctly & win Big!",
};

export default function RootLayout({ children }) {
  return (

    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900`}
      >
        <WalletProviderComponent>
          <Header />
          {children}
          <Footer />
        </WalletProviderComponent>

      </body>
    </html>
  );
}
