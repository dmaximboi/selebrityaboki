'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { contactApi } from '@/lib/api';

export default function ContactPage() {
    const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus('loading');
        setErrorMsg('');

        try {
            await contactApi.submit(form);
            setStatus('success');
            setForm({ name: '', email: '', phone: '', message: '' });
        } catch (error: any) {
            setStatus('error');
            setErrorMsg(error.message || 'Failed to send message. Please try again.');
        }
    }

    return (
        <>
            <Navigation />
            <main style={{ paddingTop: 'var(--header-height)' }}>
                <section className="section">
                    <div className="container" style={{ maxWidth: 900 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
                            {/* Left: Info */}
                            <div>
                                <span className="hero-tag">Get In Touch</span>
                                <h1 className="section-title">Contact Us</h1>
                                <hr className="divider" />
                                <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--color-text-light)', marginBottom: 32 }}>
                                    Have questions about our fruits, delivery, or need help with an
                                    order? We'd love to hear from you. Send us a message and we'll
                                    respond as soon as possible.
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    <div>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 6 }}>Address</h3>
                                        <p style={{ color: 'var(--color-text-light)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                                            SelebrityAboki Fruit<br />
                                            Iyana Technical, Ojoo<br />
                                            Ibadan, Oyo State, Nigeria
                                        </p>
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 6 }}>Phone & WhatsApp</h3>
                                        <p style={{ color: 'var(--color-text-light)', fontSize: '0.92rem' }}>
                                            <a href="tel:+2348032958708" style={{ color: 'var(--color-primary)' }}>+234 803 295 8708</a>
                                        </p>
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 6 }}>Business Hours</h3>
                                        <p style={{ color: 'var(--color-text-light)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                                            Monday - Saturday: 7:00 AM - 7:00 PM<br />
                                            Sunday: 9:00 AM - 4:00 PM
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Form */}
                            <div>
                                {status === 'success' ? (
                                    <div style={{ padding: 40, textAlign: 'center', background: 'rgba(45,138,78,0.05)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(45,138,78,0.2)' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
                                                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                                                <polyline points="22 4 12 14.01 9 11.01" />
                                            </svg>
                                        </div>
                                        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: 8 }}>Message Sent!</h3>
                                        <p style={{ color: 'var(--color-text-light)', fontSize: '0.92rem' }}>
                                            Thank you for reaching out. We'll get back to you soon.
                                        </p>
                                        <button onClick={() => setStatus('idle')} className="btn btn-outline btn-sm" style={{ marginTop: 20 }}>
                                            Send Another Message
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit}>
                                        <div className="form-group">
                                            <label className="form-label">Your Name</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="John Doe"
                                                required
                                                minLength={2}
                                                maxLength={100}
                                                value={form.name}
                                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Email Address</label>
                                            <input
                                                type="email"
                                                className="form-input"
                                                placeholder="john@example.com"
                                                required
                                                value={form.email}
                                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Phone (optional)</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="+234..."
                                                value={form.phone}
                                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Message</label>
                                            <textarea
                                                className="form-input form-textarea"
                                                placeholder="Tell us how we can help..."
                                                required
                                                minLength={10}
                                                maxLength={1000}
                                                value={form.message}
                                                onChange={(e) => setForm({ ...form, message: e.target.value })}
                                            />
                                        </div>

                                        {status === 'error' && (
                                            <p className="form-error" style={{ marginBottom: 12 }}>{errorMsg}</p>
                                        )}

                                        <button
                                            type="submit"
                                            className="btn btn-primary btn-lg"
                                            disabled={status === 'loading'}
                                            style={{ width: '100%' }}
                                        >
                                            {status === 'loading' ? 'Sending...' : 'Send Message'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
