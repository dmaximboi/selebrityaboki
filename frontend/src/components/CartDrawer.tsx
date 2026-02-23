'use client';

import { useCartStore } from '@/store/cart';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function CartDrawer() {
    const { items, isOpen, toggleCart, removeItem, updateQuantity, totalPrice } = useCartStore();
    const router = useRouter();

    if (!isOpen) return null;

    const handleCheckout = () => {
        toggleCart();
        router.push('/checkout');
    };

    return (
        <div className="cart-overlay" onClick={toggleCart}>
            <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
                <div className="cart-header">
                    <h2>Shopping Cart</h2>
                    <button className="btn-close" onClick={toggleCart}>✕</button>
                </div>

                <div className="cart-items">
                    {items.length === 0 ? (
                        <div className="empty-cart">
                            <p>Your basket is empty</p>
                            <button className="btn btn-primary btn-sm" onClick={toggleCart}>
                                Go Shopping
                            </button>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.productId} className="cart-item">
                                <div className="cart-item-image">
                                    <img src={item.imageUrl} alt={item.name} />
                                </div>
                                <div className="cart-item-info">
                                    <h3>{item.name}</h3>
                                    <p className="cart-item-price">₦{item.price.toLocaleString()}</p>
                                    <div className="cart-item-actions">
                                        <div className="quantity-controls">
                                            <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>−</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
                                        </div>
                                        <button className="btn-remove" onClick={() => removeItem(item.productId)}>
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {items.length > 0 && (
                    <div className="cart-footer">
                        <div className="cart-total">
                            <span>Subtotal</span>
                            <span>₦{totalPrice().toLocaleString()}</span>
                        </div>
                        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleCheckout}>
                            Proceed to Checkout
                        </button>
                    </div>
                )}
            </div>

            <style jsx>{`
                .cart-overlay {
                    position: fixed;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(4px);
                    z-index: 1000;
                    display: flex;
                    justify-content: flex-end;
                    animation: fadeIn 0.3s ease;
                }

                .cart-drawer {
                    width: 100%;
                    max-width: 400px;
                    background: white;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.1);
                    animation: slideIn 0.3s ease;
                    position: relative;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }

                .cart-header {
                    padding: 24px;
                    border-bottom: 1px solid var(--color-border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .cart-header h2 {
                    font-size: 1.25rem;
                    margin: 0;
                }

                .btn-close {
                    font-size: 1.5rem;
                    color: var(--color-text-muted);
                    transition: color 0.2s;
                }

                .btn-close:hover {
                    color: var(--color-text);
                }

                .cart-items {
                    flex: 1;
                    overflow-y: auto;
                    padding: 24px;
                }

                .empty-cart {
                    text-align: center;
                    padding: 40px 0;
                    color: var(--color-text-muted);
                }

                .cart-item {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 24px;
                    padding-bottom: 24px;
                    border-bottom: 1px solid var(--color-bg-alt);
                }

                .cart-item-image {
                    width: 80px;
                    height: 80px;
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    background: var(--color-bg-alt);
                    flex-shrink: 0;
                }

                .cart-item-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .cart-item-info {
                    flex: 1;
                }

                .cart-item-info h3 {
                    font-size: 1rem;
                    margin: 0 0 4px;
                    font-weight: 600;
                }

                .cart-item-price {
                    color: var(--color-primary);
                    font-weight: 700;
                    margin-bottom: 12px;
                }

                .cart-item-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .quantity-controls {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: var(--color-bg-alt);
                    padding: 4px 12px;
                    border-radius: 20px;
                }

                .quantity-controls button {
                    font-weight: 700;
                    width: 24px;
                    height: 24px;
                }

                .btn-remove {
                    font-size: 0.8rem;
                    color: var(--color-error);
                    text-decoration: underline;
                }

                .cart-footer {
                    padding: 24px;
                    background: var(--color-bg-alt);
                    border-top: 1px solid var(--color-border);
                }

                .cart-total {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 1.1rem;
                    font-weight: 700;
                    margin-bottom: 20px;
                }
            `}</style>
        </div>
    );
}
