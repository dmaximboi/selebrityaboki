'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ordersApi } from '@/lib/api';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useCartStore } from '@/store/cart';

function ReceiptContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const { clearCart } = useCartStore();

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Clear cart once we reach receipt successfully
        if (status === 'successful' || !status) {
            clearCart();
        }

        if (orderId) {
            loadOrder();
        } else {
            router.push('/');
        }
    }, [orderId, status]);

    async function loadOrder() {
        try {
            const data = await ordersApi.getById(orderId!);
            setOrder(data);
        } catch (e) {
            console.error('Failed to load order', e);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <div className="spinner" />
        </div>
    );

    if (!order) return (
        <div className="text-center py-40">
            <h2 className="text-2xl font-bold">Order Not Found</h2>
            <Link href="/" className="btn btn-primary mt-4">Back Home</Link>
        </div>
    );

    const isSuccess = status === 'successful' || order.paymentStatus === 'PAID' || order.status !== 'CANCELLED';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navigation />

            <main className="flex-1 container mx-auto px-4 py-32 max-w-2xl">
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                    <div className={`${isSuccess ? 'bg-accent' : 'bg-red-500'} p-10 text-center text-white`}>
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            {isSuccess ? (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            )}
                        </div>
                        <h1 className="text-3xl font-extrabold mb-2">
                            {isSuccess ? 'Payment Successful!' : 'Order Placed'}
                        </h1>
                        <p className="text-white/80 font-medium">Thank you for choosing SelebrityAboki Fruit</p>
                    </div>

                    <div className="p-8 md:p-12">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-10 border-b border-dashed border-gray-200 gap-4">
                            <div>
                                <span className="text-gray-500 text-sm uppercase tracking-wider font-bold block mb-1">Order Identifier</span>
                                <code className="text-xl font-mono font-black text-secondary">{order.id}</code>
                            </div>
                            <div className="text-right">
                                <span className="text-gray-500 text-sm uppercase tracking-wider font-bold block mb-1">Date Issued</span>
                                <span className="font-semibold">{new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            </div>
                        </div>

                        <div className="mb-10">
                            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-accent rounded-full" />
                                Your Order Details
                            </h2>
                            <div className="space-y-4">
                                {order.items?.map((item: any) => (
                                    <div key={item.id} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-4">
                                            <span className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center font-bold text-xs text-secondary">
                                                {item.quantity}x
                                            </span>
                                            <span className="font-semibold text-gray-800">{item.product?.name || 'Fresh Fruit'}</span>
                                        </div>
                                        <span className="font-bold text-gray-700">₦{(Number(item.priceAtTime) * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-50 p-8 rounded-2xl mb-10 space-y-3 font-medium">
                            <div className="flex justify-between text-gray-500 text-sm">
                                <span>Subtotal</span>
                                <span>₦{Number(order.totalAmount - order.deliveryFee + order.discountAmount).toLocaleString()}</span>
                            </div>
                            {Number(order.discountAmount) > 0 && (
                                <div className="flex justify-between text-green-600 text-sm">
                                    <span>Referral Discount</span>
                                    <span>-₦{Number(order.discountAmount).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-gray-500 text-sm">
                                <span>Delivery Fee</span>
                                <span>₦{Number(order.deliveryFee).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-2xl font-black text-secondary pt-4 border-t border-gray-200 mt-2">
                                <span>Amount Paid</span>
                                <span className="text-accent">₦{Number(order.totalAmount).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Deliver To</h3>
                                <p className="font-bold text-gray-800">{order.customerName}</p>
                                <p className="text-gray-600 text-sm leading-relaxed">{order.deliveryAddress}</p>
                            </div>
                            <div className="md:text-right">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Contact Method</h3>
                                <p className="font-bold text-gray-800">{order.customerPhone}</p>
                                <p className="text-gray-600 text-sm">{order.customerEmail}</p>
                            </div>
                        </div>

                        <div className="text-center pt-8 border-t border-gray-100 flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/shop" className="btn btn-primary btn-lg px-10">
                                Buy More Healthy Fruits
                            </Link>
                            <button onClick={() => window.print()} className="btn btn-outline btn-lg px-10">
                                Print Receipt
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center text-gray-500 text-sm font-medium">
                    <p>A confirmation email has been sent to {order.customerEmail}</p>
                    <p className="mt-2">Questions? Contact us at <strong>+234 803 295 8708</strong></p>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default function ReceiptPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="spinner" /></div>}>
            <ReceiptContent />
        </Suspense>
    );
}
