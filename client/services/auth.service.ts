import api from '@/lib/axios';
import { LoginCredentials, RegisterCredentials, AuthResponse, User } from '@/types/auth';

export const authService = {
  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Convert JSON to URL encoded form data (as required by OAuth2PasswordRequestForm in FastAPI)
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    const response = await api.post<AuthResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    
    return response.data;
  },

  // Register user
  async register(data: RegisterCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    
    return response.data;
  },

  // Logout user
  async logout(): Promise<void> {
    try {
        await api.post('/auth/logout');
    } finally {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }
  },

  // Get current user profile
  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
  
  // Check if user is authenticated (simple check)
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }
};
