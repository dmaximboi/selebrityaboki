'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { adminApi, productsApi } from '@/lib/api';

type Tab = 'dashboard' | 'analytics' | 'ai' | 'logins' | 'orders' | 'products' | 'contacts' | 'users' | 'content' | 'activity' | 'ramadan';

interface ProductFormData {
    name: string; slug: string; description: string; price: number;
    discountPrice?: number; stock: number; unit: string; imageUrl: string;
    category: string; healthBenefits?: string; bestFor: string[];
    isAvailable: boolean; isFeatured: boolean;
}

function fmt(n: number) {
    return `₦${n.toLocaleString('en-NG')}`;
}
function pct(part: number, total: number) {
    if (!total) return '0%';
    return `${Math.round((part / total) * 100)}%`;
}

// The actual admin panel — needs Suspense because it reads useSearchParams
function AdminContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAdmin, isLoading, login, checkAuth } = useAuthStore();
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [dashData, setDashData] = useState<any>(null);
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [aiData, setAiData] = useState<any>(null);
    const [loginData, setLoginData] = useState<any>(null);
    const [orders, setOrders] = useState<any>(null);
    const [orderStatus, setOrderStatus] = useState('');
    const [contacts, setContacts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [flashSales, setFlashSales] = useState<any[]>([]);
    const [promotions, setPromotions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showFlashForm, setShowFlashForm] = useState(false);
    const [showPromoForm, setShowPromoForm] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const tokenHandled = useRef(false);

    // Handle token from OAuth redirect OR fall back to localStorage/cookie-based auth
    useEffect(() => {
        if (tokenHandled.current) return;
        tokenHandled.current = true;

        const token = searchParams.get('t');
        if (token) {
            // Admin was redirected here with ?t=<accessToken> after Google login
            login(decodeURIComponent(token)).then(() => {
                // Clean the token from the URL bar
                router.replace('/selebme');
            });
        } else {
            // No token in URL — try localStorage/cookie-based auth
            checkAuth();
        }
    }, [searchParams, login, checkAuth, router]);

    useEffect(() => {
        if (!isLoading && !isAdmin) router.push('/');
    }, [isLoading, isAdmin, router]);

    const loadTabData = useCallback(async (tab: Tab) => {
        setLoading(true);
        try {
            switch (tab) {
                case 'dashboard':
                    setDashData(await adminApi.getDashboard());
                    break;
                case 'analytics':
                    setAnalyticsData(await adminApi.getDashboard());
                    break;
                case 'ai':
                    setAiData(await adminApi.getAiAnalytics());
                    break;
                case 'logins':
                    setLoginData(await adminApi.getLoginAnalytics());
                    break;
                case 'orders':
                    setOrders(await adminApi.getOrders(orderStatus ? { status: orderStatus } : undefined));
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
                case 'ramadan': {
                    const [fs, pr] = await Promise.all([adminApi.getFlashSales(), adminApi.getPromotions()]);
                    setFlashSales(fs);
                    setPromotions(pr);
                    break;
                }
                case 'products':
                    setProducts(await productsApi.getAll());
                    break;
            }
        } catch (e) {
            console.error('Failed to load tab data', e);
        }
        setLoading(false);
    }, [orderStatus]);

    useEffect(() => {
        if (isAdmin) loadTabData(activeTab);
    }, [activeTab, isAdmin, loadTabData]);

    async function handleOrderStatus(orderId: string, status: string) {
        try {
            await adminApi.updateOrderStatus(orderId, status);
            loadTabData('orders');
        } catch { alert('Failed to update order'); }
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
        } catch (err: any) { alert(err.message || 'Failed'); }
    }
    async function handleToggleFlashSale(id: string, isActive: boolean) {
        await adminApi.updateFlashSale(id, { isActive: !isActive });
        loadTabData('ramadan');
    }
    async function handleDeleteFlashSale(id: string) {
        if (confirm('Delete flash sale?')) { await adminApi.deleteFlashSale(id); loadTabData('ramadan'); }
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
        } catch (err: any) { alert(err.message || 'Failed'); }
    }
    async function handleTogglePromotion(id: string, isActive: boolean) {
        await adminApi.updatePromotion(id, { isActive: !isActive });
        loadTabData('ramadan');
    }
    async function handleDeletePromotion(id: string) {
        if (confirm('Delete?')) { await adminApi.deletePromotion(id); loadTabData('ramadan'); }
    }

    // Product CRUD handlers
    async function handleProductSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const data = {
            name: form.get('name') as string,
            slug: (form.get('slug') as string) || (form.get('name') as string).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description: form.get('description') as string,
            price: Number(form.get('price')),
            discountPrice: form.get('discountPrice') ? Number(form.get('discountPrice')) : undefined,
            stock: Number(form.get('stock')),
            unit: (form.get('unit') as string) || 'piece',
            imageUrl: form.get('imageUrl') as string,
            category: (form.get('category') as string) || 'fruits',
            healthBenefits: (form.get('healthBenefits') as string) || undefined,
            bestFor: (form.get('bestFor') as string)?.split(',').map(s => s.trim()).filter(Boolean) || [],
            isAvailable: form.get('isAvailable') === 'on',
            isFeatured: form.get('isFeatured') === 'on',
        };
        try {
            if (editingProduct) {
                await adminApi.updateProduct(editingProduct.id, data);
            } else {
                await adminApi.createProduct(data);
            }
            setShowProductForm(false);
            setEditingProduct(null);
            loadTabData('products');
        } catch (err: any) { alert(err.message || 'Failed to save product'); }
    }
    async function handleDeleteProduct(id: string) {
        if (confirm('Delete this product? This cannot be undone.')) {
            try { await adminApi.deleteProduct(id); loadTabData('products'); }
            catch (err: any) { alert(err.message || 'Failed to delete'); }
        }
    }
    function handleEditProduct(product: any) {
        setEditingProduct(product);
        setShowProductForm(true);
    }
    if (isLoading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
    );
    if (!isAdmin) return null;

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: 'dashboard', label: 'Dashboard', icon: '📊' },
        { key: 'analytics', label: 'Analytics', icon: '📈' },
        { key: 'ai', label: 'AI Usage', icon: '🤖' },
        { key: 'logins', label: 'Sign-ins', icon: '🔐' },
        { key: 'orders', label: 'Orders', icon: '📦' },
        { key: 'products', label: 'Products', icon: '🍎' },
        { key: 'ramadan', label: '🌙 Ramadan', icon: '' },
        { key: 'contacts', label: 'Messages', icon: '✉️' },
        { key: 'users', label: 'Users', icon: '👥' },
        { key: 'content', label: 'Content', icon: '✍️' },
        { key: 'activity', label: 'Audit Log', icon: '🗂️' },
    ];

    const statStyle = {
        background: 'white',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px 24px',
    };

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-brand">
                    <span style={{ color: 'var(--color-accent-light)' }}>Seleb</span>rity Admin
                </div>
                <ul className="admin-nav">
                    {tabs.map((tab) => (
                        <li key={tab.key}>
                            <button
                                onClick={() => setActiveTab(tab.key)}
                                className={`admin-nav-item ${activeTab === tab.key ? 'active' : ''}`}
                                style={{ width: '100%', textAlign: 'left' }}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        </li>
                    ))}
                    <li style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <a href="/" className="admin-nav-item" style={{ textDecoration: 'none' }}>← Back to Site</a>
                    </li>
                </ul>
                <div style={{ padding: '16px 24px', marginTop: 'auto', fontSize: '0.8rem', color: 'rgba(245,245,240,0.4)' }}>
                    {user?.name}<br />
                    <span style={{ fontSize: '0.72rem', color: 'rgba(245,245,240,0.25)' }}>{user?.role}</span>
                </div>
            </aside>

            {/* Content */}
            <main className="admin-content">
                <div className="admin-header">
                    <h1 className="admin-page-title">
                        {tabs.find((t) => t.key === activeTab)?.label}
                    </h1>
                    <button onClick={() => loadTabData(activeTab)} className="btn btn-ghost btn-sm">
                        ↻ Refresh
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
                                {/* KPI Cards */}
                                <div className="stat-grid" style={{ marginBottom: 24 }}>
                                    <div className="stat-item">
                                        <div className="stat-value">{dashData.orders?.total || 0}</div>
                                        <div className="stat-label">Total Orders</div>
                                        <div className="stat-change positive">+{dashData.orders?.today || 0} today</div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-value">{fmt(dashData.revenue?.total || 0)}</div>
                                        <div className="stat-label">Total Revenue</div>
                                        <div className="stat-change positive">{fmt(dashData.revenue?.today || 0)} today</div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-value">{dashData.users?.total || 0}</div>
                                        <div className="stat-label">Registered Users</div>
                                        <div className="stat-change positive">+{dashData.users?.newToday || 0} today</div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-value">{dashData.ai?.totalChats || 0}</div>
                                        <div className="stat-label">AI Requests</div>
                                        <div className="stat-change positive">+{dashData.ai?.todayChats || 0} today</div>
                                    </div>
                                </div>

                                {/* Order breakdown + Quick Actions */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                                    <div style={statStyle}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 16 }}>Order Status Breakdown</h3>
                                        {[
                                            { label: 'Pending', value: dashData.orders?.pending, color: '#f59e0b' },
                                            { label: 'Confirmed', value: dashData.orders?.confirmed, color: '#3b82f6' },
                                            { label: 'Delivered', value: dashData.orders?.delivered, color: '#10b981' },
                                            { label: 'Cancelled', value: dashData.orders?.cancelled, color: '#ef4444' },
                                        ].map((s) => (
                                            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                                                <span style={{ flex: 1, fontSize: '0.88rem' }}>{s.label}</span>
                                                <span style={{ fontWeight: 600 }}>{s.value || 0}</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', width: 40, textAlign: 'right' }}>
                                                    {pct(s.value || 0, dashData.orders?.total)}
                                                </span>
                                            </div>
                                        ))}
                                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                            Fulfillment rate: <strong style={{ color: 'var(--color-primary)' }}>{dashData.orders?.fulfillmentRate || 0}%</strong>
                                        </div>
                                    </div>

                                    <div style={statStyle}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 16 }}>Revenue Summary</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>Today</span>
                                                <strong>{fmt(dashData.revenue?.today || 0)}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>This Month</span>
                                                <strong>{fmt(dashData.revenue?.thisMonth || 0)}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                                                <span style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>All Time</span>
                                                <strong style={{ color: 'var(--color-primary)', fontSize: '1.1rem' }}>{fmt(dashData.revenue?.total || 0)}</strong>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: 16 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Active sessions</span>
                                                <span style={{ fontWeight: 600 }}>{dashData.users?.activeSessions || 0}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>New users this month</span>
                                                <span style={{ fontWeight: 600 }}>{dashData.users?.newThisMonth || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div style={statStyle}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Quick Actions</h3>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <button onClick={() => setActiveTab('orders')} className="btn btn-outline btn-sm">
                                            📦 {dashData.orders?.pending || 0} Pending Orders
                                        </button>
                                        <button onClick={() => setActiveTab('contacts')} className="btn btn-outline btn-sm">
                                            ✉️ {dashData.contacts?.unread || 0} Unread Messages
                                        </button>
                                        <button onClick={() => setActiveTab('logins')} className="btn btn-outline btn-sm">
                                            🔐 {dashData.users?.activeSessions || 0} Active Sessions
                                        </button>
                                        <button onClick={() => setActiveTab('ai')} className="btn btn-outline btn-sm">
                                            🤖 {dashData.ai?.todayChats || 0} AI requests today
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ===== ANALYTICS ===== */}
                        {activeTab === 'analytics' && analyticsData && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                                    {[
                                        { label: 'Buy Rate', desc: 'Orders / Users', value: analyticsData.users?.total ? pct(analyticsData.orders?.total, analyticsData.users?.total) : '—' },
                                        { label: 'Delivery Rate', desc: 'Delivered / Total Orders', value: pct(analyticsData.orders?.delivered, analyticsData.orders?.total) },
                                        { label: 'Cancel Rate', desc: 'Cancelled / Total Orders', value: pct(analyticsData.orders?.cancelled, analyticsData.orders?.total) },
                                        { label: 'Avg Revenue / Order', desc: 'Revenue ÷ Delivered Orders', value: analyticsData.orders?.delivered ? fmt(Math.round((analyticsData.revenue?.total || 0) / analyticsData.orders?.delivered)) : '—' },
                                        { label: 'Active Sessions', desc: 'Currently logged-in users', value: analyticsData.users?.activeSessions || 0 },
                                        { label: 'AI Engagement', desc: 'AI requests / Users', value: analyticsData.users?.total ? pct(analyticsData.ai?.totalChats, analyticsData.users?.total) : '—' },
                                    ].map((stat) => (
                                        <div key={stat.label} style={{ ...statStyle, textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>{stat.value}</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{stat.label}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{stat.desc}</div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                    <div style={statStyle}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 16 }}>Order Pipeline</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {[
                                                { label: 'Pending payment / confirmation', val: analyticsData.orders?.pending, color: '#f59e0b' },
                                                { label: 'Confirmed (preparing)', val: analyticsData.orders?.confirmed, color: '#3b82f6' },
                                                { label: 'Delivered ✓', val: analyticsData.orders?.delivered, color: '#10b981' },
                                                { label: 'Cancelled ✗', val: analyticsData.orders?.cancelled, color: '#ef4444' },
                                            ].map(r => (
                                                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: r.color + '14', borderRadius: 6, fontSize: '0.87rem' }}>
                                                    <span>{r.label}</span>
                                                    <strong style={{ color: r.color }}>{r.val || 0}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={statStyle}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 16 }}>User Growth</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                                                <span>New today</span><strong>+{analyticsData.users?.newToday || 0}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                                                <span>New this month</span><strong>+{analyticsData.users?.newThisMonth || 0}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                                                <span>Total registered</span><strong>{analyticsData.users?.total || 0}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                                                <span>Currently active</span><strong style={{ color: 'var(--color-primary)' }}>{analyticsData.users?.activeSessions || 0}</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ===== AI USAGE ===== */}
                        {activeTab === 'ai' && aiData && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                                    <div className="stat-item">
                                        <div className="stat-value">{aiData.totalChats}</div>
                                        <div className="stat-label">Total AI Requests</div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-value">{aiData.todayChats}</div>
                                        <div className="stat-label">Requests Today</div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-value">{aiData.topUsers?.length || 0}</div>
                                        <div className="stat-label">Unique AI Users</div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                    {/* Top users */}
                                    <div style={statStyle}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 16 }}>🏆 Top AI Users</h3>
                                        <table className="data-table" style={{ width: '100%' }}>
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>User</th>
                                                    <th>Requests</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {aiData.topUsers?.map((u: any, i: number) => (
                                                    <tr key={u.userId || i}>
                                                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>{i + 1}</td>
                                                        <td>
                                                            <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{u.name}</div>
                                                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{u.email}</div>
                                                        </td>
                                                        <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{u.requests}</td>
                                                    </tr>
                                                ))}
                                                {!aiData.topUsers?.length && (
                                                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>No data yet</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Recent chats */}
                                    <div style={statStyle}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 16 }}>🕐 Recent AI Requests</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
                                            {aiData.recentChats?.slice(0, 20).map((c: any) => (
                                                <div key={c.id} style={{ padding: '10px 12px', background: 'var(--color-bg-alt)', borderRadius: 6, fontSize: '0.83rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                        <span style={{ fontWeight: 500 }}>{c.user?.name || 'Guest'}</span>
                                                        <span style={{ color: 'var(--color-text-muted)' }}>{new Date(c.createdAt).toLocaleString('en-NG')}</span>
                                                    </div>
                                                    <div style={{ color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {c.message || c.query || '—'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ===== SIGN-INS ===== */}
                        {activeTab === 'logins' && loginData && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                                    <div className="stat-item">
                                        <div className="stat-value">{loginData.totalLogins}</div>
                                        <div className="stat-label">Total Sign-ins</div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-value">{loginData.loginsToday}</div>
                                        <div className="stat-label">Sign-ins Today</div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-value">{loginData.loginsThisMonth}</div>
                                        <div className="stat-label">This Month</div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-value">{loginData.activeSessions}</div>
                                        <div className="stat-label">Active Sessions (3-day)</div>
                                    </div>
                                </div>

                                <div style={statStyle}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 16 }}>Recent Sign-ins</h3>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>User</th>
                                                <th>Email</th>
                                                <th>IP Address</th>
                                                <th>Session Expires</th>
                                                <th>Status</th>
                                                <th>Signed in</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loginData.recentLogins?.map((s: any) => {
                                                const expired = new Date(s.expiresAt) < new Date();
                                                const inactive3d = !s.isValid || expired;
                                                return (
                                                    <tr key={s.id}>
                                                        <td style={{ fontWeight: 500 }}>{s.user?.name || '—'}</td>
                                                        <td style={{ fontSize: '0.84rem' }}>{s.user?.email || '—'}</td>
                                                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{s.ipAddress || '—'}</td>
                                                        <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{new Date(s.expiresAt).toLocaleDateString('en-NG')}</td>
                                                        <td>
                                                            <span className={`status-badge ${inactive3d ? 'status-cancelled' : 'status-delivered'}`}>
                                                                {inactive3d ? 'Expired' : 'Active'}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{new Date(s.createdAt).toLocaleString('en-NG')}</td>
                                                    </tr>
                                                );
                                            })}
                                            {!loginData.recentLogins?.length && (
                                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>No sign-ins yet</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {/* ===== ORDERS ===== */}
                        {activeTab === 'orders' && (
                            <>
                                {/* Filter */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                                    {['', 'PENDING', 'CONFIRMED', 'PROCESSING', 'DELIVERED', 'CANCELLED'].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => { setOrderStatus(s); loadTabData('orders'); }}
                                            className={`btn btn-sm ${orderStatus === s ? 'btn-primary' : 'btn-ghost'}`}
                                        >
                                            {s || 'All'}
                                        </button>
                                    ))}
                                </div>
                                {orders && (
                                    <>
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Order ID</th>
                                                    <th>Customer</th>
                                                    <th>Items</th>
                                                    <th>Total</th>
                                                    <th>Payment</th>
                                                    <th>Status</th>
                                                    <th>Date</th>
                                                    <th>Change Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orders.orders?.map((order: any) => (
                                                    <tr key={order.id}>
                                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{order.orderId}</td>
                                                        <td>
                                                            <div style={{ fontWeight: 500 }}>{order.customerName}</div>
                                                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{order.customerEmail}</div>
                                                        </td>
                                                        <td>{order.items?.length || 0}</td>
                                                        <td style={{ fontWeight: 600 }}>{fmt(Number(order.totalAmount))}</td>
                                                        <td>
                                                            <span className={`status-badge ${order.paymentStatus === 'SUCCESS' ? 'status-delivered' : order.paymentStatus === 'PENDING' ? 'status-pending' : 'status-cancelled'}`}>
                                                                {order.paymentStatus}
                                                            </span>
                                                        </td>
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
                                                                {['PENDING', 'CONFIRMED', 'PROCESSING', 'DELIVERED', 'CANCELLED'].map(s => (
                                                                    <option key={s} value={s}>{s}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {!orders.orders?.length && (
                                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>No orders</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                        {orders.pagination && (
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                Page {orders.pagination.page} of {orders.pagination.totalPages} ({orders.pagination.total} orders)
                                            </div>
                                        )}
                                    </>
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
                                            <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{c.message}</td>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{new Date(c.createdAt).toLocaleDateString('en-NG')}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {!c.isRead && <button onClick={() => handleMarkRead(c.id)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem' }}>Mark Read</button>}
                                                    <button onClick={() => handleDeleteContact(c.id)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem', color: 'var(--color-error)' }}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {contacts.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>No messages</td></tr>}
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
                                            <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{new Date(u.createdAt).toLocaleDateString('en-NG')}</td>
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
                                                } catch { alert('Generation failed'); }
                                            }}
                                            className="btn btn-outline btn-sm"
                                            style={{ textTransform: 'capitalize' }}
                                        >
                                            Generate {type.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                                <p style={{ color: 'var(--color-text-light)', fontSize: '0.92rem' }}>
                                    Content is auto-generated every 12 hours. Use the buttons above to trigger on demand.
                                </p>
                            </div>
                        )}

                        {/* ===== PRODUCTS ===== */}
                        {activeTab === 'products' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <span style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>{products.length} products</span>
                                    <button onClick={() => { setEditingProduct(null); setShowProductForm(!showProductForm); }} className="btn btn-primary btn-sm">
                                        {showProductForm ? 'Cancel' : '+ Add Fruit'}
                                    </button>
                                </div>

                                {showProductForm && (
                                    <form onSubmit={handleProductSubmit} style={{ background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 20 }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>{editingProduct ? '✏️ Edit Product' : '🍎 New Product'}</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <div className="form-group"><label className="form-label">Name *</label><input name="name" className="form-input" required defaultValue={editingProduct?.name} /></div>
                                            <div className="form-group"><label className="form-label">Slug</label><input name="slug" className="form-input" placeholder="auto-generated" defaultValue={editingProduct?.slug} /></div>
                                            <div className="form-group"><label className="form-label">Price (₦) *</label><input name="price" type="number" className="form-input" required min="0" step="0.01" defaultValue={editingProduct?.price} /></div>
                                            <div className="form-group"><label className="form-label">Discount Price (₦)</label><input name="discountPrice" type="number" className="form-input" min="0" step="0.01" defaultValue={editingProduct?.discountPrice} /></div>
                                            <div className="form-group"><label className="form-label">Stock *</label><input name="stock" type="number" className="form-input" required min="0" defaultValue={editingProduct?.stock ?? 0} /></div>
                                            <div className="form-group"><label className="form-label">Unit</label>
                                                <select name="unit" className="form-input" defaultValue={editingProduct?.unit || 'piece'}>
                                                    <option value="piece">Piece</option><option value="kg">Kg</option><option value="bunch">Bunch</option><option value="pack">Pack</option>
                                                </select>
                                            </div>
                                            <div className="form-group"><label className="form-label">Image URL *</label><input name="imageUrl" className="form-input" required defaultValue={editingProduct?.imageUrl} /></div>
                                            <div className="form-group"><label className="form-label">Category</label><input name="category" className="form-input" defaultValue={editingProduct?.category || 'fruits'} /></div>
                                            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Description *</label><textarea name="description" className="form-input" rows={2} required defaultValue={editingProduct?.description} /></div>
                                            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Health Benefits</label><textarea name="healthBenefits" className="form-input" rows={2} placeholder="Rich in Vitamin C, boosts immunity..." defaultValue={editingProduct?.healthBenefits} /></div>
                                            <div className="form-group"><label className="form-label">Best For (comma separated)</label><input name="bestFor" className="form-input" placeholder="diabetes, weight-loss, immunity" defaultValue={editingProduct?.bestFor?.join(', ')} /></div>
                                            <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '8px 0' }}>
                                                <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.88rem' }}><input type="checkbox" name="isAvailable" defaultChecked={editingProduct?.isAvailable ?? true} /> Available</label>
                                                <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.88rem' }}><input type="checkbox" name="isFeatured" defaultChecked={editingProduct?.isFeatured ?? false} /> Featured</label>
                                            </div>
                                        </div>
                                        <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>{editingProduct ? 'Update Product' : 'Create Product'}</button>
                                    </form>
                                )}

                                <table className="data-table">
                                    <thead><tr><th>Image</th><th>Name</th><th>Price</th><th>Stock</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {products.map((p: any) => (
                                            <tr key={p.id}>
                                                <td><img src={p.imageUrl} alt={p.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} /></td>
                                                <td>
                                                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>/{p.slug}</div>
                                                </td>
                                                <td>
                                                    {p.discountPrice ? (
                                                        <><span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>{fmt(Number(p.price))}</span> <strong style={{ color: 'var(--color-accent)' }}>{fmt(Number(p.discountPrice))}</strong></>
                                                    ) : <strong>{fmt(Number(p.price))}</strong>}
                                                </td>
                                                <td><span style={{ color: p.stock < 5 ? 'var(--color-error)' : p.stock < 20 ? '#f59e0b' : 'var(--color-primary)', fontWeight: 600 }}>{p.stock}</span> {p.unit}</td>
                                                <td><span className="status-badge status-processing">{p.category}</span></td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        {p.isAvailable && <span className="status-badge status-delivered" style={{ fontSize: '0.7rem' }}>Available</span>}
                                                        {p.isFeatured && <span className="status-badge status-confirmed" style={{ fontSize: '0.7rem' }}>Featured</span>}
                                                        {!p.isAvailable && <span className="status-badge status-cancelled" style={{ fontSize: '0.7rem' }}>Unavailable</span>}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button onClick={() => handleEditProduct(p)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem' }}>Edit</button>
                                                        <button onClick={() => handleDeleteProduct(p.id)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem', color: 'var(--color-error)' }}>Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {products.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>No products yet. Click "+ Add Fruit" to get started.</td></tr>}
                                    </tbody>
                                </table>
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
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{a.ipAddress}</td>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{new Date(a.createdAt).toLocaleString('en-NG')}</td>
                                        </tr>
                                    ))}
                                    {activity.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>No audit logs yet</td></tr>}
                                </tbody>
                            </table>
                        )}

                        {/* ===== RAMADAN OFFERS ===== */}
                        {activeTab === 'ramadan' && (
                            <div>
                                {/* Flash Sales */}
                                <div style={{ marginBottom: 40 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>⚡ Flash Sales</h2>
                                        <button onClick={() => setShowFlashForm(!showFlashForm)} className="btn btn-primary btn-sm">
                                            {showFlashForm ? 'Cancel' : '+ New Flash Sale'}
                                        </button>
                                    </div>
                                    {showFlashForm && (
                                        <form onSubmit={handleCreateFlashSale} style={{ background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 20 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                <div className="form-group"><label className="form-label">Product ID</label><input name="productId" className="form-input" required /></div>
                                                <div className="form-group"><label className="form-label">Sale Price (₦)</label><input name="salePrice" type="number" className="form-input" required min="0" /></div>
                                                <div className="form-group"><label className="form-label">Image URL</label><input name="imageUrl" className="form-input" /></div>
                                                <div className="form-group"><label className="form-label">Banner Text</label><input name="bannerText" className="form-input" defaultValue="Ramadan Special!" /></div>
                                                <div className="form-group"><label className="form-label">Start Time</label><input name="startTime" type="datetime-local" className="form-input" required /></div>
                                                <div className="form-group"><label className="form-label">End Time</label><input name="endTime" type="datetime-local" className="form-input" required /></div>
                                            </div>
                                            <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Create Flash Sale</button>
                                        </form>
                                    )}
                                    <table className="data-table">
                                        <thead><tr><th>Product</th><th>Original</th><th>Sale</th><th>Disc%</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr></thead>
                                        <tbody>
                                            {flashSales.map((fs: any) => {
                                                const now = new Date();
                                                const live = fs.isActive && new Date(fs.startTime) <= now && new Date(fs.endTime) > now;
                                                const disc = Math.round((1 - Number(fs.salePrice) / Number(fs.originalPrice)) * 100);
                                                return (
                                                    <tr key={fs.id}>
                                                        <td>{fs.product?.name || fs.productId}</td>
                                                        <td>₦{Number(fs.originalPrice).toLocaleString()}</td>
                                                        <td style={{ fontWeight: 600, color: 'var(--color-accent)' }}>₦{Number(fs.salePrice).toLocaleString()}</td>
                                                        <td><span className="status-badge status-confirmed">{disc}% OFF</span></td>
                                                        <td style={{ fontSize: '0.82rem' }}>{new Date(fs.startTime).toLocaleString('en-NG')}</td>
                                                        <td style={{ fontSize: '0.82rem' }}>{new Date(fs.endTime).toLocaleString('en-NG')}</td>
                                                        <td><span className={`status-badge ${live ? 'status-delivered' : fs.isActive ? 'status-processing' : 'status-cancelled'}`}>{live ? '🔴 LIVE' : fs.isActive ? 'Scheduled' : 'Inactive'}</span></td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: 6 }}>
                                                                <button onClick={() => handleToggleFlashSale(fs.id, fs.isActive)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem' }}>{fs.isActive ? 'Disable' : 'Enable'}</button>
                                                                <button onClick={() => handleDeleteFlashSale(fs.id)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem', color: 'var(--color-error)' }}>Delete</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {flashSales.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-muted)' }}>No flash sales</td></tr>}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Promotions */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>🎁 Promotions</h2>
                                        <button onClick={() => setShowPromoForm(!showPromoForm)} className="btn btn-primary btn-sm">{showPromoForm ? 'Cancel' : '+ New Promotion'}</button>
                                    </div>
                                    {showPromoForm && (
                                        <form onSubmit={handleCreatePromotion} style={{ background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 20 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                <div className="form-group"><label className="form-label">Type</label>
                                                    <select name="type" className="form-input" required>
                                                        <option value="RAMADAN_DELIVERY">Ramadan Delivery</option>
                                                        <option value="FLASH_SALE">Flash Sale</option>
                                                        <option value="REFERRAL">Referral Bonus</option>
                                                    </select>
                                                </div>
                                                <div className="form-group"><label className="form-label">Title</label><input name="title" className="form-input" required /></div>
                                                <div className="form-group"><label className="form-label">Discount %</label><input name="discountPercent" type="number" className="form-input" required min="0" max="100" /></div>
                                                <div className="form-group"><label className="form-label">Min Order (₦)</label><input name="minOrderAmount" type="number" className="form-input" defaultValue="20000" /></div>
                                                <div className="form-group"><label className="form-label">Start</label><input name="startDate" type="datetime-local" className="form-input" required /></div>
                                                <div className="form-group"><label className="form-label">End</label><input name="endDate" type="datetime-local" className="form-input" required /></div>
                                                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Description</label><textarea name="description" className="form-input" rows={2} /></div>
                                            </div>
                                            <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Create</button>
                                        </form>
                                    )}
                                    <table className="data-table">
                                        <thead><tr><th>Type</th><th>Title</th><th>Discount</th><th>Min Order</th><th>Period</th><th>Status</th><th>Actions</th></tr></thead>
                                        <tbody>
                                            {promotions.map((p: any) => {
                                                const now = new Date();
                                                const live = p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) > now;
                                                return (
                                                    <tr key={p.id}>
                                                        <td><span className="status-badge status-processing">{p.type}</span></td>
                                                        <td>{p.title}</td>
                                                        <td><strong>{p.discountPercent}%</strong></td>
                                                        <td>₦{Number(p.minOrderAmount).toLocaleString()}</td>
                                                        <td style={{ fontSize: '0.82rem' }}>{new Date(p.startDate).toLocaleDateString('en-NG')} — {new Date(p.endDate).toLocaleDateString('en-NG')}</td>
                                                        <td><span className={`status-badge ${live ? 'status-delivered' : p.isActive ? 'status-pending' : 'status-cancelled'}`}>{live ? '🟢 Live' : p.isActive ? 'Scheduled' : 'Off'}</span></td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: 6 }}>
                                                                <button onClick={() => handleTogglePromotion(p.id, p.isActive)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem' }}>{p.isActive ? 'Disable' : 'Enable'}</button>
                                                                <button onClick={() => handleDeletePromotion(p.id)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem', color: 'var(--color-error)' }}>Delete</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {promotions.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-muted)' }}>No promotions</td></tr>}
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

// Wrap in Suspense so useSearchParams works correctly in Next.js 13+
export default function AdminPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        }>
            <AdminContent />
        </Suspense>
    );
}
