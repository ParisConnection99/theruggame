import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import ClientProviders from '@/components/ClientProviders';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import '@solana/wallet-adapter-react-ui/styles.css';
import ActivityBanner from '@/components/ActivityBanner';
import { GlobalErrorHandler } from '@/components/GlobalErrorHandler'; // Adjust path as needed
import { Analytics } from '@vercel/analytics/next';

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
      <head>
        <title>The Rug Game</title>
        <link rel="icon" href="/favicon.ico?v=1" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta property="og:title" content="The Rug Game" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://theruggame.fun/logo.png" />
        <meta property="og:description" content="Guess pump or rug correctly & win Big!" />
        <meta property="og:url" content="https://theruggame.fun" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="The Rug Game" />
        <meta name="twitter:description" content="Guess pump or rug correctly & win Big!" />
        <meta name="twitter:image" content="https://theruggame.fun/logo.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-blue-900`}>
        <GlobalErrorHandler>
          <ClientProviders>
            <ActivityBanner />
            <Header />
            {children}
            <Analytics />
            <Footer />
          </ClientProviders>
        </GlobalErrorHandler>
      </body>
    </html>
  );
}