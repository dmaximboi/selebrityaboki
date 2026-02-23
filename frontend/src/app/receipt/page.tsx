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
    const status = searchParams.get('status') || searchParams.get('tx_ref'); // Handle different param names
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
            const timer = setTimeout(() => {
                if (!orderId) router.push('/');
            }, 5000);
            return () => clearTimeout(timer);
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div className="spinner" />
        </div>
    );

    if (!order) return (
        <div style={{ textAlign: 'center', padding: '100px 24px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: 20 }}>Order Not Found</h2>
            <Link href="/" className="btn btn-primary">Back Home</Link>
        </div>
    );

    const isSuccess = order.paymentStatus === 'SUCCESS' || order.paymentStatus === 'PAID';
    const isCancelled = status === 'cancelled' || order.paymentStatus === 'FAILED' || order.status === 'CANCELLED';
    const isPending = !isSuccess && !isCancelled;

    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Processing...';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg-alt)', display: 'flex', flexDirection: 'column' }}>
            <Navigation />

            <main style={{ flex: 1, padding: '120px 24px 60px', maxWidth: 700, margin: '0 auto', width: '100%' }}>
                <div style={{
                    background: 'white',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-xl)',
                    overflow: 'hidden',
                    border: '1px solid var(--color-border)',
                    position: 'relative'
                }}>
                    {/* Status Ribbon for Mobile */}
                    <div style={{
                        position: 'absolute',
                        top: 20,
                        right: -30,
                        transform: 'rotate(45deg)',
                        background: isSuccess ? 'var(--color-success)' : isCancelled ? 'var(--color-error)' : 'var(--color-warning)',
                        color: 'white',
                        padding: '5px 40px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        zIndex: 10,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        {isSuccess ? 'PAID' : isCancelled ? 'CANCELLED' : 'PENDING'}
                    </div>

                    {/* Header Banner */}
                    <div style={{
                        background: isSuccess ? 'var(--color-primary)' : isCancelled ? 'var(--color-error)' : 'var(--color-accent)',
                        padding: '60px 40px',
                        textAlign: 'center',
                        color: 'white',
                        transition: 'background 0.3s ease'
                    }}>
                        <div style={{
                            width: 80, height: 80, background: 'rgba(255,255,255,0.2)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', margin: '0 auto 24px',
                            boxShadow: '0 0 0 8px rgba(255,255,255,0.1)'
                        }}>
                            <span style={{ fontSize: '2.5rem' }}>
                                {isSuccess ? '✅' : isCancelled ? '❌' : '📦'}
                            </span>
                        </div>
                        <h1 style={{ fontSize: '2.2rem', marginBottom: 8, color: 'white', letterSpacing: '-0.02em' }}>
                            {isSuccess ? 'Payment Successful!' : isCancelled ? 'Payment Cancelled' : 'Order Received'}
                        </h1>
                        <p style={{ opacity: 0.9, fontWeight: 500, fontSize: '1.1rem' }}>
                            {isSuccess
                                ? 'Your delicious fruits are on their way!'
                                : isCancelled
                                    ? 'The payment was not completed. You can try again.'
                                    : 'Please complete your payment to start delivery.'}
                        </p>
                    </div>

                    <div style={{ padding: '40px 50px' }} className="receipt-body">
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap',
                            gap: 20, marginBottom: 40, paddingBottom: 30,
                            borderBottom: '1px dashed var(--color-border)'
                        }}>
                            <div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: 8 }}>Order Reference</span>
                                <code style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-primary-dark)', fontFamily: 'var(--font-mono)' }}>{order.id}</code>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: 8 }}>Date Issued</span>
                                <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>{dateStr}</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: 40 }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, color: 'var(--color-text)' }}>
                                <span style={{ width: 4, height: 20, background: 'var(--color-primary)', borderRadius: 2 }} />
                                Basket Summary
                            </h2>
                            <div style={{ display: 'grid', gap: 20 }}>
                                {order.items?.map((item: any) => (
                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: 'var(--color-bg-alt)' }}>
                                                <img src={item.product?.imageUrl || '/placeholder-fruit.png'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.productName || item.product?.name || 'Fresh Fruit'}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Quantity: {item.quantity} {item.product?.unit || 'piece'}</div>
                                            </div>
                                        </div>
                                        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>₦{(Number(item.priceAtTime) * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{
                            background: 'var(--color-bg-alt)', padding: '24px 30px', borderRadius: 'var(--radius-lg)',
                            marginBottom: 40, display: 'grid', gap: 14, border: '1px solid rgba(0,0,0,0.03)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: 'var(--color-text-light)' }}>
                                <span>Subtotal</span>
                                <span>₦{Number(order.totalAmount - (order.deliveryFee || 0) + (order.discountAmount || 0)).toLocaleString()}</span>
                            </div>
                            {Number(order.discountAmount) > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: 'var(--color-success)', fontWeight: 500 }}>
                                    <span>Discount Applied</span>
                                    <span>-₦{Number(order.discountAmount).toLocaleString()}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: 'var(--color-text-light)' }}>
                                <span>Delivery Fee</span>
                                <span>₦{Number(order.deliveryFee || 0).toLocaleString()}</span>
                            </div>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', fontSize: '1.8rem',
                                fontWeight: 900, color: 'var(--color-primary-dark)',
                                paddingTop: 20, borderTop: '2px solid rgba(0,0,0,0.06)', marginTop: 6,
                                letterSpacing: '-0.01em'
                            }}>
                                <span>Total</span>
                                <span style={{ color: 'var(--color-accent)' }}>₦{Number(order.totalAmount).toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 48, background: '#fafafa', padding: 24, borderRadius: 16 }}>
                            <div>
                                <h3 style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 14, letterSpacing: '0.1em' }}>Ship To</h3>
                                <p style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 6, color: 'var(--color-text)' }}>{order.customerName}</p>
                                <p style={{ fontSize: '0.92rem', color: 'var(--color-text-light)', lineHeight: 1.6 }}>{order.deliveryAddress}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h3 style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 14, letterSpacing: '0.1em' }}>Contact Details</h3>
                                <p style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 6, color: 'var(--color-text)' }}>{order.customerPhone}</p>
                                <p style={{ fontSize: '0.92rem', color: 'var(--color-text-light)' }}>{order.customerEmail}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', paddingTop: 32, borderTop: '1px solid var(--color-border)' }}>
                            {isSuccess && order.whatsappUrl && (
                                <a href={order.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg" style={{ background: '#25D366', border: 'none', minWidth: 240, height: 56 }}>
                                    Confirm on WhatsApp
                                </a>
                            )}
                            {isCancelled && (
                                <Link href="/checkout" className="btn btn-primary btn-lg" style={{ minWidth: 240, height: 56 }}>
                                    Try Again
                                </Link>
                            )}
                            <button onClick={() => window.print()} className="btn btn-outline btn-lg" style={{ height: 56 }}>
                                🖨️ Print Receipt
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 40, textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                    <p>A copy of this receipt has been archived for your reference.</p>
                    <p style={{ marginTop: 10 }}>Need assistance? Chat with us at <strong>+234 803 295 8708</strong></p>
                </div>
            </main>

            <Footer />
            <style jsx>{`
                @media (max-width: 600px) {
                    .receipt-body { padding: 30px 20px !important; }
                    h1 { font-size: 1.6rem !important; }
                    .display-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
                    div[style*="textAlign: right"] { textAlign: left !important; }
                }
            `}</style>
        </div>
    );
}

export default function ReceiptPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>}>
            <ReceiptContent />
        </Suspense>
    );
}
