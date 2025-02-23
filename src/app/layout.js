import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import { WalletProviderComponent } from '@/components/WalletProvider';
import { FirebaseProvider } from "@/components/FirebaseProvider";
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
        <FirebaseProvider>
        <WalletProviderComponent>
          <Header />
          {children}
          <Footer />
        </WalletProviderComponent>
        </FirebaseProvider>
      </body>
    </html>
  );
}
