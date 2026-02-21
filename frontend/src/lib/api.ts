/**
 * API Client
 * 
 * Centralized API communication. The frontend NEVER talks to the DB directly.
 * All requests go through this client to the backend.
 *
 * In production, fetch() calls use '/api' (relative) so they go through the
 * Vercel rewrite proxy defined in next.config.js (avoids CORS).
 * Browser navigations (OAuth) need the real backend origin.
 */

// For fetch() calls — use relative path in production so Vercel rewrites to backend
const API_BASE =
    typeof window !== 'undefined' && process.env.NODE_ENV === 'production'
        ? '/api'                                               // same-origin, rewritten by Vercel
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');

// For browser redirects (OAuth) — must be the real backend URL
const BACKEND_ORIGIN =
    process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}

const TOKEN_KEY = 'sb_access_token';

export function setAccessToken(token: string | null) {
    if (typeof window === 'undefined') return;
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        localStorage.removeItem(TOKEN_KEY);
    }
}

export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}

async function refreshToken(): Promise<string | null> {
    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        });

        if (!res.ok) return null;

        const data = await res.json();
        setAccessToken(data.accessToken);
        return data.accessToken;
    } catch {
        return null;
    }
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE}${endpoint}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (getAccessToken()) {
        headers['Authorization'] = `Bearer ${getAccessToken()}`;
    }

    let res = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
    });

    // If 401, try to refresh token
    if (res.status === 401 && getAccessToken()) {
        const newToken = await refreshToken();
        if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            res = await fetch(url, {
                ...options,
                headers,
                credentials: 'include',
            });
        }
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Request failed' }));
        throw new ApiError(error.message || 'Request failed', res.status);
    }

    return res.json();
}

// ============================================
// AUTH API
// ============================================
export const authApi = {
    // OAuth must navigate the browser to the REAL backend, not the rewrite
    getGoogleAuthUrl: () => {
        // Remove trailing /api if present so we get the origin only
        const origin = BACKEND_ORIGIN.replace(/\/api\/?$/, '');
        return `${origin}/api/auth/google`;
    },
    getMe: () => request<any>('/auth/me'),
    logout: () => request<any>('/auth/logout', { method: 'POST' }),
    logoutAll: () => request<any>('/auth/logout-all', { method: 'POST' }),
};

// ============================================
// PRODUCTS API
// ============================================
export const productsApi = {
    getAll: (params?: Record<string, string>) => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return request<any[]>(`/products${query}`);
    },
    getBySlug: (slug: string) => request<any>(`/products/slug/${slug}`),
    getById: (id: string) => request<any>(`/products/${id}`),
    getCategories: () => request<string[]>('/products/categories'),
};

// ============================================
// ORDERS API
// ============================================
export const ordersApi = {
    create: (data: {
        items: Array<{ productId: string; quantity: number }>;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        deliveryAddress: string;
        notes?: string;
    }) => request<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),

    getMyOrders: () => request<any[]>('/orders/my-orders'),
    getById: (id: string) => request<any>(`/orders/${id}`),

    // Initialize Flutterwave payment — returns { paymentLink, txRef }
    initializePayment: (orderId: string) =>
        request<{ success: boolean; paymentLink: string; txRef: string }>(
            `/orders/${orderId}/pay`,
            { method: 'POST' }
        ),
};

// ============================================
// AI API
// ============================================
export const aiApi = {
    chat: (message: string, condition?: string) =>
        request<{ response: string }>('/ai/chat', {
            method: 'POST',
            body: JSON.stringify({ message, condition }),
        }),
};

// ============================================
// CONTENT API
// ============================================
export const contentApi = {
    getToday: () => request<any[]>('/content/today'),
    getRiddles: (limit?: number) =>
        request<any[]>(`/content/riddles${limit ? `?limit=${limit}` : ''}`),
    getTips: (limit?: number) =>
        request<any[]>(`/content/tips${limit ? `?limit=${limit}` : ''}`),
    getFacts: (limit?: number) =>
        request<any[]>(`/content/facts${limit ? `?limit=${limit}` : ''}`),
    likeContent: (id: string) =>
        request<any>(`/content/${id}/like`, { method: 'POST' }),
};

// ============================================
// CONTACT API
// ============================================
export const contactApi = {
    submit: (data: { name: string; email: string; phone?: string; message: string }) =>
        request<any>('/contact', { method: 'POST', body: JSON.stringify(data) }),
};

// ============================================
// REFERRALS API
// ============================================
export const referralsApi = {
    getMyStats: () => request<any>('/referrals/my-stats'),
    getMyCode: () => request<{ referralCode: string }>('/referrals/my-code'),
    applyCode: (code: string) =>
        request<any>(`/referrals/apply/${code}`, { method: 'POST' }),
    checkReward: () => request<any>('/referrals/reward-status'),
    validateCode: (code: string) =>
        request<{ valid: boolean; referrerName?: string }>(`/referrals/validate/${code}`),
};

// ============================================
// PROMOTIONS API
// ============================================
export const promotionsApi = {
    getActive: () => request<any[]>('/promotions/active'),
    getFlashSales: () => request<any[]>('/promotions/flash-sales'),
};

// ============================================
// ADMIN API
// ============================================
export const adminApi = {
    getDashboard: () => request<any>('/admin/dashboard'),
    getOrders: (params?: Record<string, string>) => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return request<any>(`/admin/orders${query}`);
    },
    updateOrderStatus: (id: string, status: string) =>
        request<any>(`/orders/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),
    getUsers: () => request<any[]>('/users'),
    getUserStats: () => request<any>('/users/stats'),
    getContacts: (unread?: boolean) =>
        request<any[]>(`/contact${unread ? '?unread=true' : ''}`),
    markContactRead: (id: string) =>
        request<any>(`/contact/${id}/read`, { method: 'PATCH' }),
    deleteContact: (id: string) =>
        request<any>(`/contact/${id}`, { method: 'DELETE' }),
    getActivity: () => request<any[]>('/admin/activity'),
    getContentStats: () => request<any>('/admin/content-stats'),
    getAiStats: () => request<any>('/admin/ai-stats'),
    getAiAnalytics: () => request<any>('/admin/ai-analytics'),
    getLoginAnalytics: () => request<any>('/admin/login-analytics'),
    generateContent: (type: string) =>
        request<any>(`/content/generate/${type}`, { method: 'POST' }),

    // Products management
    createProduct: (data: any) =>
        request<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
    updateProduct: (id: string, data: any) =>
        request<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProduct: (id: string) =>
        request<any>(`/products/${id}`, { method: 'DELETE' }),

    // Flash Sales management
    getFlashSales: () => request<any[]>('/promotions/admin/flash-sales'),
    createFlashSale: (data: any) =>
        request<any>('/promotions/admin/flash-sales', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    updateFlashSale: (id: string, data: any) =>
        request<any>(`/promotions/admin/flash-sales/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
    deleteFlashSale: (id: string) =>
        request<any>(`/promotions/admin/flash-sales/${id}`, { method: 'DELETE' }),

    // Promotions management
    getPromotions: () => request<any[]>('/promotions/admin/all'),
    createPromotion: (data: any) =>
        request<any>('/promotions/admin', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    updatePromotion: (id: string, data: any) =>
        request<any>(`/promotions/admin/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
    deletePromotion: (id: string) =>
        request<any>(`/promotions/admin/${id}`, { method: 'DELETE' }),
};

export default request;
