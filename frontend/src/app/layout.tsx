import type { Metadata, Viewport } from 'next';
import './globals.css';
import PushNotificationProvider from '@/components/PushNotificationProvider';

const BASE_URL = 'https://selebrityaboki.vercel.app';

export const metadata: Metadata = {
    metadataBase: new URL(BASE_URL),
    title: 'SelebrityAboki Fruit | Fresh Fruits & AI Health Tips',
    description:
        'Get the freshest fruits and personalized AI-powered health recommendations from SelebrityAboki Fruit at Iyana Technical. Order online for delivery.',
    keywords: ['fruits', 'fresh fruits', 'health', 'nutrition', 'Iyana Technical', 'SelebrityAboki'],
    manifest: '/manifest.json',
    openGraph: {
        title: 'SelebrityAboki Fruit | Fresh Fruits & AI Health Tips',
        description: 'Get the freshest fruits and AI health tips from Iyana Technical. Order fresh fruits online.',
        url: BASE_URL,
        siteName: 'SelebrityAboki Fruit',
        type: 'website',
        locale: 'en_NG',
        images: [
            {
                url: '/icons/selebrity.jpg',
                width: 800,
                height: 800,
                alt: 'SelebrityAboki Fruit Logo',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'SelebrityAboki Fruit | Fresh Fruits & AI Health Tips',
        description: 'Fresh fruits & AI-powered health recommendations from Iyana Technical.',
        images: ['/icons/selebrity.jpg'],
    },
    icons: {
        icon: '/icons/icon-192.png',
        apple: '/apple-touch-icon.png',
        shortcut: '/icons/icon-192.png',
    },
};

export const viewport: Viewport = {
    themeColor: '#1a5632',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <PushNotificationProvider />
                {children}
            </body>
        </html>
    );
}
