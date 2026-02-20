'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Suspense } from 'react';

function CallbackContent() {
    const router = useRouter();
    const { login } = useAuthStore();

    useEffect(() => {
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return null;
        };

        const token = getCookie('auth_token_handoff');

        if (token) {
            // Consume the cookie immediately
            document.cookie = 'auth_token_handoff=; Max-Age=0; path=/auth/callback;';

            login(token).then(() => {
                // Redirect to the page they came from, or home
                const returnTo = localStorage.getItem('auth_return_to') || '/';
                localStorage.removeItem('auth_return_to');
                router.replace(returnTo);
            });
        } else {
            // No token — cookie might be blocked (sameSite issue).
            // Try a token refresh using the httpOnly refreshToken cookie.
            fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/refresh`,
                { method: 'POST', credentials: 'include' }
            )
                .then(async (res) => {
                    if (res.ok) {
                        const data = await res.json();
                        await login(data.accessToken);
                        const returnTo = localStorage.getItem('auth_return_to') || '/';
                        localStorage.removeItem('auth_return_to');
                        router.replace(returnTo);
                    } else {
                        router.replace('/');
                    }
                })
                .catch(() => router.replace('/'));
        }
    }, [login, router]);

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', flexDirection: 'column', gap: 16,
        }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
            <p style={{ color: 'var(--color-text-light)' }}>Signing you in...</p>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh', flexDirection: 'column', gap: 16,
            }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
                <p style={{ color: 'var(--color-text-light)' }}>Loading...</p>
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
