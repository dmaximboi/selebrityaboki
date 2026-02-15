'use client';

import { useState, useEffect } from 'react';
import { promotionsApi, referralsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Link from 'next/link';

interface FlashSale {
    id: string;
    product: { name: string; imageUrl: string; price: number };
    salePrice: number;
    originalPrice: number;
    startTime: string;
    endTime: string;
    imageUrl?: string;
    bannerText?: string;
    isActive: boolean;
}

function CountdownTimer({ endTime }: { endTime: string }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            const end = new Date(endTime).getTime();
            const now = Date.now();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft('ENDED');
                clearInterval(interval);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(`${hours}h ${mins}m ${secs}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [endTime]);

    return <span className="countdown-timer">{timeLeft || '...'}</span>;
}

export default function RamadanPage() {
    const { user } = useAuthStore();
    const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
    const [referralCode, setReferralCode] = useState('');
    const [referralStats, setReferralStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [sales] = await Promise.all([
                promotionsApi.getFlashSales(),
            ]);
            setFlashSales(sales || []);

            if (user) {
                try {
                    const [code, stats] = await Promise.all([
                        referralsApi.getMyCode(),
                        referralsApi.getMyStats(),
                    ]);
                    setReferralCode(code.referralCode);
                    setReferralStats(stats);
                } catch {
                    // User might not have referral code yet
                }
            }
        } catch (e) {
            console.error('Failed to load Ramadan data');
        }
        setLoading(false);
    }

    function copyReferralCode() {
        navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const activeSales = flashSales.filter((fs) => {
        const now = new Date();
        return fs.isActive && new Date(fs.startTime) <= now && new Date(fs.endTime) > now;
    });

    const upcomingSales = flashSales.filter((fs) => {
        const now = new Date();
        return fs.isActive && new Date(fs.startTime) > now;
    });

    return (
        <div className="ramadan-page">
            {/* Hero Section */}
            <section className="ramadan-hero">
                <div className="ramadan-hero-content">
                    <div className="ramadan-badge">🌙 Ramadan Mubarak</div>
                    <h1 className="ramadan-title">
                        Fresh Fruits for a<br />
                        <span className="ramadan-accent">Blessed Ramadan</span>
                    </h1>
                    <p className="ramadan-subtitle">
                        Enjoy special flash sales, free delivery, and exclusive referral discounts
                        throughout Ramadan. Nourish your body and soul with premium fresh fruits.
                    </p>
                    <div className="ramadan-hero-actions">
                        <Link href="/shop" className="btn btn-primary btn-lg">
                            Shop Now →
                        </Link>
                        <a href="#flash-sales" className="btn btn-outline btn-lg">
                            View Flash Sales
                        </a>
                    </div>
                </div>
            </section>

            {/* Flash Sales Section */}
            <section id="flash-sales" className="ramadan-section">
                <div className="container">
                    <h2 className="section-title">
                        <span className="emoji-icon">⚡</span>
                        Flash Sales
                    </h2>

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                            <div className="spinner" style={{ width: 32, height: 32 }} />
                        </div>
                    ) : activeSales.length > 0 ? (
                        <div className="flash-sale-grid">
                            {activeSales.map((sale) => {
                                const discount = Math.round(
                                    (1 - Number(sale.salePrice) / Number(sale.originalPrice)) * 100
                                );
                                return (
                                    <div key={sale.id} className="flash-sale-card">
                                        {sale.bannerText && (
                                            <div className="flash-banner">{sale.bannerText}</div>
                                        )}
                                        <div className="flash-sale-image">
                                            <img
                                                src={sale.imageUrl || sale.product?.imageUrl || '/placeholder-fruit.png'}
                                                alt={sale.product?.name || 'Flash Sale'}
                                            />
                                            <div className="flash-discount-badge">
                                                -{discount}%
                                            </div>
                                        </div>
                                        <div className="flash-sale-info">
                                            <h3>{sale.product?.name || 'Special Item'}</h3>
                                            <div className="flash-pricing">
                                                <span className="flash-old-price">
                                                    ₦{Number(sale.originalPrice).toLocaleString()}
                                                </span>
                                                <span className="flash-new-price">
                                                    ₦{Number(sale.salePrice).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flash-timer">
                                                <span className="timer-label">Ends in:</span>
                                                <CountdownTimer endTime={sale.endTime} />
                                            </div>
                                            <Link href="/shop" className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 8 }}>
                                                Buy Now
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>No active flash sales right now. Check back soon!</p>
                            {upcomingSales.length > 0 && (
                                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
                                    {upcomingSales.length} upcoming sale{upcomingSales.length !== 1 ? 's' : ''} scheduled
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Delivery Discount Section */}
            <section className="ramadan-section ramadan-delivery">
                <div className="container">
                    <h2 className="section-title">
                        <span className="emoji-icon">🚚</span>
                        Free Delivery Zones
                    </h2>
                    <p className="section-desc">
                        Orders above ₦20,000 qualify for delivery discounts during Ramadan
                    </p>

                    <div className="delivery-zones-grid">
                        <div className="zone-card zone-1">
                            <div className="zone-header">
                                <span className="zone-label">Zone 1</span>
                                <span className="zone-discount">100% FREE</span>
                            </div>
                            <div className="zone-areas">
                                <p>🏠 Iyanna Technical Ogidi</p>
                                <p>🏠 Oja Oba</p>
                                <p>🏠 Okolowo</p>
                            </div>
                            <div className="zone-note">Free delivery on orders above ₦20k</div>
                        </div>

                        <div className="zone-card zone-2">
                            <div className="zone-header">
                                <span className="zone-label">Zone 2</span>
                                <span className="zone-discount">50% OFF</span>
                            </div>
                            <div className="zone-areas">
                                <p>🏠 Other areas within Ilorin</p>
                                <p>🏠 Extended coverage during Ramadan</p>
                            </div>
                            <div className="zone-note">Half-price delivery on orders above ₦20k</div>
                        </div>

                        <div className="zone-card zone-3">
                            <div className="zone-header">
                                <span className="zone-label">Zone 3</span>
                                <span className="zone-discount">Standard</span>
                            </div>
                            <div className="zone-areas">
                                <p>🏠 Outer areas</p>
                                <p>🏠 Standard delivery rates apply</p>
                            </div>
                            <div className="zone-note">Regular delivery fee</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Referral Section */}
            <section className="ramadan-section ramadan-referral">
                <div className="container">
                    <h2 className="section-title">
                        <span className="emoji-icon">🎁</span>
                        Refer &amp; Earn
                    </h2>
                    <p className="section-desc">
                        Share your referral code with friends. After 3 successful referrals,
                        get <strong>15% off your next order</strong>!
                    </p>

                    <div className="referral-content">
                        <div className="referral-steps">
                            <div className="referral-step">
                                <div className="step-number">1</div>
                                <div className="step-text">
                                    <strong>Share Your Code</strong>
                                    <p>Send your unique referral code to friends</p>
                                </div>
                            </div>
                            <div className="referral-step">
                                <div className="step-number">2</div>
                                <div className="step-text">
                                    <strong>Friends Sign Up &amp; Order</strong>
                                    <p>They sign up and make their first purchase</p>
                                </div>
                            </div>
                            <div className="referral-step">
                                <div className="step-number">3</div>
                                <div className="step-text">
                                    <strong>Get 15% Discount</strong>
                                    <p>After 3 referrals, earn 15% off your total order</p>
                                </div>
                            </div>
                        </div>

                        {user ? (
                            <div className="referral-code-box">
                                <h3>Your Referral Code</h3>
                                <div className="code-display">
                                    <code>{referralCode || 'Loading...'}</code>
                                    {referralCode && (
                                        <button onClick={copyReferralCode} className="btn btn-outline btn-sm">
                                            {copied ? '✓ Copied!' : 'Copy'}
                                        </button>
                                    )}
                                </div>
                                {referralStats && (
                                    <div className="referral-progress">
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${Math.min((referralStats.completed || 0) / 3 * 100, 100)}%` }}
                                            />
                                        </div>
                                        <p className="progress-text">
                                            {referralStats.completed || 0} / 3 referrals completed
                                            {referralStats.completed >= 3 && ' — 🎉 Reward unlocked!'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="referral-code-box">
                                <p>Sign in to get your referral code and start earning!</p>
                                <Link href="/shop" className="btn btn-primary btn-sm">
                                    Sign In to Get Started
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <style jsx>{`
                .ramadan-page {
                    min-height: 100vh;
                }

                .ramadan-hero {
                    background: linear-gradient(135deg, #0f1b2d 0%, #1a3a2a 50%, #0f1b2d 100%);
                    padding: 100px 24px 80px;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }

                .ramadan-hero::before {
                    content: '🌙';
                    position: absolute;
                    top: 40px;
                    right: 10%;
                    font-size: 80px;
                    opacity: 0.15;
                    animation: float 6s ease-in-out infinite;
                }

                .ramadan-hero::after {
                    content: '⭐';
                    position: absolute;
                    bottom: 60px;
                    left: 8%;
                    font-size: 50px;
                    opacity: 0.1;
                    animation: float 4s ease-in-out infinite reverse;
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }

                .ramadan-hero-content {
                    max-width: 700px;
                    margin: 0 auto;
                    position: relative;
                    z-index: 1;
                }

                .ramadan-badge {
                    display: inline-block;
                    background: rgba(218, 165, 32, 0.2);
                    color: #daa520;
                    padding: 6px 20px;
                    border-radius: 20px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    margin-bottom: 24px;
                    border: 1px solid rgba(218, 165, 32, 0.3);
                }

                .ramadan-title {
                    font-size: 3rem;
                    font-weight: 800;
                    color: #f5f5f0;
                    line-height: 1.2;
                    margin-bottom: 20px;
                }

                .ramadan-accent {
                    background: linear-gradient(135deg, #daa520, #f0c850);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .ramadan-subtitle {
                    font-size: 1.1rem;
                    color: rgba(245, 245, 240, 0.7);
                    line-height: 1.7;
                    margin-bottom: 32px;
                }

                .ramadan-hero-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                    flex-wrap: wrap;
                }

                .ramadan-section {
                    padding: 60px 24px;
                }

                .container {
                    max-width: 1100px;
                    margin: 0 auto;
                }

                .section-title {
                    font-size: 1.8rem;
                    font-weight: 700;
                    text-align: center;
                    margin-bottom: 8px;
                }

                .emoji-icon {
                    margin-right: 8px;
                }

                .section-desc {
                    text-align: center;
                    color: var(--color-text-light);
                    font-size: 1rem;
                    margin-bottom: 40px;
                    max-width: 600px;
                    margin-left: auto;
                    margin-right: auto;
                }

                .flash-sale-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                    gap: 24px;
                }

                .flash-sale-card {
                    background: white;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    position: relative;
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                .flash-sale-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
                }

                .flash-banner {
                    background: linear-gradient(135deg, #daa520, #f0c850);
                    color: #0f1b2d;
                    text-align: center;
                    padding: 6px;
                    font-size: 0.82rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .flash-sale-image {
                    position: relative;
                    height: 200px;
                    overflow: hidden;
                    background: #f8f7f2;
                }

                .flash-sale-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .flash-discount-badge {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: #e74c3c;
                    color: white;
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 0.85rem;
                    font-weight: 700;
                }

                .flash-sale-info {
                    padding: 16px;
                }

                .flash-sale-info h3 {
                    font-size: 1.05rem;
                    font-weight: 600;
                    margin-bottom: 8px;
                }

                .flash-pricing {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                }

                .flash-old-price {
                    text-decoration: line-through;
                    color: var(--color-text-muted);
                    font-size: 0.9rem;
                }

                .flash-new-price {
                    font-size: 1.3rem;
                    font-weight: 800;
                    color: var(--color-accent);
                }

                .flash-timer {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.85rem;
                    color: var(--color-text-light);
                }

                .countdown-timer {
                    font-weight: 700;
                    color: #e74c3c;
                    font-family: var(--font-mono);
                }

                .timer-label {
                    font-size: 0.82rem;
                }

                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--color-text-light);
                    background: var(--color-bg-alt);
                    border-radius: var(--radius-lg);
                }

                .ramadan-delivery {
                    background: var(--color-bg-alt);
                }

                .delivery-zones-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 20px;
                }

                .zone-card {
                    background: white;
                    border: 2px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    transition: transform 0.2s;
                }

                .zone-card:hover {
                    transform: translateY(-2px);
                }

                .zone-1 { border-color: #27ae60; }
                .zone-2 { border-color: #f39c12; }
                .zone-3 { border-color: var(--color-border); }

                .zone-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    background: var(--color-bg-alt);
                }

                .zone-label {
                    font-weight: 700;
                    font-size: 0.95rem;
                }

                .zone-discount {
                    font-weight: 800;
                    font-size: 0.95rem;
                }

                .zone-1 .zone-discount { color: #27ae60; }
                .zone-2 .zone-discount { color: #f39c12; }

                .zone-areas {
                    padding: 16px 20px;
                }

                .zone-areas p {
                    font-size: 0.9rem;
                    margin-bottom: 6px;
                    color: var(--color-text);
                }

                .zone-note {
                    padding: 10px 20px;
                    font-size: 0.82rem;
                    color: var(--color-text-muted);
                    border-top: 1px solid var(--color-border);
                    background: rgba(0,0,0,0.01);
                }

                .ramadan-referral {
                    background: linear-gradient(135deg, #fdf6e3, #fef9ed);
                }

                .referral-content {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                    align-items: start;
                }

                .referral-steps {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .referral-step {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                }

                .step-number {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: var(--color-accent);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 0.95rem;
                    flex-shrink: 0;
                }

                .step-text strong {
                    display: block;
                    margin-bottom: 4px;
                    font-size: 1rem;
                }

                .step-text p {
                    font-size: 0.88rem;
                    color: var(--color-text-light);
                    margin: 0;
                }

                .referral-code-box {
                    background: white;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    padding: 24px;
                    text-align: center;
                }

                .referral-code-box h3 {
                    font-size: 1rem;
                    font-weight: 600;
                    margin-bottom: 16px;
                }

                .code-display {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .code-display code {
                    background: var(--color-bg-alt);
                    padding: 10px 20px;
                    border-radius: var(--radius-md);
                    font-size: 1.3rem;
                    font-weight: 800;
                    letter-spacing: 3px;
                    color: var(--color-accent);
                    font-family: var(--font-mono);
                }

                .referral-progress {
                    margin-top: 16px;
                }

                .progress-bar {
                    height: 8px;
                    background: var(--color-border);
                    border-radius: 4px;
                    overflow: hidden;
                    margin-bottom: 8px;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--color-accent), #daa520);
                    border-radius: 4px;
                    transition: width 0.5s ease;
                }

                .progress-text {
                    font-size: 0.85rem;
                    color: var(--color-text-light);
                    margin: 0;
                }

                @media (max-width: 768px) {
                    .ramadan-title {
                        font-size: 2rem;
                    }

                    .referral-content {
                        grid-template-columns: 1fr;
                    }

                    .delivery-zones-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}
