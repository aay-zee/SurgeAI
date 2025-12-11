import api from '@/lib/axios';
import { LoginCredentials, RegisterCredentials, AuthResponse, User } from '@/types/auth';
import { jwtDecode } from 'jwt-decode';

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
  
  // Check if user is authenticated (checks token existence and expiration)
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    if (!token) return false;

    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      // Check if token is expired
      if (decoded.exp && decoded.exp < currentTime) {
        // Token is expired
        // Optionally, we could try to refresh here, but for simple auth check
        // we'll return false and let the interceptor or login page handle it
        return false;
      }
      
      return true;
    } catch (error) {
      // If token is invalid
      return false;
    }
  }
};
