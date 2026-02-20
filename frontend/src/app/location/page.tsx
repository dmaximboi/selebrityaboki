'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function LocationPage() {
    return (
        <>
            <Navigation />
            <main style={{ paddingTop: 'var(--header-height)' }}>
                <section className="section">
                    <div className="container" style={{ maxWidth: 900 }}>
                        <span className="hero-tag">Visit Us</span>
                        <h1 className="section-title">Our Location</h1>
                        <hr className="divider" />
                        <p className="section-subtitle" style={{ marginBottom: 40 }}>
                            We're located at Iyana Technical Junction, Ogidi, Ilorin —
                            come visit us for the freshest fruits in town!
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
                            {/* Map Embed */}
                            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)', height: 400 }}>
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3956.2!2d3.89!3d7.45!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zN8KwMjcnMDAuMCJOIDPCsDUzJzI0LjAiRQ!5e0!3m2!1sen!2sng!4v1"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="SelebrityAboki Fruit Location"
                                />
                            </div>

                            {/* Details */}
                            <div>
                                <div style={{ marginBottom: 32 }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, fontFamily: 'var(--font-heading)' }}>
                                        Address
                                    </h3>
                                    <p style={{ color: 'var(--color-text-light)', lineHeight: 1.8, fontSize: '0.95rem' }}>
                                        SelebrityAboki Fruit<br />
                                        Iyana Technical Junction<br />
                                        Ogidi, Ilorin<br />
                                        Kwara State<br />
                                        Nigeria
                                    </p>
                                </div>

                                <div style={{ marginBottom: 32 }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, fontFamily: 'var(--font-heading)' }}>
                                        Landmarks
                                    </h3>
                                    <ul style={{ color: 'var(--color-text-light)', lineHeight: 2, fontSize: '0.92rem', paddingLeft: 20 }}>
                                        <li>Iyana Technical Junction, Ogidi</li>
                                        <li>Easily accessible from the main road</li>
                                        <li>Look for the fresh fruit display</li>
                                    </ul>
                                </div>

                                <div style={{ marginBottom: 32 }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, fontFamily: 'var(--font-heading)' }}>
                                        Delivery Areas
                                    </h3>
                                    <p style={{ color: 'var(--color-text-light)', lineHeight: 1.8, fontSize: '0.92rem' }}>
                                        We deliver across Ilorin including Ogidi, Tanke, GRA,
                                        Fate, Kulende, Offa Garage, and surrounding areas. Delivery fees vary by
                                        distance.
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: 12 }}>
                                    <a
                                        href="https://wa.me/2348032958708?text=Hi%20SelebrityAboki!%20I'd%20like%20to%20place%20an%20order"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary"
                                    >
                                        WhatsApp Us
                                    </a>
                                    <a
                                        href="tel:+2348032958708"
                                        className="btn btn-outline"
                                    >
                                        Call Us
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
