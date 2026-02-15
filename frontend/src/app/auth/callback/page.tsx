'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Suspense } from 'react';

function CallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { login } = useAuthStore();

    useEffect(() => {
        // Read token from the temporary cookie handoff
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return null;
        };

        const token = getCookie('auth_token_handoff');

        if (token) {
            // Clear the temporary cookie immediately
            document.cookie = 'auth_token_handoff=; Max-Age=0; path=/;';

            login(token).then(() => {
                router.push('/');
            });
        } else {
            router.push('/');
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
