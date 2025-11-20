// Authentication Service for Frontend
// Handles JWT tokens, API calls with authentication, and user session management

const API_BASE_URL = 'http://localhost:8000';

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
  organizationId?: string;
  organizationDisplayName?: string;
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

interface OrganizationDepartmentsResponse {
  organization: {
    id: string;
    name: string;
    displayName: string;
  };
  departments: Array<{
    id: string;
    name: string;
    displayName: string;
  }>;
}

class AuthService {
  private static instance: AuthService;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private user: UserData | null = null;
  private tokenStorage: 'session' | 'local' = 'session';

  private constructor() {
    this.loadTokensFromStorage();
  }

  private getStorage(type: 'session' | 'local' = 'session'): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return type === 'local' ? window.localStorage : window.sessionStorage;
    } catch (error) {
      console.error(`${type}Storage is not available`, error);
      return null;
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Load tokens from storage (session first, then local for remember-me)
  private loadTokensFromStorage(): void {
    const tryLoad = (storage: Storage | null, storageType: 'session' | 'local'): boolean => {
      if (!storage) {
        return false;
      }

      try {
        const storedAccessToken = storage.getItem('accessToken');
        const storedRefreshToken = storage.getItem('refreshToken');
        const storedUser = storage.getItem('user');

        if (!storedAccessToken || !storedRefreshToken || !storedUser) {
          return false;
        }

        this.accessToken = storedAccessToken;
        this.refreshToken = storedRefreshToken;
        this.user = JSON.parse(storedUser);
        this.tokenStorage = storageType;
        return true;
      } catch (error) {
        console.error('Error loading tokens from storage:', error);
        storage.removeItem('accessToken');
        storage.removeItem('refreshToken');
        storage.removeItem('user');
        return false;
      }
    };

    if (tryLoad(this.getStorage('session'), 'session')) {
      return;
    }

    tryLoad(this.getStorage('local'), 'local');
  }

  // Save tokens to chosen storage
  private saveTokensToStorage(tokens: AuthTokens, user: UserData, remember = false): void {
    try {
      const primaryStorage = this.getStorage(remember ? 'local' : 'session');
      if (!primaryStorage) {
        return;
      }

      const secondaryStorage = this.getStorage(remember ? 'session' : 'local');

      primaryStorage.setItem('accessToken', tokens.accessToken);
      primaryStorage.setItem('refreshToken', tokens.refreshToken);
      primaryStorage.setItem('user', JSON.stringify(user));

      secondaryStorage?.removeItem('accessToken');
      secondaryStorage?.removeItem('refreshToken');
      secondaryStorage?.removeItem('user');
      
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
      this.user = user;
      this.tokenStorage = remember ? 'local' : 'session';
    } catch (error) {
      console.error('Error saving tokens to storage:', error);
    }
  }

  // Clear tokens from localStorage
  private clearTokens(): void {
    const session = this.getStorage('session');
    const local = this.getStorage('local');

    session?.removeItem('accessToken');
    session?.removeItem('refreshToken');
    session?.removeItem('user');

    local?.removeItem('accessToken');
    local?.removeItem('refreshToken');
    local?.removeItem('user');

    this.tokenStorage = 'session';
    
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
  public async login(
    username: string,
    password: string,
    organizationName: string,
    rememberMe = false
  ): Promise<LoginResponse> {
    try {
      const response = await fetch('http://localhost:8000/auth/login', {
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
          userData,
          rememberMe
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
        
        const storage = this.getStorage(this.tokenStorage);
        if (storage) {
          storage.setItem('accessToken', accessToken);
          storage.setItem('refreshToken', refreshToken);
        }
        
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
      const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      // If unauthorized, try to refresh token
      if (response.status === 401) {
        const refreshed = await this.refreshAccessToken();
        
        if (refreshed && this.accessToken) {
          // Retry the request with new token
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(fullUrl, {
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

  // Key Management Methods

  /**
   * Upload public key to backend
   */
  public async uploadPublicKey(publicKeyPem: string, organizationName: string): Promise<ApiResponse> {
    try {
      const response = await this.authenticatedRequest('/api/keys/public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKeyPem,
          organizationName
        }),
      });

      return response;
    } catch (error) {
      console.error('Public key upload failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error during key upload'
      };
    }
  }

  /**
   * Get public keys for an organization
   */
  public async getOrganizationKeys(organizationId: string): Promise<ApiResponse> {
    try {
      const response = await this.authenticatedRequest(`/api/keys/organization/${organizationId}`);
      return response;
    } catch (error) {
      console.error('Organization keys query failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error during keys query'
      };
    }
  }

  /**
   * Get specific user's public key in organization
   */
  public async getUserKeyInOrganization(userId: string, organizationId: string): Promise<ApiResponse> {
    try {
      const response = await this.authenticatedRequest(`/api/keys/user/${userId}/org/${organizationId}`);
      return response;
    } catch (error) {
      console.error('User key query failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error during key query'
      };
    }
  }

  /**
   * Get public key by ID
   */
  public async getPublicKeyById(keyId: string): Promise<ApiResponse> {
    try {
      const response = await this.authenticatedRequest(`/api/keys/public/${keyId}`);
      return response;
    } catch (error) {
      console.error('Key query failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error during key query'
      };
    }
  }

  /**
   * Get current user's keys across all organizations
   */
  public async getMyKeys(): Promise<ApiResponse> {
    try {
      const response = await this.authenticatedRequest('/api/keys/my-keys');
      return response;
    } catch (error) {
      console.error('User keys query failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error during user keys query'
      };
    }
  }

  public async fetchOrganizationDepartments(
    organizationName: string
  ): Promise<ApiResponse<OrganizationDepartmentsResponse>> {
    if (!organizationName) {
      return {
        success: false,
        message: 'Organization name is required',
      };
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/org/departments/${encodeURIComponent(organizationName.trim())}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const data: ApiResponse<OrganizationDepartmentsResponse> = await response.json();
      return data;
    } catch (error) {
      console.error('Organization department lookup failed:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to look up organization departments right now.',
      };
    }
  }

  public async fetchOrganizations(
    excludeSelf = true
  ): Promise<ApiResponse<{ organizations: { id: string; name: string; displayName: string }[] }>> {
    const query = excludeSelf ? '?excludeSelf=true' : '';
    return this.authenticatedRequest(`/org/list${query}`);
  }

  public async confirmLocalAccount(payload: {
    status: 'success' | 'failed';
    serverUrl?: string;
    externalUserId?: string;
    error?: string;
  }): Promise<ApiResponse> {
    return this.authenticatedRequest('/auth/local-sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Update public key
   */
  public async updatePublicKey(keyId: string, updateData: { publicKeyPem?: string; keyType?: string; keySize?: number }): Promise<ApiResponse> {
    try {
      const response = await this.authenticatedRequest(`/api/keys/public/${keyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      return response;
    } catch (error) {
      console.error('Key update failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error during key update'
      };
    }
  }

  /**
   * Deactivate public key
   */
  public async deactivatePublicKey(keyId: string): Promise<ApiResponse> {
    try {
      const response = await this.authenticatedRequest(`/api/keys/public/${keyId}`, {
        method: 'DELETE',
      });

      return response;
    } catch (error) {
      console.error('Key deactivation failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error during key deactivation'
      };
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
export default authService;
