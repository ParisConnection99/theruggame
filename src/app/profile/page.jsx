'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/components/FirebaseProvider';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import UserService from '@/services/UserService';
import UserProfileService from '@/services/UserProfileService';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';
import UsernameChangePopup from '@/components/UsernameChangePopup';

const userService = new UserService(supabase);
const userProfileService = new UserProfileService(supabase);

export default function ProfilePage() {
    const { disconnect } = useWallet();
    const { user: authUser, auth } = useAuth();
    const [userData, setUserData] = useState(null);
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Popup state
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    // Fetch user data when user auth changes
    useEffect(() => {
        const fetchUserData = async () => {
            if (authUser && authUser.uid) {
                try {
                    setLoading(true);
                    // Fetch user data from your database using authUser.uid
                    const dbUser = await userService.getUserByWallet(authUser.uid);
                    setUserData(dbUser);
                } catch (error) {
                    console.error("Error fetching user data:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
                setUserData(null);
            }
        };

        fetchUserData();
    }, [authUser]);

    // Fetch the users bet history
    useEffect(() => {
        const fetchBets = async () => {
            // Only proceed if we have valid userData with an ID
            if (userData && userData.user_id) {
                try {
                    setLoading(true);

                    const betsData = await userProfileService.fetchBetsBy(userData.user_id);
                    console.log(`Bets: ${betsData}`);
                    if (betsData) {
                        setBets(betsData);
                    }
                } catch (error) {
                    console.error('Error fetching bets:', error);
                    // Keep showing sample data or empty state on error
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchBets();
    }, [userData]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            await disconnect();
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleCashOut = async () => {
        alert('Never we are keeping all your money!.');
    };

    const handleEditProfile = async () => {
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

            await userService.updateUser(userData.user_id, updatedData);
            
            // Update local state
            setUserData({
                ...userData,
                username: newUsername
            });
            
            return true;
        } catch (error) {
            console.error("Error updating username:", error);
            throw new Error("Failed to update username");
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <h1 className="text-center">Welcome to the Profile Page!</h1>

            <div className="flex justify-center">
                <div className="flex flex-col items-center">
                    <Image
                        className="rounded-full"
                        src="/images/pepe.webp"
                        alt="profile picture"
                        width={75}
                        height={75}
                        priority
                    />

                    <h1 className="text-white mt-3 font-bold text-m">Wallet Ca: {userData ? `${userData.wallet_ca.substring(0, 10)}...` : "-"}</h1>
                    <h2 className="font-bold text-m">Balance: {userData ? `${userData.balance} SOL` : "-"}</h2>
                    <button
                        className="text-m mt-3 mb-3 cursor-pointer hover:scale-105"
                        onClick={handleEditProfile}>[Edit Profile]</button>

                    {/* --- List Of Bets --- */}
                    <div className="mt-6 w-full max-w-md">
                        <h3 className="text-l font-bold mb-2 text-center">Bet History</h3>
                        {bets.length > 0 ? (
                            <div className="bg-gray-800 rounded-lg p-3 w-full">
                                <div className="grid grid-cols-4 gap-x-4 text-sm text-gray-400 mb-2 font-semibold">
                                    <div className="col-span-1">Date</div>
                                    <div className="col-span-1">Amount</div>
                                    <div className="col-span-1">Result</div>
                                    <div className="col-span-1">Profit</div>
                                </div>

                                {bets.map((bet) => (
                                    <div key={bet.id} className="grid grid-cols-4 gap-x-4 text-sm py-2 border-t border-gray-700">
                                        <div>{new Date(bet.created_at).toLocaleDateString()}</div>
                                        <div>{bet.matched_amount} SOL</div>
                                        <div className={
                                            bet.status === 'WON'
                                                ? 'text-green-500'
                                                : bet.status === 'LOST'
                                                    ? 'text-red-500'
                                                    : ''
                                        }>
                                            {bet.status === 'WON' || bet.status === 'LOST' ? bet.status : ''}
                                        </div>
                                        <div className={
                                            bet.status === 'WON'
                                                ? 'text-green-500'
                                                : bet.status === 'LOST'
                                                    ? 'text-red-500'
                                                    : ''
                                        }>
                                            {bet.status === 'WON'
                                                ? `${bet.matched_amount} SOL`
                                                : bet.status === 'LOST'
                                                    ? `-${bet.matched_amount} SOL`
                                                    : ''}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 bg-gray-800 rounded-lg">
                                
                            </div>
                        )}
                    </div>
                    <h4 className="text-gray-500 text-sm mt-4">JOINED AT: 12/01/2025</h4>
                </div>
            </div>
            <div>
                <button
                    onClick={handleSignOut}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                >
                    Sign Out
                </button>

                <button
                    onClick={handleCashOut}
                    className="bg-green-600 hover:bg-green-400 text-white px-4 py-2 rounded ml-5">
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
        </div>
    );
}