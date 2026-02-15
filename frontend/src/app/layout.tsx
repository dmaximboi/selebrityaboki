import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'SelebrityAboki Fruit | Fresh Fruits & AI Health Tips',
    description:
        'Get the freshest fruits and personalized AI-powered health recommendations from SelebrityAboki Fruit at Iyana Technical. Order online for delivery.',
    keywords: ['fruits', 'fresh fruits', 'health', 'nutrition', 'Iyana Technical', 'SelebrityAboki'],
    manifest: '/manifest.json',
    openGraph: {
        title: 'SelebrityAboki Fruit',
        description: 'Fresh Fruits & AI Health Tips from Iyana Technical',
        type: 'website',
        locale: 'en_NG',
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
                <link rel="apple-touch-icon" href="/icon-192.png" />
            </head>
            <body>{children}</body>
        </html>
    );
}
