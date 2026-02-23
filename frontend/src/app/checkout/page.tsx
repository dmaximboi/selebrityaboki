'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cart';
import { ordersApi, referralsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function CheckoutPage() {
    const { items, totalPrice, clearCart } = useCartStore();
    const { user } = useAuthStore();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [referralCode, setReferralCode] = useState('');
    const [addressError, setAddressError] = useState('');
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: '',
        address: '',
        notes: '',
    });

    useEffect(() => {
        if (items.length === 0) {
            router.push('/shop');
        }
    }, [items, router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        if (name === 'address') {
            validateAddress(value);
        }
    };

    const validateAddress = (addr: string) => {
        const lower = addr.toLowerCase();

        // Comprehensive list of Ilorin/SelebrityAboki delivery zones
        const validZones = [
            'iyana', 'technical', 'ogidi', 'okolowo', 'unilorin', 'tanke', 'fate',
            'pake', 'asoo', 'gwanara', 'tanker', 'oyo road', 'oja oba', 'emir',
            'post office', 'taiwo', 'unity', 'challenge', 'adewole', 'irewolede',
            'ganmo', 'amilegbe', 'saboline', 'moraba'
        ];

        const hasZone = validZones.some(z => lower.includes(z));

        if (addr.length > 3 && !hasZone) {
            setAddressError('Please provide a specific area in Ilorin (e.g., Iyana Technical, Tanke, Ogidi) so we can calculate delivery.');
        } else if (addr.length > 0 && addr.length <= 3) {
            setAddressError('Address too short.');
        } else {
            setAddressError('');
        }
    };

    const handleApplyReferral = async () => {
        if (!referralCode) return;
        try {
            const res = await referralsApi.validateCode(referralCode);
            if (res.valid) {
                alert('Referral code applied! Discount will be calculated at payment.');
            } else {
                alert('Invalid referral code');
            }
        } catch {
            alert('Failed to validate referral code');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (addressError || !formData.address) {
            alert('Please provide a valid delivery address in Ilorin.');
            return;
        }

        setLoading(true);

        try {
            const orderRes = await ordersApi.create({
                items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
                customerName: formData.name,
                customerEmail: formData.email,
                customerPhone: formData.phone,
                deliveryAddress: formData.address,
                notes: formData.notes
            });

            if (orderRes.success) {
                const orderId = orderRes.orderId;
                const payRes = await ordersApi.initializePayment(orderId);

                if (payRes.success && payRes.paymentLink) {
                    window.location.href = payRes.paymentLink;
                } else {
                    clearCart();
                    router.push(`/receipt?orderId=${orderId}`);
                }
            }
        } catch (err: any) {
            alert(err.message || 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    const subtotal = totalPrice();

    // DELIVERY FEE LOGIC (Mirroring backend for UI)
    const getDeliveryInfo = () => {
        const addr = formData.address.toLowerCase();
        const freeZones = ['iyana', 'technical', 'ogidi', 'okolowo', 'oja oba'];

        // Zone 1: Near shop - Free if > 20k
        const isNear = freeZones.some(z => addr.includes(z));

        if (isNear) {
            if (subtotal >= 20000) return { fee: 0, label: 'Free Delivery (Ramadan Special!)' };
            return { fee: 1000, label: 'Discounted Delivery (Near Zone)' };
        }

        // Zone 2: Farther - 50% discount if > 20k
        if (subtotal >= 20000) return { fee: 1000, label: '50% Off Delivery (Ramadan Promo)' };

        return { fee: 2000, label: 'Standard Delivery' };
    };

    const deliveryInfo = getDeliveryInfo();
    const total = subtotal + deliveryInfo.fee;

    return (
        <>
            <Navigation />
            <main style={{ paddingTop: 'var(--header-height)', background: '#f8fafc', minHeight: '100vh' }}>
                <div className="container" style={{ padding: '60px 24px', maxWidth: 1100 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 40, alignItems: 'start' }}>

                        {/* LEFT COLUMN: FORM */}
                        <div style={{ background: 'white', padding: 40, borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #edf2f7' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                                <div style={{ width: 40, height: 40, background: 'var(--color-primary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>1</div>
                                <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Checkout & Delivery</h1>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                    <div className="form-group">
                                        <label className="form-label">Full Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="Your Name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone Number</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            required
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="080XXXXXXXX"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="email@example.com"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Delivery Address (Ilorin Only)</label>
                                    <textarea
                                        name="address"
                                        required
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="House No, Street Name, and Area (e.g. Tanke, Iyana Technical, Ogidi)"
                                        style={{ minHeight: 120, lineHeight: 1.5 }}
                                    />
                                    {addressError ? (
                                        <p style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: 8, fontWeight: 500 }}>⚠️ {addressError}</p>
                                    ) : (
                                        <p style={{ fontSize: '0.78rem', color: '#718096', marginTop: 8 }}>
                                            📍 We deliver across Ilorin. Free delivery to zones near <strong>Iyana Technical</strong> on orders over ₦20,000.
                                        </p>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Referral Code (Optional)</label>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <input
                                            type="text"
                                            value={referralCode}
                                            onChange={(e) => setReferralCode(e.target.value)}
                                            className="form-input"
                                            placeholder="Enter code"
                                            style={{ flex: 1 }}
                                        />
                                        <button type="button" onClick={handleApplyReferral} className="btn btn-outline" style={{ padding: '0 20px', fontSize: '0.85rem' }}>Apply</button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !!addressError || !formData.address}
                                    className="btn btn-accent btn-lg"
                                    style={{
                                        width: '100%',
                                        marginTop: 32,
                                        height: 64,
                                        fontSize: '1.25rem',
                                        fontWeight: '700',
                                        borderRadius: 'var(--radius-lg)',
                                        boxShadow: 'var(--shadow-lg)',
                                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                    }}
                                >
                                    {loading ? 'Processing Order...' : `Pay ₦${total.toLocaleString()} Securely →`}
                                </button>
                            </form>
                        </div>

                        {/* RIGHT COLUMN: SUMMARY */}
                        <div style={{ position: 'sticky', top: 120 }}>
                            <div style={{ background: 'white', padding: 32, borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #edf2f7' }}>
                                <h2 style={{ fontSize: '1.2rem', marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
                                    Your Order
                                    <span style={{ fontSize: '1rem', color: 'var(--color-primary)' }}>{items.length} items</span>
                                </h2>

                                <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 24, paddingRight: 8 }}>
                                    {items.map((item) => (
                                        <div key={item.productId} style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 16 }}>
                                            <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', background: '#f8fafc', flexShrink: 0 }}>
                                                <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }}>{item.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#718096' }}>{item.quantity} {item.unit} x ₦{item.price.toLocaleString()}</div>
                                            </div>
                                            <div style={{ fontSize: '1rem', fontWeight: 700 }}>₦{(item.price * item.quantity).toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ background: '#f8fafc', padding: 24, borderRadius: 16, border: '1px solid #edf2f7' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#4a5568', marginBottom: 12 }}>
                                        <span>Subtotal</span>
                                        <span>₦{subtotal.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#4a5568', marginBottom: 20 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            Delivery
                                            <span style={{ fontSize: '0.7rem', background: 'rgba(232, 114, 42, 0.1)', color: 'var(--color-accent)', padding: '2px 8px', borderRadius: 10 }}>{deliveryInfo.label}</span>
                                        </span>
                                        <span>₦{deliveryInfo.fee.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-dark)', paddingTop: 20, borderTop: '2px dashed #cbd5e0' }}>
                                        <span>Total</span>
                                        <span style={{ color: 'var(--color-accent)' }}>₦{total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div style={{ marginTop: 24, textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#718096', fontSize: '0.8rem' }}>
                                        <span>🔒</span>
                                        <span>Secure Payment via Flutterwave</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />

            <style jsx>{`
                .form-group { margin-bottom: 24px; }
                .form-label { display: block; font-size: 0.9rem; font-weight: 600; color: #4a5568; margin-bottom: 8px; }
                .form-input { 
                    width: 100%; padding: 14px 18px; background: #f8fafc; border: 2px solid #edf2f7; 
                    border-radius: 12px; font-size: 1rem; transition: all 0.2s; 
                }
                .form-input:focus { outline: none; border-color: var(--color-primary); background: white; box-shadow: 0 0 0 4px rgba(26, 86, 50, 0.1); }
                @media (max-width: 960px) {
                    div { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </>
    );
}
