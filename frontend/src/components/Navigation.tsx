'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { authApi } from '@/lib/api';

export default function Navigation() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { user, isAuthenticated, isAdmin, logout } = useAuthStore();
    const totalItems = useCartStore((s) => s.totalItems());

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogin = () => {
        // Save current page so we can return after sign-in
        const returnTo = window.location.pathname + window.location.search;
        if (returnTo !== '/' && !returnTo.startsWith('/auth')) {
            localStorage.setItem('auth_return_to', returnTo);
        }
        window.location.href = authApi.getGoogleAuthUrl();
    };

    return (
        <nav className={`nav ${scrolled ? 'nav-scrolled' : 'nav-scrolled'}`}>
            <div className="nav-inner">
                <Link href="/" className="nav-logo">
                    <Image
                        src="/selebrity.jpg"
                        alt="SelebrityAboki Fruit Logo"
                        width={32}
                        height={32}
                        style={{ borderRadius: '50%', objectFit: 'cover' }}
                    />
                    SelebrityAboki Fruit
                </Link>

                <ul className={`nav-links ${mobileOpen ? 'open' : ''}`}>
                    <li>
                        <Link href="/" className="nav-link" onClick={() => setMobileOpen(false)}>
                            Home
                        </Link>
                    </li>
                    <li>
                        <Link href="/shop" className="nav-link" onClick={() => setMobileOpen(false)}>
                            Shop
                        </Link>
                    </li>
                    <li>
                        <Link href="/ramadan" className="nav-link" onClick={() => setMobileOpen(false)} style={{ color: '#daa520', fontWeight: 600 }}>
                            🌙 Ramadan
                        </Link>
                    </li>
                    <li>
                        <Link href="/ai-advisor" className="nav-link" onClick={() => setMobileOpen(false)}>
                            Health Advisor
                        </Link>
                    </li>
                    <li>
                        <Link href="/tips" className="nav-link" onClick={() => setMobileOpen(false)}>
                            Daily Tips
                        </Link>
                    </li>
                    <li>
                        <Link href="/contact" className="nav-link" onClick={() => setMobileOpen(false)}>
                            Contact
                        </Link>
                    </li>
                    <li>
                        <Link href="/location" className="nav-link" onClick={() => setMobileOpen(false)}>
                            Find Us
                        </Link>
                    </li>
                </ul>

                <div className="nav-actions">
                    {isAuthenticated && (
                        <Link href="/shop" className="btn btn-ghost btn-sm" style={{ position: 'relative' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <path d="M16 10a4 4 0 01-8 0" />
                            </svg>
                            {totalItems > 0 && (
                                <span
                                    style={{
                                        position: 'absolute', top: -4, right: -4,
                                        background: 'var(--color-accent)', color: 'white',
                                        width: 18, height: 18, borderRadius: '50%',
                                        fontSize: '0.7rem', fontWeight: 700,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                >
                                    {totalItems}
                                </span>
                            )}
                        </Link>
                    )}

                    {isAuthenticated ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {isAdmin && (
                                <Link href="/selebme" className="btn btn-sm btn-outline">
                                    Admin
                                </Link>
                            )}
                            <button onClick={logout} className="btn btn-ghost btn-sm">
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleLogin} className="btn btn-primary btn-sm">
                            Sign In
                        </button>
                    )}

                    <button
                        className="nav-mobile-toggle"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        <span />
                        <span />
                        <span />
                    </button>
                </div>
            </div>
        </nav>
    );
}
