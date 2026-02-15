'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { productsApi, authApi } from '@/lib/api';

export default function ShopPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('all');
    const [search, setSearch] = useState('');
    const { isAuthenticated } = useAuthStore();
    const { addItem } = useCartStore();

    useEffect(() => {
        fetchProducts();
    }, [category]);

    async function fetchProducts() {
        setLoading(true);
        try {
            const params: Record<string, string> = { available: 'true' };
            if (category !== 'all') params.category = category;
            if (search) params.search = search;
            const data = await productsApi.getAll(params);
            setProducts(data);
        } catch (error) {
            console.error('Failed to load products');
        }
        setLoading(false);
    }

    function handleAddToCart(product: any) {
        if (!isAuthenticated) {
            window.location.href = authApi.getGoogleAuthUrl();
            return;
        }
        addItem({
            productId: product.id,
            name: product.name,
            price: Number(product.discountPrice || product.price),
            imageUrl: product.imageUrl,
            unit: product.unit,
        });
    }

    const categories = ['all', 'tropical', 'citrus', 'everyday', 'imported'];

    return (
        <>
            <Navigation />
            <main style={{ paddingTop: 'var(--header-height)' }}>
                <section className="section">
                    <div className="container">
                        <span className="hero-tag">Our Selection</span>
                        <h1 className="section-title">Fresh Fruits</h1>
                        <hr className="divider" />
                        <p className="section-subtitle">
                            Hand-picked daily for quality and freshness. Every fruit at
                            SelebrityAboki is sourced with care.
                        </p>

                        {/* Filters */}
                        <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap', alignItems: 'center' }}>
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    className={`btn btn-sm ${category === cat ? 'btn-primary' : 'btn-ghost'}`}
                                    style={{ textTransform: 'capitalize' }}
                                >
                                    {cat}
                                </button>
                            ))}
                            <div style={{ marginLeft: 'auto' }}>
                                <input
                                    type="text"
                                    placeholder="Search fruits..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                                    className="form-input"
                                    style={{ width: 220, padding: '8px 14px' }}
                                />
                            </div>
                        </div>

                        {/* Product Grid */}
                        <div className="grid grid-4" style={{ marginTop: 40 }}>
                            {loading
                                ? Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="product-item">
                                        <div className="skeleton" style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-md)' }} />
                                        <div className="skeleton" style={{ width: '70%', height: 20 }} />
                                        <div className="skeleton" style={{ width: '40%', height: 24 }} />
                                    </div>
                                ))
                                : products.map((product) => (
                                    <div key={product.id} className="product-item">
                                        {product.isFeatured && (
                                            <span className="product-tag">Featured</span>
                                        )}
                                        <div
                                            className="product-image"
                                            style={{
                                                background: `linear-gradient(135deg, #e8f0e0, #fef3e2)`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '2.5rem',
                                            }}
                                        >
                                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                                <circle cx="24" cy="24" r="20" fill="rgba(26,86,50,0.1)" />
                                                <text x="24" y="30" textAnchor="middle" fill="#1a5632" fontSize="16" fontWeight="600">
                                                    {product.name.charAt(0)}
                                                </text>
                                            </svg>
                                        </div>
                                        <h3 className="product-name">{product.name}</h3>
                                        <div>
                                            <span className="product-price">
                                                N{Number(product.discountPrice || product.price).toLocaleString()}
                                            </span>
                                            {product.discountPrice && (
                                                <span className="product-price-old">
                                                    N{Number(product.price).toLocaleString()}
                                                </span>
                                            )}
                                            <span className="product-unit"> / {product.unit}</span>
                                        </div>
                                        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {product.description}
                                        </p>
                                        <button
                                            onClick={() => handleAddToCart(product)}
                                            className="btn btn-primary btn-sm"
                                            style={{ marginTop: 4, width: '100%' }}
                                            disabled={product.stock === 0}
                                        >
                                            {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                                        </button>
                                    </div>
                                ))}
                        </div>

                        {!loading && products.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
                                <p style={{ fontSize: '1.1rem' }}>No fruits found in this category.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
