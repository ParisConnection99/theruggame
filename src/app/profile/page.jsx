'use client';
import { useAuth } from '@/components/FirebaseProvider';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import UsernameChangePopup from '@/components/UsernameChangePopup';
import CashoutModal from '@/components/CashoutModal';
import BetShareModal from '@/components/BetShareModal'; // Import the BetShareModal component
import { useAnalytics } from '@/components/FirebaseProvider';
import { logEvent } from 'firebase/analytics';
import { UAParser } from 'ua-parser-js';
import { showToast } from '@/components/CustomToast';
import { logActivity } from '@/utils/LogActivity';
import { errorLog } from '@/utils/ErrorLog';
import { listenToUserPendingBets } from '@/services/PendingBetsRealtimeService';
import { logInfo, logError } from '@/utils/logger';

export default function ProfilePage() {
    const { user: authUser, auth } = useAuth();
    const parser = new UAParser();
    const analytics = useAnalytics();
    const [userData, setUserData] = useState(null);
    const [bets, setBets] = useState([]);
    const [cashouts, setCashouts] = useState([]);
    const [isCashoutModalOpen, setIsCashoutModalOpen] = useState(false);

    // Add state for BetShareModal
    const [selectedBet, setSelectedBet] = useState(null);
    const [isBetShareModalOpen, setIsBetShareModalOpen] = useState(false);

    // Separate loading states for each data type
    const [userLoading, setUserLoading] = useState(true);
    const [betsLoading, setBetsLoading] = useState(false);
    const [cashoutsLoading, setCashoutsLoading] = useState(false);
    const [pendingBetsLoading, setPendingBetsLoading] = useState(false);
    const [expandedBets, setExpandedBets] = useState({});

    // Pending Bets
    const [pendingBets, setPendingBets] = useState([]);

    // Computed overall loading state
    const isLoading = userLoading || betsLoading || cashoutsLoading;

    const router = useRouter();

    // Popup state
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    // Fetch user data when user auth changes
    useEffect(() => {
        const fetchUserData = async () => {
            if (!authUser || !authUser.uid) {
                setUserLoading(false);
                setUserData(null);
                return;
            }

            const token = await authUser.getIdToken();

            try {
                setUserLoading(true);

                const response = await fetch(`/api/users`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }

                const dbUser = await response.json();
                setUserData(dbUser);
            } catch (error) {
                await errorLog("USER_FETCH_ERROR",
                    error.message || 'Error object with empty message',
                    error.stack || "no stack trace available",
                    "PROFILE",
                    "SERIOUS");
                logEvent(analytics, 'profile_page_error', {
                    error_message: error.message,
                    error_code: error.code || 'unknown'
                });

                setUserData(null);
            } finally {
                setUserLoading(false);
            }
        };

        fetchUserData();
    }, [authUser]);

    // 3. Format SOL amounts consistently
    const formatSol = (amount) => {
        return parseFloat(amount).toFixed(2);
    };

    const calculateWinAmount = (bet) => {
        if (!bet.matches || bet.matches.length === 0) {
            return 0;
        }

        let totalWinAmount = 0;
        bet.matches.forEach(match => {
            // Determine which odds to use based on bet type
            const oddsToUse = bet.bet_type === 'PUMP' ? match.pump_odds : match.rug_odds;

            // Calculate win amount for this match
            const winAmountForMatch = parseFloat(match.amount) * oddsToUse;
            totalWinAmount += winAmountForMatch;
        });

        return totalWinAmount;
    };

    // Fetch the users bet history - only runs when userData is available
    useEffect(() => {
        const fetchBets = async () => {
            if (!userData || !userData.user_id || !authUser) {
                return;
            }

            try {
                setBetsLoading(true);
                const token = await authUser.getIdToken();

                const response = await fetch(`/api/betting/user/${userData.user_id}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch bets');
                }

                const betsData = await response.json();

                if (betsData) {
                    const sortedBets = betsData.sort((a, b) => {
                        return new Date(b.created_at) - new Date(a.created_at);
                    });

                    setBets(sortedBets);
                } else {
                    setBets([]);
                }
            } catch (error) {
                await errorLog("FETCHING_BETS_ERROR",
                    error.message || 'Error object with empty message',
                    error.stack || "no stack trace available",
                    "PROFILE",
                    "SERIOUS");
                logEvent(analytics, 'profile_page_error', {
                    error_message: error.message,
                    error_code: error.code || 'unknown'
                });
                setBets([]);
            } finally {
                setBetsLoading(false);
            }
        };

        fetchBets();
    }, [userData]);

    // Fetch the users cashouts - only runs when userData is available
    useEffect(() => {
        const fetchCashouts = async () => {
            if (!userData || !userData.user_id || !authUser) {
                return;
            }

            try {
                setCashoutsLoading(true);
                const token = await authUser.getIdToken();

                const response = await fetch(`/api/cashouts/users/${userData.user_id}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch bets');
                }

                const cashoutsData = await response.json();

                if (cashoutsData) {
                    const sortedCashouts = cashoutsData.sort((a, b) => {
                        return new Date(b.created_at) - new Date(a.created_at);
                    });

                    setCashouts(sortedCashouts);
                } else {
                    setCashouts([]);
                }
            } catch (error) {
                await errorLog("FETCHING_CASHOUTS_ERROR",
                    error.message || 'Error object with empty message',
                    error.stack || "no stack trace available",
                    "PROFILE",
                    "SERIOUS");
                logEvent(analytics, 'profile_page_error', {
                    error_message: error.message,
                    error_code: error.code || 'unknown'
                });
                setCashouts([]);
            } finally {
                setCashoutsLoading(false);
            }
        };

        fetchCashouts();
    }, [userData]);

    // Fetch Pending Bets
    useEffect(() => {
        if (!userData || !userData.user_id || !authUser) {
            return;
        }

        const fetchPendingBets = async () => {
            try {

                setPendingBetsLoading(true);
                const uid = authUser.uid;
                const token = await authUser.getIdToken();

                const response = await fetch(`/api/pending-bets/${uid}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error);
                }

                const pendingBets = await response.json();

                if (pendingBets && pendingBets.length > 0) {
                    // Sort by date/timestamp (assuming there's a property like 'createdAt' or 'timestamp')
                    const sortedBets = pendingBets.sort((a, b) => {
                        // For date strings
                        return new Date(b.inserted_at) - new Date(a.inserted_at);

                        // OR if you have a timestamp number
                        // return b.timestamp - a.timestamp;
                    });

                    setPendingBets(sortedBets);
                } else {
                    setPendingBets([]);
                }

            } catch (error) {
                await errorLog("FETCHING_PENDING_BETS_ERROR",
                    error.message || 'Error object with empty message',
                    error.stack || "no stack trace available",
                    "PROFILE",
                    "SERIOUS");
            } finally {
                setPendingBetsLoading(false);
            }
        }

        fetchPendingBets();
    }, [userData]);
    // Listen for pending bets updates
    useEffect(() => {
        if (!userData || !userData.user_id || !authUser) {
            return;
        }

        const setupSubscription = async () => {
            const userId = userData.user_id;

            const handlePendingBetsUpdate = (update) => {
                switch (update.type) {
                    case 'INSERT':
                        setPendingBets(prev => [...prev, update.payload]);
                        break; // You were missing this break statement

                    case 'UPDATE':
                        // If status is complete, remove the bet from pending bets
                        if (update.payload.status === 'complete') {
                            setPendingBets(prev =>
                                prev.filter(bet => bet.id !== update.payload.id)
                            );
                        } else {
                            // Otherwise update the bet in the state
                            setPendingBets(prev =>
                                prev.map(bet =>
                                    bet.id === update.payload.id ? update.payload : bet
                                )
                            );
                        }
                        break;

                    default:
                        break;
                }
            };

            // Import and set up the real-time listener
            const subscription = await listenToUserPendingBets(userId, handlePendingBetsUpdate);

            // Clean up subscription when component unmounts or auth changes
            return () => {
                subscription?.unsubscribe();
            };
        };

        const cleanup = setupSubscription();

        // Return the cleanup function for when the component unmounts
        return () => {
            cleanup.then(cleanupFn => cleanupFn && cleanupFn());
        };
    }, [userData]);

    const handleSignOut = async () => {
        if (analytics) {
            logEvent(analytics, 'signout_button_click', {
                page: 'profile',
                timestamp: new Date()
            });
        }
        try {

            // Add event
            const walletEvent = new CustomEvent('wallet-disconnect-event', {
                timestamp: new Date()
            });

            window.dispatchEvent(walletEvent);

            router.push('/');
        } catch (error) {
            await errorLog("DISPATCHING_SIGNOUT_EVENT_ERROR",
                error.message || 'Error object with empty message',
                error.stack || "no stack trace available",
                "PROFILE",
                "SERIOUS");
            logEvent(analytics, 'profile_page_error', {
                error_message: error.message,
                error_code: error.code || 'unknown'
            });
        }
    };

    const handleCashOut = async () => {
        if (analytics) {
            logEvent(analytics, 'cashout_button_click', {
                page: 'profile',
                timestamp: new Date()
            });
        }

        if (!userData || userData.balance <= 0) {
            showToast('You do not have enough funds to cashout', 'error');
            return;
        }

        setIsCashoutModalOpen(true);
    };

    // Add handler for bet sharing
    const handleBetShare = (bet) => {
        if (analytics) {
            logEvent(analytics, 'bet_share_click', {
                page: 'profile',
                bet_id: bet.id,
                timestamp: new Date()
            });
        }

        setSelectedBet(bet);
        setIsBetShareModalOpen(true);
    };

    const handleEditProfile = async () => {
        if (analytics) {
            logEvent(analytics, 'edit_profile_button_click', {
                page: 'profile',
                timestamp: new Date()
            });
        }
        // Check if username was created in the last 7 days
        if (userData.username_changed_at) {
            const createdAt = new Date(userData.username_changed_at);
            const currentDate = new Date();
            const differenceInTime = currentDate - createdAt;
            const differenceInDays = differenceInTime / (1000 * 3600 * 24);

            if (differenceInDays < 7) {
                // Username was changed less than 7 days ago
                const daysRemaining = Math.ceil(7 - differenceInDays);
                showToast(`You can only change your username once per week. Please try again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`, 'warning');
                return;
            }
        }

        // If username_created_at is null or if it's been more than 7 days, allow editing
        setIsPopupOpen(true);
    };

    const handleSaveUsername = async (newUsername) => {
        if (!userData || !userData.user_id || !authUser) {
            throw new Error("User data not available");
        }

        try {
            // Update username in your database
            const updatedData = {
                username: newUsername,
                username_changed_at: new Date().toISOString(),
            };

            const token = await authUser.getIdToken();

            const response = await fetch('/api/users/username_check', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: newUsername }),
            });

            if (!response.ok) {
                if (response.status === 409) {
                    return false; // Return false to indicate failure
                }

                const errorData = await response.json();
                throw new Error(`Error updating username: ${errorData.error || 'Unknown error'}`);
            }

            await logActivity('username_changed', auth);

            // Update local state
            setUserData({
                ...userData,
                username: newUsername,
                username_changed_at: new Date().toISOString()
            });

            return true; // Return true to indicate success
        } catch (error) {
            await errorLog("UPDATING_USERNAME_ERROR",
                error.message || 'Error object with empty message',
                error.stack || "no stack trace available",
                "PROFILE",
                "MILD",
                `${authUser?.uid}` || "");
            logEvent(analytics, 'profile_page_error', {
                error_message: error.message,
                error_code: error.code || 'unknown'
            });
            throw new Error("Failed to update username");
        }
    };

    const handleCashoutSubmit = async ({ walletAddress, amount }) => {
        if (!authUser) {
            throw new Error("User data not available");
        }

        try {
            const deviceInfo = {
                browser: parser.getBrowser(),
                device: parser.getDevice(),
                os: parser.getOS()
            };

            const token = await authUser.getIdToken();

            const response = await fetch('/api/cashouts', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: amount,
                    device_info: deviceInfo,
                    wallet_address: walletAddress
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create cashout');
            }

            const newCashout = await response.json();

            // Update the user's balance
            const updatedBalance = userData.balance - amount;

            // Update local state
            setUserData({
                ...userData,
                balance: updatedBalance
            });

            await logActivity('cash_out_submitted', auth);

            // Add the new cashout to the cashouts list
            setCashouts([newCashout, ...cashouts]);

            showToast('Your cashout request has been submitted and is pending approval.', 'success');
        } catch (error) {
            await errorLog("CASHOUT_SUBMIT_ERROR",
                error.message || 'Error object with empty message',
                error.stack || "no stack trace available",
                "PROFILE",
                "SERIOUS",
                `${authUser?.uid}` || "");
            logEvent(analytics, 'profile_page_error', {
                error_message: error.message,
                error_code: error.code || 'unknown'
            });
            throw new Error('Failed to process your cashout. Please try again.');
        }
    };

    // Loading UI
    if (userLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="rounded-full bg-gray-700 h-20 w-20"></div>
                    <div className="h-4 bg-gray-700 rounded w-48"></div>
                    <div className="h-4 bg-gray-700 rounded w-32"></div>
                </div>
            </div>
        );
    }

    // No user data
    if (!userData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <p className="text-center">Unable to load user profile. Please sign in again.</p>
                <button
                    onClick={() => router.push('/')}
                    className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded cursor-pointer"
                >
                    Return to Home
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <h1 className="text-center text-sm font-bold">Welcome {userData.username}</h1>

            <div className="flex justify-center">
                <div className="flex flex-col items-center">
                    <Image
                        className="rounded-full"
                        src="/images/cool_ruggy.svg"
                        alt="profile picture"
                        width={75}
                        height={75}
                        priority
                    />

                    <h1 className="text-white mt-3 font-bold text-sm">Wallet Ca: {userData.wallet_ca.substring(0, 10)}...</h1>
                    <h2 className="font-bold text-sm">Balance: {formatSol(userData.balance)} SOL</h2>
                    <button
                        className="text-m mt-3 mb-3 cursor-pointer hover:scale-105"
                        onClick={handleEditProfile}>[Edit Profile]</button>

                    {/* --- List of cashouts --- */}
                    <div className="mt-6 w-full max-w-md">
                        <h3 className="text-l font-bold mb-2 text-center">Cashout History</h3>
                        {cashoutsLoading ? (
                            <div className="bg-gray-800 rounded-lg p-3 animate-pulse">
                                <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                                <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                                <div className="h-4 bg-gray-700 rounded w-full"></div>
                            </div>
                        ) : cashouts.length > 0 ? (
                            <div className="bg-gray-800 rounded-lg p-3 w-full">
                                <div className="grid grid-cols-3 gap-x-4 text-sm text-gray-400 mb-2 font-semibold">
                                    <div className="col-span-1">Date</div>
                                    <div className="col-span-1">Amount</div>
                                    <div className="col-span-1">Status</div>
                                </div>

                                {cashouts.map((cashout) => (
                                    <div key={cashout.id} className="grid grid-cols-3 gap-x-4 text-sm py-2 border-t border-gray-700">
                                        <div>{new Date(cashout.created_at).toLocaleDateString()}</div>
                                        <div>{cashout.amount} SOL</div>
                                        <div className={
                                            cashout.status === 'completed'
                                                ? 'text-green-500'
                                                : 'text-red-500'
                                        }>
                                            {cashout.status.toUpperCase()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 bg-gray-800 rounded-lg">
                                <p className="text-gray-400">No cashout history</p>
                            </div>
                        )}
                    </div>

                    {/* --- List Of Pending Bets --- */}
                    <div className="mt-6 w-full max-w-md">
                        <h3 className="text-l font-bold mb-2 text-center">Pending Bets</h3>
                        {pendingBets.length > 0 ? (
                            <div className="bg-gray-800 rounded-lg p-3 w-full overflow-x-auto">
                                <table className="w-full table-fixed">
                                    <thead>
                                        <tr className="text-sm text-gray-400">
                                            <th className="w-[15%] p-1 text-left" title="Date">📅</th>
                                            <th className="w-[20%] p-1 text-left" title="ID">🆔</th>
                                            <th className="w-[25%] p-1 text-left" title="Name">🏷️</th>
                                            <th className="w-[20%] p-1 text-left" title="Amount">💰</th>
                                            <th className="w-[20%] p-1 text-left" title="Status">⏳</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingBets.map((bet) => (
                                            <tr key={bet.id} className="text-sm border-t border-gray-700">
                                                <td className="p-1 truncate">
                                                    {new Date(bet.inserted_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-1 truncate">
                                                    {bet.id}
                                                </td>
                                                <td className="p-1 truncate">
                                                    {bet.token_name || 'Unknown'}
                                                </td>
                                                <td className="p-1 truncate">
                                                    {bet.amount} SOL
                                                </td>
                                                <td className={`p-1 truncate ${bet.status === 'pending'
                                                    ? 'text-yellow-500'
                                                    : bet.status === 'processing'
                                                        ? 'text-blue-500'
                                                        : bet.status === 'error'
                                                            ? 'text-red-500'
                                                            : ''
                                                    }`}>
                                                    {bet.status.toUpperCase()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-4 bg-gray-800 rounded-lg">
                                <p className="text-gray-400">No pending bets</p>
                            </div>
                        )}
                    </div>

                    {/* --- List Of Bets --- */}
                    <div className="mt-6 w-full max-w-md">
                        <h3 className="text-l font-bold mb-2 text-center">Bet History</h3>
                        {betsLoading ? (
                            <div className="bg-gray-800 rounded-lg p-3 animate-pulse">
                                <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                                <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                                <div className="h-4 bg-gray-700 rounded w-full"></div>
                            </div>
                        ) : bets.length > 0 ? (
                            <div className="bg-gray-800 rounded-lg p-3 w-full overflow-hidden">
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full min-w-full table-fixed">
                                        <thead>
                                            <tr className="text-sm text-gray-400">
                                                <th className="w-[10%] p-1 text-center"></th>
                                                <th className="w-[25%] p-1 text-left" title="Name">🏷️</th>
                                                <th className="w-[25%] p-1 text-left" title="Result">🎯</th>
                                                <th className="w-[30%] p-1 text-left" title="Profit">📈</th>
                                                <th className="w-[10%] p-1 text-center" title="Share">📤</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bets.map((bet) => (
                                                <React.Fragment key={bet.id}>
                                                    <tr className="text-sm border-t border-gray-700">
                                                        <td className="p-1 text-center">
                                                            <button
                                                                onClick={() => {
                                                                    setExpandedBets(prev => ({
                                                                        ...prev,
                                                                        [bet.id]: !prev[bet.id]
                                                                    }));
                                                                }}
                                                                className="text-gray-400 hover:text-white focus:outline-none"
                                                            >
                                                                {expandedBets[bet.id] ? '▼' : '▶'}
                                                            </button>
                                                        </td>
                                                        <td className="p-1 truncate">
                                                            {bet.token_name || 'Unknown'}
                                                        </td>
                                                        <td className={`p-1 truncate ${bet.status === 'WON' || bet.status === 'REFUNDED'
                                                                ? 'text-green-500'
                                                                : bet.status === 'LOST'
                                                                    ? 'text-red-500'
                                                                    : ''
                                                            }`}>
                                                            {bet.status === 'WON' || bet.status === 'LOST' || bet.status === 'REFUNDED'
                                                                ? bet.status
                                                                : ''}
                                                        </td>
                                                        <td className={`p-1 truncate ${bet.status === 'WON' || bet.status === 'REFUNDED'
                                                                ? 'text-green-500'
                                                                : bet.status === 'LOST'
                                                                    ? 'text-red-500'
                                                                    : ''
                                                            }`}>
                                                            {bet.status === 'WON'
                                                                ? `+${formatSol(bet.matched_amount)} SOL`
                                                                : bet.status === 'LOST'
                                                                    ? `-${formatSol(bet.matched_amount)} SOL`
                                                                    : bet.status === 'REFUNDED'
                                                                        ? `${formatSol(bet.refund_amount)} SOL`
                                                                        : ''}
                                                        </td>
                                                        <td className="p-1 text-center">
                                                            {(bet.status === 'WON' || bet.status === 'LOST') &&
                                                                <span
                                                                    className="cursor-pointer hover:opacity-75"
                                                                    title="Share bet result"
                                                                    onClick={() => handleBetShare(bet)}
                                                                >
                                                                    📋
                                                                </span>
                                                            }
                                                        </td>
                                                    </tr>

                                                    {/* Expanded details row */}
                                                    {expandedBets[bet.id] && (
                                                        <tr>
                                                            <td colSpan="5" className="p-0">
                                                                <div className="bg-gray-700 p-3 text-sm rounded mx-2 mb-2 overflow-hidden">
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-gray-400">Date:</span>
                                                                            <span className="font-medium break-words">
                                                                                {new Date(bet.created_at).toLocaleDateString()}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-gray-400">Matched amount:</span>
                                                                            <span className="font-medium break-words">
                                                                                {formatSol(bet.matched_amount)} SOL
                                                                            </span>
                                                                        </div>

                                                                        {bet.refund_amount > 0 && (
                                                                            <div className="flex flex-col">
                                                                                <span className="text-gray-400">Refunded amount:</span>
                                                                                <span className="font-medium text-green-500 break-words">
                                                                                    {formatSol(bet.refund_amount)} SOL
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        {bet.status === 'WON' && (
                                                                            <div className="flex flex-col">
                                                                                <span className="text-gray-400">Payout:</span>
                                                                                <span className="font-medium text-green-500 break-words">
                                                                                    {formatSol(calculateWinAmount(bet))} SOL
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        {(bet.status === 'PENDING' || bet.status === 'ACTIVE') && (
                                                                            <div className="flex flex-col">
                                                                                <span className="text-gray-400">Potential win:</span>
                                                                                <span className="font-medium break-words">
                                                                                    {formatSol(calculateWinAmount(bet))} SOL
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        <div className="flex flex-col">
                                                                            <span className="text-gray-400">Bet type:</span>
                                                                            <span className="font-medium break-words">
                                                                                {bet.bet_type}
                                                                            </span>
                                                                        </div>

                                                                        <div className="flex flex-col">
                                                                            <span className="text-gray-400">Status:</span>
                                                                            <span className="font-medium break-words">
                                                                                {bet.status || 'PENDING'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 bg-gray-800 rounded-lg">
                                <p className="text-gray-400">No bet history</p>
                            </div>
                        )}
                    </div>
                    <h4 className="text-gray-500 text-sm mt-4">JOINED AT: {userData.created_at ? new Date(userData.created_at).toLocaleDateString() : "12/01/2025"}</h4>
                </div>
            </div>
            <div>
                <button
                    onClick={handleSignOut}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded cursor-pointer"
                    disabled={isLoading}
                >
                    Sign Out
                </button>

                <button
                    onClick={handleCashOut}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded ml-5 cursor-pointer"
                    disabled={isLoading || userData.balance <= 0}
                >
                    Cash Out
                </button>
            </div>

            {/* Username Change Popup */}
            <UsernameChangePopup
                isOpen={isPopupOpen}
                onClose={() => setIsPopupOpen(false)}
                onSave={handleSaveUsername}
                currentUsername={userData?.username || ""}
            />

            {/* Cashout Modal */}
            <CashoutModal
                isOpen={isCashoutModalOpen}
                onClose={() => setIsCashoutModalOpen(false)}
                onSubmit={handleCashoutSubmit}
                maxAmount={userData?.balance || 0}
                defaultWallet={userData?.wallet_ca || ""}
            />

            {/* Bet Share Modal */}
            <BetShareModal
                isOpen={isBetShareModalOpen}
                onClose={() => setIsBetShareModalOpen(false)}
                bet={selectedBet}
            />
        </div>
    );
}