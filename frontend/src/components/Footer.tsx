import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <div className="footer-brand-name">SelebrityAboki Fruit</div>
                        <p className="footer-brand-desc">
                            Your trusted source for the freshest, highest-quality fruits at Iyana
                            Technical. Delivering health and taste to your doorstep.
                        </p>
                        <p style={{ marginTop: 16, fontSize: '0.85rem', color: 'rgba(245,245,240,0.6)' }}>
                            +234 803 295 8708
                        </p>
                    </div>

                    <div>
                        <h4 className="footer-heading">Quick Links</h4>
                        <ul className="footer-links">
                            <li><Link href="/shop" className="footer-link">Shop Fruits</Link></li>
                            <li><Link href="/ai-advisor" className="footer-link">Health Advisor</Link></li>
                            <li><Link href="/tips" className="footer-link">Daily Tips</Link></li>
                            <li><Link href="/contact" className="footer-link">Contact Us</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="footer-heading">Information</h4>
                        <ul className="footer-links">
                            <li><Link href="/location" className="footer-link">Our Location</Link></li>
                            <li><Link href="/location" className="footer-link">Delivery Areas</Link></li>
                            <li><Link href="/tips" className="footer-link">Fruit Facts</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="footer-heading">Hours</h4>
                        <ul className="footer-links">
                            <li className="footer-link">Monday - Saturday</li>
                            <li className="footer-link" style={{ color: 'rgba(245,245,240,0.85)' }}>7:00 AM - 7:00 PM</li>
                            <li className="footer-link" style={{ marginTop: 8 }}>Sunday</li>
                            <li className="footer-link" style={{ color: 'rgba(245,245,240,0.85)' }}>9:00 AM - 4:00 PM</li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© {new Date().getFullYear()} SelebrityAboki Fruit. All rights reserved.</p>
                    <p>A demonstration of LearnovaTech</p>
                </div>
            </div>
        </footer>
    );
}
