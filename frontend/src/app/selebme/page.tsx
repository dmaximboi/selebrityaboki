'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { adminApi } from '@/lib/api';

type Tab = 'dashboard' | 'orders' | 'products' | 'contacts' | 'users' | 'content' | 'activity' | 'ramadan';

export default function AdminPage() {
    const router = useRouter();
    const { user, isAdmin, isLoading, checkAuth } = useAuthStore();
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [dashData, setDashData] = useState<any>(null);
    const [orders, setOrders] = useState<any>(null);
    const [contacts, setContacts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [flashSales, setFlashSales] = useState<any[]>([]);
    const [promotions, setPromotions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showFlashForm, setShowFlashForm] = useState(false);
    const [showPromoForm, setShowPromoForm] = useState(false);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!isLoading && !isAdmin) {
            router.push('/');
        }
    }, [isLoading, isAdmin, router]);

    useEffect(() => {
        if (isAdmin) loadTabData(activeTab);
    }, [activeTab, isAdmin]);

    async function loadTabData(tab: Tab) {
        setLoading(true);
        try {
            switch (tab) {
                case 'dashboard':
                    setDashData(await adminApi.getDashboard());
                    break;
                case 'orders':
                    setOrders(await adminApi.getOrders());
                    break;
                case 'contacts':
                    setContacts(await adminApi.getContacts());
                    break;
                case 'users':
                    setUsers(await adminApi.getUsers());
                    break;
                case 'activity':
                    setActivity(await adminApi.getActivity());
                    break;
                case 'ramadan':
                    const [fs, pr] = await Promise.all([
                        adminApi.getFlashSales(),
                        adminApi.getPromotions(),
                    ]);
                    setFlashSales(fs);
                    setPromotions(pr);
                    break;
            }
        } catch (e) {
            console.error('Failed to load data');
        }
        setLoading(false);
    }

    async function handleOrderStatus(orderId: string, status: string) {
        try {
            await adminApi.updateOrderStatus(orderId, status);
            loadTabData('orders');
        } catch (e) {
            alert('Failed to update order');
        }
    }

    async function handleMarkRead(id: string) {
        await adminApi.markContactRead(id);
        loadTabData('contacts');
    }

    async function handleDeleteContact(id: string) {
        if (confirm('Delete this message?')) {
            await adminApi.deleteContact(id);
            loadTabData('contacts');
        }
    }

    async function handleCreateFlashSale(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        try {
            await adminApi.createFlashSale({
                productId: form.get('productId'),
                salePrice: Number(form.get('salePrice')),
                imageUrl: form.get('imageUrl') || undefined,
                bannerText: form.get('bannerText') || 'Ramadan Special!',
                startTime: form.get('startTime'),
                endTime: form.get('endTime'),
            });
            setShowFlashForm(false);
            loadTabData('ramadan');
        } catch (err: any) {
            alert(err.message || 'Failed to create flash sale');
        }
    }

    async function handleToggleFlashSale(id: string, isActive: boolean) {
        await adminApi.updateFlashSale(id, { isActive: !isActive });
        loadTabData('ramadan');
    }

    async function handleDeleteFlashSale(id: string) {
        if (confirm('Delete this flash sale?')) {
            await adminApi.deleteFlashSale(id);
            loadTabData('ramadan');
        }
    }

    async function handleCreatePromotion(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        try {
            await adminApi.createPromotion({
                type: form.get('type'),
                title: form.get('title'),
                description: form.get('description') || undefined,
                discountPercent: Number(form.get('discountPercent')),
                minOrderAmount: Number(form.get('minOrderAmount')) || 0,
                startDate: form.get('startDate'),
                endDate: form.get('endDate'),
            });
            setShowPromoForm(false);
            loadTabData('ramadan');
        } catch (err: any) {
            alert(err.message || 'Failed to create promotion');
        }
    }

    async function handleTogglePromotion(id: string, isActive: boolean) {
        await adminApi.updatePromotion(id, { isActive: !isActive });
        loadTabData('ramadan');
    }

    async function handleDeletePromotion(id: string) {
        if (confirm('Delete this promotion?')) {
            await adminApi.deletePromotion(id);
            loadTabData('ramadan');
        }
    }

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    if (!isAdmin) return null;

    const tabs: { key: Tab; label: string }[] = [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'orders', label: 'Orders' },
        { key: 'products', label: 'Products' },
        { key: 'ramadan', label: '🌙 Ramadan Offers' },
        { key: 'contacts', label: 'Messages' },
        { key: 'users', label: 'Users' },
        { key: 'content', label: 'Content' },
        { key: 'activity', label: 'Audit Log' },
    ];

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-brand">
                    <span style={{ color: 'var(--color-accent-light)' }}>Seleb</span>risky Admin
                </div>
                <ul className="admin-nav">
                    {tabs.map((tab) => (
                        <li key={tab.key}>
                            <button
                                onClick={() => setActiveTab(tab.key)}
                                className={`admin-nav-item ${activeTab === tab.key ? 'active' : ''}`}
                                style={{ width: '100%', textAlign: 'left' }}
                            >
                                {tab.label}
                            </button>
                        </li>
                    ))}
                    <li style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <a href="/" className="admin-nav-item" style={{ textDecoration: 'none' }}>
                            ← Back to Site
                        </a>
                    </li>
                </ul>
                <div style={{ padding: '16px 24px', marginTop: 'auto', fontSize: '0.8rem', color: 'rgba(245,245,240,0.4)' }}>
                    Signed in as {user?.name}
                </div>
            </aside>

            {/* Content */}
            <main className="admin-content">
                <div className="admin-header">
                    <h1 className="admin-page-title">
                        {tabs.find((t) => t.key === activeTab)?.label}
                    </h1>
                    <button onClick={() => loadTabData(activeTab)} className="btn btn-ghost btn-sm">
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                        <div className="spinner" style={{ width: 32, height: 32 }} />
                    </div>
                ) : (
                    <>
                        {/* ===== DASHBOARD ===== */}
                        {activeTab === 'dashboard' && dashData && (
                            <>
                                <div className="stat-grid">
                                    <div className="stat-item">
                                        <div className="stat-value">{dashData.orders?.total || 0}</div>
                                        <div className="stat-label">Total Orders</div>
                                        <div className="stat-change positive">+{dashData.orders?.today || 0} today</div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-value">₦{(dashData.revenue?.total || 0).toLocaleString()}</div>
                                        <div className="stat-label">Revenue</div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-value">{dashData.products?.total || 0}</div>
                                        <div className="stat-label">Products</div>
                                        {dashData.products?.lowStock > 0 && (
                                            <div className="stat-change negative">{dashData.products.lowStock} low stock</div>
                                        )}
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-value">{dashData.users?.total || 0}</div>
                                        <div className="stat-label">Users</div>
                                        <div className="stat-change positive">+{dashData.users?.newToday || 0} today</div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                    <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Quick Actions</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <button onClick={() => setActiveTab('orders')} className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                                                {dashData.orders?.pending || 0} Pending Orders →
                                            </button>
                                            <button onClick={() => setActiveTab('contacts')} className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                                                {dashData.contacts?.unread || 0} Unread Messages →
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Store Status</h3>
                                        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-light)', lineHeight: 1.8 }}>
                                            Products: {dashData.products?.total || 0} products listed<br />
                                            Low stock alerts: {dashData.products?.lowStock || 0}<br />
                                            Active users: {dashData.users?.total || 0}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ===== ORDERS ===== */}
                        {activeTab === 'orders' && orders && (
                            <>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Order ID</th>
                                            <th>Customer</th>
                                            <th>Items</th>
                                            <th>Total</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.orders?.map((order: any) => (
                                            <tr key={order.id}>
                                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{order.orderId}</td>
                                                <td>{order.customerName}</td>
                                                <td>{order.items?.length || 0}</td>
                                                <td style={{ fontWeight: 600 }}>₦{Number(order.totalAmount).toLocaleString()}</td>
                                                <td>
                                                    <span className={`status-badge status-${order.status?.toLowerCase()}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                                    {new Date(order.createdAt).toLocaleDateString('en-NG')}
                                                </td>
                                                <td>
                                                    <select
                                                        value={order.status}
                                                        onChange={(e) => handleOrderStatus(order.id, e.target.value)}
                                                        style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                                                    >
                                                        <option value="PENDING">Pending</option>
                                                        <option value="CONFIRMED">Confirmed</option>
                                                        <option value="PROCESSING">Processing</option>
                                                        <option value="DELIVERED">Delivered</option>
                                                        <option value="CANCELLED">Cancelled</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {orders.pagination && (
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                            Page {orders.pagination.page} of {orders.pagination.totalPages} ({orders.pagination.total} total)
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ===== CONTACTS ===== */}
                        {activeTab === 'contacts' && (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>From</th>
                                        <th>Email</th>
                                        <th>Message</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contacts.map((c: any) => (
                                        <tr key={c.id} style={{ background: c.isRead ? 'transparent' : 'rgba(26,86,50,0.02)' }}>
                                            <td style={{ fontWeight: c.isRead ? 400 : 600 }}>{c.name}</td>
                                            <td style={{ fontSize: '0.85rem' }}>{c.email}</td>
                                            <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                                {c.message}
                                            </td>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                                {new Date(c.createdAt).toLocaleDateString('en-NG')}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {!c.isRead && (
                                                        <button onClick={() => handleMarkRead(c.id)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem' }}>
                                                            Mark Read
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDeleteContact(c.id)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem', color: 'var(--color-error)' }}>
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {contacts.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                                                No messages
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* ===== USERS ===== */}
                        {activeTab === 'users' && (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Joined</th>
                                        <th>Last Login</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u: any) => (
                                        <tr key={u.id}>
                                            <td style={{ fontWeight: 500 }}>{u.name}</td>
                                            <td style={{ fontSize: '0.85rem' }}>{u.email}</td>
                                            <td>
                                                <span className={`status-badge ${u.role === 'ADMIN' || u.role === 'SUPERADMIN' ? 'status-confirmed' : 'status-processing'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${u.isActive ? 'status-delivered' : 'status-cancelled'}`}>
                                                    {u.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                                {new Date(u.createdAt).toLocaleDateString('en-NG')}
                                            </td>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                                {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-NG') : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* ===== CONTENT ===== */}
                        {activeTab === 'content' && (
                            <div>
                                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                                    {['riddle', 'health_tip', 'fruit_fact'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={async () => {
                                                try {
                                                    await adminApi.generateContent(type);
                                                    alert(`${type} generated!`);
                                                } catch {
                                                    alert('Generation failed');
                                                }
                                            }}
                                            className="btn btn-outline btn-sm"
                                            style={{ textTransform: 'capitalize' }}
                                        >
                                            Generate {type.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                                <p style={{ color: 'var(--color-text-light)', fontSize: '0.92rem' }}>
                                    Content is auto-generated every 12 hours via scheduled tasks.
                                    Use the buttons above to manually generate new content on demand.
                                </p>
                            </div>
                        )}

                        {/* ===== PRODUCTS ===== */}
                        {activeTab === 'products' && (
                            <div>
                                <p style={{ color: 'var(--color-text-light)', fontSize: '0.92rem', marginBottom: 24 }}>
                                    Product management is handled via the API. Use the admin endpoints
                                    to create, update, and delete products. Full CRUD management panel
                                    will be added in the next update.
                                </p>
                            </div>
                        )}

                        {/* ===== ACTIVITY / AUDIT LOG ===== */}
                        {activeTab === 'activity' && (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Action</th>
                                        <th>Resource</th>
                                        <th>User</th>
                                        <th>IP</th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activity.map((a: any) => (
                                        <tr key={a.id}>
                                            <td style={{ fontWeight: 500, fontSize: '0.88rem' }}>{a.action}</td>
                                            <td style={{ fontSize: '0.85rem' }}>{a.resource}</td>
                                            <td style={{ fontSize: '0.85rem' }}>{a.userEmail}</td>
                                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                {a.ipAddress}
                                            </td>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                                {new Date(a.createdAt).toLocaleString('en-NG')}
                                            </td>
                                        </tr>
                                    ))}
                                    {activity.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                                                No audit logs yet
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* ===== RAMADAN OFFERS ===== */}
                        {activeTab === 'ramadan' && (
                            <div>
                                {/* Flash Sales Section */}
                                <div style={{ marginBottom: 40 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>⚡ Flash Sales</h2>
                                        <button onClick={() => setShowFlashForm(!showFlashForm)} className="btn btn-primary btn-sm">
                                            {showFlashForm ? 'Cancel' : '+ New Flash Sale'}
                                        </button>
                                    </div>

                                    {showFlashForm && (
                                        <form onSubmit={handleCreateFlashSale} style={{ background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 20 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                <div className="form-group">
                                                    <label className="form-label">Product ID</label>
                                                    <input name="productId" className="form-input" required placeholder="Paste product ID" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Sale Price (₦)</label>
                                                    <input name="salePrice" type="number" className="form-input" required min="0" step="0.01" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Image URL (optional)</label>
                                                    <input name="imageUrl" className="form-input" placeholder="https://..." />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Banner Text</label>
                                                    <input name="bannerText" className="form-input" defaultValue="Ramadan Special!" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Start Time</label>
                                                    <input name="startTime" type="datetime-local" className="form-input" required />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">End Time</label>
                                                    <input name="endTime" type="datetime-local" className="form-input" required />
                                                </div>
                                            </div>
                                            <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                                                Create Flash Sale
                                            </button>
                                        </form>
                                    )}

                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Original Price</th>
                                                <th>Sale Price</th>
                                                <th>Discount</th>
                                                <th>Start</th>
                                                <th>End</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {flashSales.map((fs: any) => {
                                                const now = new Date();
                                                const isLive = fs.isActive && new Date(fs.startTime) <= now && new Date(fs.endTime) > now;
                                                const discount = Math.round((1 - Number(fs.salePrice) / Number(fs.originalPrice)) * 100);
                                                return (
                                                    <tr key={fs.id}>
                                                        <td style={{ fontWeight: 500 }}>{fs.product?.name || fs.productId}</td>
                                                        <td>₦{Number(fs.originalPrice).toLocaleString()}</td>
                                                        <td style={{ fontWeight: 600, color: 'var(--color-accent)' }}>₦{Number(fs.salePrice).toLocaleString()}</td>
                                                        <td><span className="status-badge status-confirmed">{discount}% OFF</span></td>
                                                        <td style={{ fontSize: '0.82rem' }}>{new Date(fs.startTime).toLocaleString('en-NG')}</td>
                                                        <td style={{ fontSize: '0.82rem' }}>{new Date(fs.endTime).toLocaleString('en-NG')}</td>
                                                        <td>
                                                            <span className={`status-badge ${isLive ? 'status-delivered' : fs.isActive ? 'status-processing' : 'status-cancelled'}`}>
                                                                {isLive ? '🔴 LIVE' : fs.isActive ? 'Scheduled' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: 6 }}>
                                                                <button onClick={() => handleToggleFlashSale(fs.id, fs.isActive)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem' }}>
                                                                    {fs.isActive ? 'Disable' : 'Enable'}
                                                                </button>
                                                                <button onClick={() => handleDeleteFlashSale(fs.id)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem', color: 'var(--color-error)' }}>
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {flashSales.length === 0 && (
                                                <tr>
                                                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                                                        No flash sales. Create one above!
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Promotions Section */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>🎁 Promotions & Delivery Discounts</h2>
                                        <button onClick={() => setShowPromoForm(!showPromoForm)} className="btn btn-primary btn-sm">
                                            {showPromoForm ? 'Cancel' : '+ New Promotion'}
                                        </button>
                                    </div>

                                    {showPromoForm && (
                                        <form onSubmit={handleCreatePromotion} style={{ background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 20 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                <div className="form-group">
                                                    <label className="form-label">Type</label>
                                                    <select name="type" className="form-input" required>
                                                        <option value="RAMADAN_DELIVERY">Ramadan Delivery Discount</option>
                                                        <option value="FLASH_SALE">Flash Sale Campaign</option>
                                                        <option value="REFERRAL">Referral Bonus</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Title</label>
                                                    <input name="title" className="form-input" required placeholder="e.g. Ramadan Free Delivery" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Discount %</label>
                                                    <input name="discountPercent" type="number" className="form-input" required min="0" max="100" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Min Order Amount (₦)</label>
                                                    <input name="minOrderAmount" type="number" className="form-input" defaultValue="20000" min="0" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Start Date</label>
                                                    <input name="startDate" type="datetime-local" className="form-input" required />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">End Date</label>
                                                    <input name="endDate" type="datetime-local" className="form-input" required />
                                                </div>
                                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                                    <label className="form-label">Description (optional)</label>
                                                    <textarea name="description" className="form-input" rows={2} placeholder="Promotion details..." />
                                                </div>
                                            </div>
                                            <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                                                Create Promotion
                                            </button>
                                        </form>
                                    )}

                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Type</th>
                                                <th>Title</th>
                                                <th>Discount</th>
                                                <th>Min Order</th>
                                                <th>Period</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {promotions.map((p: any) => {
                                                const now = new Date();
                                                const isLive = p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) > now;
                                                return (
                                                    <tr key={p.id}>
                                                        <td><span className="status-badge status-processing">{p.type}</span></td>
                                                        <td style={{ fontWeight: 500 }}>{p.title}</td>
                                                        <td style={{ fontWeight: 600 }}>{p.discountPercent}%</td>
                                                        <td>₦{Number(p.minOrderAmount).toLocaleString()}</td>
                                                        <td style={{ fontSize: '0.82rem' }}>
                                                            {new Date(p.startDate).toLocaleDateString('en-NG')} — {new Date(p.endDate).toLocaleDateString('en-NG')}
                                                        </td>
                                                        <td>
                                                            <span className={`status-badge ${isLive ? 'status-delivered' : p.isActive ? 'status-pending' : 'status-cancelled'}`}>
                                                                {isLive ? '🟢 Active' : p.isActive ? 'Scheduled' : 'Disabled'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: 6 }}>
                                                                <button onClick={() => handleTogglePromotion(p.id, p.isActive)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem' }}>
                                                                    {p.isActive ? 'Disable' : 'Enable'}
                                                                </button>
                                                                <button onClick={() => handleDeletePromotion(p.id)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem', color: 'var(--color-error)' }}>
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {promotions.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                                                        No promotions. Create a Ramadan delivery discount above!
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
