'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useAuthStore } from '@/store/auth';

export default function HomePage() {
    const { checkAuth } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <>
            <Navigation />

            {/* HERO SECTION */}
            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <span className="hero-tag">Iyana Technical's Finest</span>
                        <h1 className="hero-title">
                            Fresh Fruits, <span>Healthier Life</span>
                        </h1>
                        <p className="hero-description">
                            At SelebrityAboki Fruit, we source the freshest, highest-quality fruits
                            daily. Get personalized health recommendations from our AI-powered
                            fruit advisor and have fresh produce delivered to your door.
                        </p>
                        <div className="hero-actions">
                            <Link href="/shop" className="btn btn-primary btn-lg">
                                Shop Now
                            </Link>
                            <Link href="/ai-advisor" className="btn btn-outline btn-lg">
                                Ask Our Health Advisor
                            </Link>
                        </div>
                        <div className="hero-stats">
                            <div>
                                <div className="hero-stat-value">500+</div>
                                <div className="hero-stat-label">Happy Customers</div>
                            </div>
                            <div>
                                <div className="hero-stat-value">10+</div>
                                <div className="hero-stat-label">Fruit Varieties</div>
                            </div>
                            <div>
                                <div className="hero-stat-value">Daily</div>
                                <div className="hero-stat-label">Fresh Sourcing</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ABOUT SECTION */}
            <section className="section" style={{ background: 'white' }}>
                <div className="container">
                    <span className="hero-tag">Who We Are</span>
                    <h2 className="section-title">SelebrityAboki Fruit</h2>
                    <hr className="divider" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--color-text-light)', marginBottom: 20 }}>
                                Founded at Iyana Technical, SelebrityAboki Fruit has grown from a
                                small roadside stand into a trusted name for premium fresh fruits.
                                Our commitment is simple: deliver the freshest and most nutritious
                                fruits to every customer, every single day.
                            </p>
                            <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--color-text-light)', marginBottom: 20 }}>
                                We personally select every fruit we sell. From locally grown
                                Nigerian oranges and pawpaw to imported grapes and apples, our
                                quality standards ensure you always get the best for your health
                                and your family.
                            </p>
                            <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--color-text-light)' }}>
                                Our AI-powered Health Advisor is available to help you choose
                                the perfect fruits for your specific health needs, whether
                                you are managing a condition or simply looking to eat better.
                            </p>
                        </div>
                        <div style={{
                            background: 'linear-gradient(135deg, #e8f0e0, #fef3e2)',
                            borderRadius: 'var(--radius-xl)',
                            height: 400,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '4rem',
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '5rem', marginBottom: 12 }}>
                                    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                                        <circle cx="40" cy="40" r="38" stroke="#1a5632" strokeWidth="3" />
                                        <text x="40" y="52" textAnchor="middle" fill="#1a5632" fontSize="36" fontWeight="800" fontFamily="Outfit">SF</text>
                                    </svg>
                                </div>
                                <p style={{ fontSize: '1rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                                    Quality Since Day One
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className="section">
                <div className="container">
                    <span className="hero-tag">Why Choose Us</span>
                    <h2 className="section-title">More Than Just a Fruit Store</h2>
                    <hr className="divider" />
                    <div className="grid grid-3" style={{ marginTop: 40 }}>
                        {[
                            {
                                title: 'AI Health Advisor',
                                desc: 'Get personalized fruit recommendations based on your health needs. Our intelligent advisor knows which fruits help with specific conditions.',
                                icon: (
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5">
                                        <path d="M12 2a3 3 0 00-3 3v1a3 3 0 006 0V5a3 3 0 00-3-3z" />
                                        <path d="M19 10H5a2 2 0 00-2 2v1a7 7 0 0014 0v-1a2 2 0 00-2-2z" />
                                        <path d="M12 18v4" />
                                    </svg>
                                ),
                            },
                            {
                                title: 'Daily Fresh Sourcing',
                                desc: 'We source our fruits fresh every single morning. No cold storage, no preservatives. Just nature at its finest, picked at peak ripeness.',
                                icon: (
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5">
                                        <path d="M12 8v4l3 3" />
                                        <circle cx="12" cy="12" r="10" />
                                    </svg>
                                ),
                            },
                            {
                                title: 'Secure Online Ordering',
                                desc: 'Place orders from anywhere with our secure system. Every order gets a unique receipt ID. Track and manage your orders easily.',
                                icon: (
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                        <line x1="1" y1="10" x2="23" y2="10" />
                                    </svg>
                                ),
                            },
                        ].map((feature, i) => (
                            <div key={i} style={{ padding: '28px 0' }}>
                                <div style={{
                                    width: 56, height: 56, borderRadius: 'var(--radius-md)',
                                    background: 'rgba(26, 86, 50, 0.06)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', marginBottom: 16
                                }}>
                                    {feature.icon}
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 10, fontFamily: 'var(--font-heading)' }}>
                                    {feature.title}
                                </h3>
                                <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--color-text-light)' }}>
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section style={{
                background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
                padding: '80px 0',
                color: 'white',
            }}>
                <div className="container" style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-heading)', marginBottom: 16 }}>
                        Ready to Eat Healthier?
                    </h2>
                    <p style={{ fontSize: '1.05rem', opacity: 0.8, maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.6 }}>
                        Browse our selection of fresh fruits or ask our AI Health Advisor
                        what fruits are best for you.
                    </p>
                    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link href="/shop" className="btn btn-accent btn-lg">
                            Browse Fruits
                        </Link>
                        <Link href="/ai-advisor" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                            Talk to Health Advisor
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </>
    );
}
