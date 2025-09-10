import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { user, userData, isLoading, clearUser } = useAuthStore();
  
  return {
    user,
    userData,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: userData?.role === 'admin',
    isAuthor: userData?.role === 'author' || userData?.role === 'admin',
    logout: clearUser
  };
};
