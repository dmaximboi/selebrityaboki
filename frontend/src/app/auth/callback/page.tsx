'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuthStore();

    useEffect(() => {
        // Token is passed in the URL as ?t=<accessToken>
        // This avoids cross-origin cookie issues (render.com ≠ vercel.app)
        const token = searchParams.get('t');

        const returnTo = localStorage.getItem('auth_return_to') || '/';
        localStorage.removeItem('auth_return_to');

        if (token) {
            login(decodeURIComponent(token)).then(() => {
                // Remove token from URL then redirect
                router.replace(returnTo);
            });
        } else {
            // No token in URL — sign-in failed or user navigated here directly
            router.replace('/');
        }
    }, [login, router, searchParams]);

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
