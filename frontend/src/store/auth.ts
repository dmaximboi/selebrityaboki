/**
 * Auth Store (Zustand)
 * 
 * Manages authentication state across the app
 */

import { create } from 'zustand';
import { authApi, setAccessToken } from '../lib/api';

interface User {
    id: string;
    email: string;
    name: string;
    avatar: string;
    role: 'USER' | 'ADMIN' | 'SUPERADMIN';
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;

    setUser: (user: User | null) => void;
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    isAdmin: false,

    setUser: (user) =>
        set({
            user,
            isAuthenticated: !!user,
            isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPERADMIN',
        }),

    login: async (token: string) => {
        setAccessToken(token);
        try {
            const user = await authApi.getMe();
            set({
                user,
                isAuthenticated: true,
                isAdmin: user.role === 'ADMIN' || user.role === 'SUPERADMIN',
                isLoading: false,
            });
        } catch {
            setAccessToken(null);
            set({ user: null, isAuthenticated: false, isAdmin: false, isLoading: false });
        }
    },

    logout: async () => {
        try {
            await authApi.logout();
        } catch {
            // Continue logout even if API fails
        }
        setAccessToken(null);
        set({ user: null, isAuthenticated: false, isAdmin: false });
    },

    checkAuth: async () => {
        set({ isLoading: true });
        try {
            // Try to refresh token (using cookie)
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/refresh`,
                { method: 'POST', credentials: 'include' }
            );

            if (res.ok) {
                const data = await res.json();
                setAccessToken(data.accessToken);

                const user = await authApi.getMe();
                set({
                    user,
                    isAuthenticated: true,
                    isAdmin: user.role === 'ADMIN' || user.role === 'SUPERADMIN',
                    isLoading: false,
                });
            } else {
                set({ isLoading: false });
            }
        } catch {
            set({ isLoading: false });
        }
    },
}));
