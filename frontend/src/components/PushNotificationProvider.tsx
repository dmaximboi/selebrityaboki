'use client';

import { useEffect } from 'react';
import { notificationsApi } from '@/lib/api';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer as ArrayBuffer;
}

async function subscribeUserToPush(registration: ServiceWorkerRegistration) {
    try {
        // Fetch VAPID public key from backend
        const { publicKey } = await notificationsApi.getVapidPublicKey();
        if (!publicKey) return;

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        // Send subscription to backend
        await notificationsApi.subscribe(subscription);

        console.log('[PWA] Push subscription registered');
    } catch (err) {
        console.warn('[PWA] Push subscription failed:', err);
    }
}

export default function PushNotificationProvider() {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        const register = async () => {
            try {
                const registration = await navigator.serviceWorker.ready;

                // Check existing permission
                if (Notification.permission === 'granted') {
                    await subscribeUserToPush(registration);
                    return;
                }

                if (Notification.permission === 'denied') return;

                // Ask for permission after a short delay (better UX)
                setTimeout(async () => {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        await subscribeUserToPush(registration);
                    }
                }, 3000);
            } catch (err) {
                console.warn('[PWA] Service worker not ready:', err);
            }
        };

        register();
    }, []);

    // This component renders nothing — it's purely a side-effect provider
    return null;
}
