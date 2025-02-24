'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/components/FirebaseProvider'; 
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
   const { disconnect } = useWallet();
   const { auth } = useAuth();
   const router = useRouter();

   const handleSignOut = async () => {
       try {
           await signOut(auth);
           await disconnect();
           router.push('/');
       } catch (error) {
           console.error('Error signing out:', error);
       }
   };

   return (
       <div className="flex flex-col items-center gap-4 p-4">
           <h1 className="text-center">Welcome to the Profile Page!</h1>
           <button 
               onClick={handleSignOut}
               className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
           >
               Sign Out
           </button>
       </div>
   );
}