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
    const [referralDiscount, setReferralDiscount] = useState(0);
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
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleApplyReferral = async () => {
        if (!referralCode) return;
        try {
            const res = await referralsApi.validateCode(referralCode);
            if (res.valid) {
                // In a real app, the server handles the actual discount application
                // This is just for UI feedback
                alert('Referral code applied! You will get a discount if eligible.');
            } else {
                alert('Invalid referral code');
            }
        } catch {
            alert('Failed to validate referral code');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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

                // Initialize Payment
                const payRes = await ordersApi.initializePayment(orderId);

                if (payRes.success && payRes.paymentLink) {
                    // Redirect to Flutterwave
                    window.location.href = payRes.paymentLink;
                } else {
                    // Fallback to receipt page if payment init fails
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
    const deliveryFee = 2000; // Base fee from server logic
    const total = subtotal + deliveryFee;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navigation />

            <main className="container mx-auto px-4 py-32 max-w-6xl">
                <h1 className="text-3xl font-bold mb-8 text-secondary">Checkout</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Checkout Form */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-semibold mb-6">Delivery Details</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        required
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none"
                                        placeholder="080XXXXXXXX"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none"
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                                <textarea
                                    name="address"
                                    required
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none"
                                    placeholder="House number, street name, area..."
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    💡 Tip: Free delivery to Iyana Technical, Ogidi, and Okolowo for orders over ₦20,000!
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Order Notes (Optional)</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows={2}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none"
                                    placeholder="Special instructions for delivery..."
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-50 mt-6">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Have a Referral Code?</h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={referralCode}
                                        onChange={(e) => setReferralCode(e.target.value)}
                                        className="flex-1 p-2 border border-gray-200 rounded-lg text-sm outline-none"
                                        placeholder="Enter code"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleApplyReferral}
                                        className="btn btn-outline btn-sm px-4"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn btn-primary btn-lg mt-8"
                            >
                                {loading ? 'Processing Order...' : `Pay ₦${total.toLocaleString()} Now →`}
                            </button>
                        </form>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:sticky lg:top-32 h-fit">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 mb-6">
                                {items.map((item) => (
                                    <div key={item.productId} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 height-12 rounded-lg overflow-hidden flex-shrink-0">
                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-sm">{item.name}</h4>
                                                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                            </div>
                                        </div>
                                        <span className="font-semibold text-sm">₦{(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 pt-6 border-t border-gray-100">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>₦{subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Delivery Fee</span>
                                    <span>₦{deliveryFee.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold text-secondary pt-3 border-t border-gray-100">
                                    <span>Total</span>
                                    <span className="text-accent">₦{total.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="mt-8 p-4 bg-yellow-50 rounded-xl border border-yellow-100 text-sm text-yellow-800 flex gap-3">
                                <span>🔒</span>
                                <p>Secure payment powered by <strong>Flutterwave</strong>. Your transaction is encrypted and safe.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />

            <style jsx>{`
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                }
            `}</style>
        </div>
    );
}
