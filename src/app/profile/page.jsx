'use client';
import { useAuth } from '@/components/FirebaseProvider';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import UsernameChangePopup from '@/components/UsernameChangePopup';
import CashoutModal from '@/components/CashoutModal';
import BetShareModal from '@/components/BetShareModal'; // Import the BetShareModal component
import { useAnalytics } from '@/components/FirebaseProvider';
import { logEvent } from 'firebase/analytics';
import { UAParser } from 'ua-parser-js';
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

    // Computed overall loading state
    const isLoading = userLoading || betsLoading || cashoutsLoading;

    const router = useRouter();

    // Popup state
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    //logInfo(`Profile Page re-render is user connected: ${connected}`);

    logInfo('Auth user', {
        user: authUser,
        component: 'Profile page'
    });
    // Fetch user data when user auth changes
    useEffect(() => {
        const fetchUserData = async () => {
            if (!authUser || !authUser.uid) {
                setUserLoading(false);
                setUserData(null);
                return;
            }

            logInfo('Before token id token fetching', {
                component: 'Profile Page'
            });
            const token = await authUser.getIdToken();

            logInfo('User token', {
                token: token,
                component: 'Profile Page'
            });

            try {
                setUserLoading(true);
                //const response = await fetch(`/api/users?wallet=${authUser.uid}`);
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
                console.error("Error fetching user data:", error);
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

    // Fetch the users bet history - only runs when userData is available
    useEffect(() => {
        const fetchBets = async () => {
            if (!userData || !userData.user_id) {
                return;
            }

            try {
                setBetsLoading(true);
                const response = await fetch(`/api/betting/user/${userData.user_id}`);

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
                console.error('Error fetching bets:', error);
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
            if (!userData || !userData.user_id) {
                return;
            }

            try {
                setCashoutsLoading(true);
                const response = await fetch(`/api/cashouts/users/${userData.user_id}`);

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
                console.error('Error fetching users cashouts: ', error);
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

    const handleSignOut = async () => {
        if (analytics) {
            logEvent(analytics, 'signout_button_click', {
                page: 'profile',
                timestamp: new Date()
            });
        }
        try {
            //await signOut(auth);
            //await disconnect();

            // Add event
            const walletEvent = new CustomEvent('wallet-disconnect-event', {
                timestamp: new Date()
            });

            window.dispatchEvent(walletEvent);

            logInfo('Signing out - event dispatched', {
                component: 'ProfilePage',
                action: 'sign out'
            });

            //await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay

            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
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
            alert(`You do not have enough funds to cash out.`);
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
                alert(`You can only change your username once per week. Please try again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`);
                return;
            }
        }

        // If username_created_at is null or if it's been more than 7 days, allow editing
        setIsPopupOpen(true);
    };

    const handleSaveUsername = async (newUsername) => {
        if (!userData || !userData.user_id) {
            throw new Error("User data not available");
        }

        try {
            // Update username in your database
            const updatedData = {
                username: newUsername,
                username_changed_at: new Date().toISOString(),
            };

            await fetch('/api/users', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userData.user_id,
                    ...updatedData
                }),
            });


            // Update local state
            setUserData({
                ...userData,
                username: newUsername,
                username_changed_at: new Date().toISOString()
            });

            return true;
        } catch (error) {
            console.error("Error updating username:", error);
            logEvent(analytics, 'profile_page_error', {
                error_message: error.message,
                error_code: error.code || 'unknown'
            });
            throw new Error("Failed to update username");
        }
    };

    const handleCashoutSubmit = async ({ walletAddress, amount }) => {
        const deviceInfo = {
            browser: parser.getBrowser(),
            device: parser.getDevice(),
            os: parser.getOS()
        };

        try {

            const response = await fetch('/api/cashouts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userData.user_id,
                    amount: amount,
                    wallet_ca: walletAddress,
                    device_info: deviceInfo
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

            // Add the new cashout to the cashouts list
            setCashouts([newCashout, ...cashouts]);

            alert('Your cashout request has been submitted and is pending approval.');
        } catch (error) {
            console.error('Error processing cashout:', error);
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
                    <h2 className="font-bold text-sm">Balance: {userData.balance} SOL</h2>
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
                                            {cashout.status}
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
                            <div className="bg-gray-800 rounded-lg p-3 w-full overflow-x-auto">
                                <table className="w-full table-fixed">
                                    <thead>
                                        <tr className="text-sm text-gray-400">
                                            <th className="w-[25%] p-1 text-left">Date</th>
                                            <th className="w-[15%] p-1 text-left">Amount</th>
                                            <th className="w-[20%] p-1 text-left">Result</th>
                                            <th className="w-[25%] p-1 text-left">Profit</th>
                                            <th className="w-[15%] p-1 text-center">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bets.map((bet) => (
                                            <tr key={bet.id} className="text-sm border-t border-gray-700">
                                                <td className="p-1 truncate">
                                                    {new Date(bet.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-1 truncate">
                                                    {bet.matched_amount} SOL
                                                </td>
                                                <td className={`p-1 truncate ${bet.status === 'WON' || bet.status === 'REFUNDED'
                                                    ? 'text-green-500'
                                                    : bet.status === 'LOST'
                                                        ? 'text-red-500'
                                                        : ''
                                                    }`}>
                                                    {bet.status === 'WON' || bet.status === 'LOST' || bet.status === 'REFUNDED' ? bet.status : ''}
                                                </td>
                                                <td className={`p-1 truncate ${bet.status === 'WON' || bet.status === 'REFUNDED'
                                                    ? 'text-green-500'
                                                    : bet.status === 'LOST'
                                                        ? 'text-red-500'
                                                        : ''
                                                    }`}>
                                                    {bet.status === 'WON' || bet.status === 'REFUNDED'
                                                        ? `${bet.matched_amount} SOL`
                                                        : bet.status === 'LOST'
                                                            ? `-${bet.matched_amount} SOL`
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
                                        ))}
                                    </tbody>
                                </table>
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