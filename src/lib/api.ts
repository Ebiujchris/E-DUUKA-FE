const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  shopId?: string;
  isActive?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  isNew?: boolean;
}

export interface DashboardData {
  today: {
    sales: number;
    profit: number;
    transactions: number;
    cashSales: number;
    creditSales: number;
  };
  week: {
    sales: number;
    profit: number;
    transactions: number;
  };
  month: {
    sales: number;
    profit: number;
    transactions: number;
    profitMargin: number;
  };
  inventory: {
    lowStockCount: number;
    lowStockProducts: Array<{
      id: string;
      name: string;
      stock: number;
      sellingPrice?: number;
    }>;
  };
  credits: {
    totalOutstanding: number;
    pendingCount: number;
    overdueCount: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    paymentType?: string;
    createdAt: string;
  }>;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const isAuthEndpoint = endpoint.startsWith('/auth/');

    if (this.token && !isAuthEndpoint) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.token = null;
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('authToken');
        window.localStorage.removeItem('userData');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  login(phone: string, password: string) {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  }

  register(data: {
    phone: string;
    name: string;
    password: string;
    shopName: string;
    shopLocation?: string;
    shopInitialCapital?: number;
  }) {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getCurrentUser() {
    return this.request<User>('/users/me');
  }

  getDashboardData() {
    return this.request<DashboardData>('/dashboard');
  }

  getDashboardAnalytics(period: 'week' | 'month' | 'year' = 'month') {
    return this.request(`/dashboard/analytics?period=${period}`);
  }
}

export const api = new ApiService();

export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('0')) return '+256' + trimmed.slice(1);
  return trimmed;
}
