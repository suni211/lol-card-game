import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));

        // Force immediate localStorage update for real-time sync
        const currentState = get();
        if (currentState.user) {
          const storageData = {
            state: {
              user: currentState.user,
              token: currentState.token,
              isAuthenticated: currentState.isAuthenticated,
            },
            version: 0,
          };
          localStorage.setItem('auth-storage', JSON.stringify(storageData));
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
