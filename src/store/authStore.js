import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../database/firebase.js';

// Store untuk mengelola state autentikasi
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      userData: null,
      isLoading: true,
      
      // Set user dari Firebase Auth
      setUser: (user) => set({ user }),
      
      // Clear user (logout)
      clearUser: () => set({ user: null, userData: null }),
      
      logout: () => {
        const { user } = get();
        if (user) {
          // Firebase sign out
          import('firebase/auth').then(({ getAuth, signOut }) => {
            const auth = getAuth();
            signOut(auth).then(() => {
              set({ user: null, userData: null });
            }).catch((error) => {
              console.error('Error signing out:', error);
            });
          });
        }
      },

      // Fetch data user tambahan dari Firestore
      fetchUserData: async (userId) => {
        if (!userId) {
          set({ userData: null, isLoading: false });
          return;
        }
        
        try {
          set({ isLoading: true });
          const userDoc = await getDoc(doc(db, 'users', userId));
          
          if (userDoc.exists()) {
            set({ userData: { id: userDoc.id, ...userDoc.data() }, isLoading: false });
          } else {
            console.warn('User document not found in Firestore');
            set({ userData: null, isLoading: false });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          set({ userData: null, isLoading: false });
        }
      },
      
      // Update user data
      updateUserData: (data) => set({ userData: data }),
    }),
    {
      name: 'auth-storage', // Nama untuk localStorage
      // Hanya simpan user ID dan basic info, bukan semua data sensitive
      partialize: (state) => ({ 
        user: state.user ? { 
          uid: state.user.uid, 
          email: state.user.email, 
          displayName: state.user.displayName 
        } : null 
      }),
    }
  )
);

// Listener untuk perubahan auth state
export const setupAuthListener = (auth) => {
  const { setUser, fetchUserData, clearUser } = useAuthStore.getState();
  
  return auth.onAuthStateChanged(async (user) => {
    if (user) {
      setUser(user);
      await fetchUserData(user.uid);
    } else {
      clearUser();
    }
  });
};