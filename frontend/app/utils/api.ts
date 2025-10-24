// Get API URL from window.ENV (set by root loader) or default to localhost
function getApiUrl(): string {
  if (typeof window !== 'undefined' && window.ENV) {
    return window.ENV.API_URL;
  }
  return 'http://localhost:3001';
}

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${getApiUrl()}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    this.setToken(response.token);
    return response;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.token);
    return response;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/api/me');
  }

  async saveEntry(date: string, content: any): Promise<any> {
    return this.request('/api/entries', {
      method: 'POST',
      body: JSON.stringify({ date, content }),
    });
  }

  async getEntry(date: string): Promise<any> {
    return this.request(`/api/entries/${date}`);
  }

  async getEntriesInRange(startDate: string, endDate: string): Promise<any[]> {
    return this.request(`/api/entries/range/${startDate}/${endDate}`);
  }

  async getEntriesForDay(month: number, day: number): Promise<any[]> {
    return this.request(`/api/entries/day/${month}/${day}`);
  }

  // Messages API
  async getRandomMessage(context: 'login' | 'entry' | 'register'): Promise<any> {
    return this.request(`/api/messages/random?context=${context}`);
  }

  async trackMessageInteraction(data: {
    messageId: number;
    sessionId: string;
    userId?: number | null;
    context: 'login' | 'register' | 'entry';
    userState: 'new_visitor' | 'no_entries' | 'has_entries';
    outcome?: 'registered' | 'wrote_first_entry' | 'wrote_entry' | 'left' | null;
  }): Promise<any> {
    return this.request('/api/messages/track', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserState(): Promise<{ userState: string; entryCount: number }> {
    return this.request('/api/messages/user-state');
  }

  // Admin API
  async getAdminMessages(): Promise<any[]> {
    return this.request('/api/admin/messages');
  }

  async createMessage(data: {
    messageText: string;
    context: 'login' | 'entry' | 'both';
    tone?: string;
    length?: string;
  }): Promise<any> {
    return this.request('/api/admin/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMessage(
    id: number,
    data: {
      messageText?: string;
      context?: 'login' | 'entry' | 'both';
      tone?: string;
      length?: string;
      isActive?: boolean;
    }
  ): Promise<any> {
    return this.request(`/api/admin/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMessage(id: number): Promise<any> {
    return this.request(`/api/admin/messages/${id}`, {
      method: 'DELETE',
    });
  }

  async getMessageStats(id: number): Promise<any[]> {
    return this.request(`/api/admin/messages/${id}/stats`);
  }

  logout() {
    this.setToken(null);
  }
}

export const api = new ApiClient();
