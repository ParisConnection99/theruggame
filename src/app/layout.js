import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import Head from "next/head"; // Ensure this import is here
import ClientProviders from '@/components/ClientProviders';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import '@solana/wallet-adapter-react-ui/styles.css';
import ActivityBanner from '@/components/ActivityBanner'; 
import { GlobalErrorHandler } from '@/components/GlobalErrorHandler'; // Adjust path as needed

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Head>
        <title>The Rug Game</title>
        <meta name="description" content="Guess pump or rug correctly & win Big!" />
        
        {/* Open Graph metadata for wallets */}
        <meta property="og:title" content="The Rug Game" />
        <meta property="og:description" content="Guess pump or rug correctly & win Big!" />
        <meta property="og:url" content="https://theruggame.fun/" />
        <meta property="og:site_name" content="The Rug Game" />
        <meta property="og:image" content="https://theruggame.fun/images/logo1.png" />
        <meta property="og:type" content="website" />

        {/* Twitter Card metadata */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="The Rug Game" />
        <meta name="twitter:description" content="Guess pump or rug correctly & win Big!" />
        <meta name="twitter:image" content="https://theruggame.fun/images/logo1.png" />

        {/* Favicon & Icons */}
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-blue-900`}>
        <GlobalErrorHandler>
          <ClientProviders>
            <ActivityBanner />
            <Header />
            {children}
            <Footer />
          </ClientProviders>
        </GlobalErrorHandler>
      </body>
    </html>
  );
}
