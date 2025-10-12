// Authentication Service for Frontend
// Handles JWT tokens, API calls with authentication, and user session management

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface UserData {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationName: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data: UserData & AuthTokens;
}

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
}

class AuthService {
  private static instance: AuthService;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private user: UserData | null = null;

  private constructor() {
    this.loadTokensFromStorage();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Load tokens from localStorage
  private loadTokensFromStorage(): void {
    try {
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');

      if (storedAccessToken) {
        this.accessToken = storedAccessToken;
      }
      if (storedRefreshToken) {
        this.refreshToken = storedRefreshToken;
      }
      if (storedUser) {
        this.user = JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Error loading tokens from storage:', error);
      this.clearTokens();
    }
  }

  // Save tokens to localStorage
  private saveTokensToStorage(tokens: AuthTokens, user: UserData): void {
    try {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
      this.user = user;
    } catch (error) {
      console.error('Error saving tokens to storage:', error);
    }
  }

  // Clear tokens from localStorage
  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return this.accessToken !== null && this.user !== null;
  }

  // Get current user data
  public getCurrentUser(): UserData | null {
    return this.user;
  }

  // Get access token
  public getAccessToken(): string | null {
    return this.accessToken;
  }

  // Login user
  public async login(username: string, password: string, organizationName: string): Promise<LoginResponse> {
    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          organizationName
        })
      });

      const data: LoginResponse = await response.json();

      if (data.success && data.data) {
        const { accessToken, refreshToken, expiresIn, ...userData } = data.data;
        
        this.saveTokensToStorage(
          { accessToken, refreshToken, expiresIn },
          userData
        );

        console.log('✅ Login successful:', userData);
      }

      return data;
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  // Register user
  public async register(userData: any): Promise<ApiResponse> {
    try {
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data: ApiResponse = await response.json();

      if (data.success && data.data) {
        const { accessToken, refreshToken, expiresIn, ...user } = data.data;
        
        this.saveTokensToStorage(
          { accessToken, refreshToken, expiresIn },
          user
        );

        console.log('✅ Registration successful:', user);
      }

      return data;
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  }

  // Refresh access token
  public async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch('http://localhost:8000/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken
        })
      });

      const data: ApiResponse<AuthTokens> = await response.json();

      if (data.success && data.data) {
        const { accessToken, refreshToken } = data.data;
        
        // Update tokens
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        console.log('✅ Token refreshed successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      return false;
    }
  }

  // Logout user
  public async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        // Call logout endpoint to blacklist token
        await fetch('http://localhost:8000/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          }
        });
      }
    } catch (error) {
      console.error('❌ Logout API call failed:', error);
    } finally {
      // Always clear local tokens
      this.clearTokens();
      console.log('✅ Logged out successfully');
    }
  }

  // Make authenticated API request
  public async authenticatedRequest<T = any>(
    url: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authorization header if we have a token
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // If unauthorized, try to refresh token
      if (response.status === 401) {
        const refreshed = await this.refreshAccessToken();
        
        if (refreshed && this.accessToken) {
          // Retry the request with new token
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          
          const retryData: ApiResponse<T> = await retryResponse.json();
          return retryData;
        } else {
          // Refresh failed, redirect to login
          this.clearTokens();
          throw new Error('Session expired. Please log in again.');
        }
      }

      const data: ApiResponse<T> = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Authenticated request failed:', error);
      throw error;
    }
  }

  // Get current user profile from server
  public async getCurrentUserProfile(): Promise<ApiResponse<UserData>> {
    return this.authenticatedRequest<UserData>('http://localhost:8000/auth/me');
  }

  // Test protected route
  public async testProtectedRoute(): Promise<ApiResponse> {
    return this.authenticatedRequest('http://localhost:8000/api/protected');
  }

  // Test admin route
  public async testAdminRoute(): Promise<ApiResponse> {
    return this.authenticatedRequest('http://localhost:8000/api/admin');
  }

  // Test user management route
  public async testUserManagementRoute(): Promise<ApiResponse> {
    return this.authenticatedRequest('http://localhost:8000/api/user-management');
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
export default authService;
