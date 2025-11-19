interface RequestOptions extends RequestInit {
  token?: string;
  body?: any;
}

const normalizeBaseUrl = (baseUrl: string) => {
  if (!baseUrl) return '';
  const trimmed = baseUrl.trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const jsonRequest = async <T>(
  baseUrl: string,
  path: string,
  { token, body, ...options }: RequestOptions = {}
): Promise<T> => {
  const normalized = normalizeBaseUrl(baseUrl);
  const response = await fetch(`${normalized}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || 'Private-key-server request failed');
  }

  return data as T;
};

export interface AdminStatusResponse {
  success: boolean;
  data: {
    exists: boolean;
  };
}

export interface AdminAuthResponse {
  success: boolean;
  data: {
    token: string;
    admin: {
      id: string;
      username: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  };
}

export interface DepartmentCreationResponse {
  success: boolean;
  data: {
    departmentName: string;
    normalizedDepartmentName: string;
    publicKeyPem: string;
    keyType: string;
    keySize: number;
    fingerprint: string;
  };
}

export interface LocalUserRegistrationResponse {
  success: boolean;
  data: {
    userId: string;
    departmentName: string;
    organizationName: string;
  };
}

export const privateKeyServerClient = {
  getHealth: async (baseUrl: string) => {
    const normalized = normalizeBaseUrl(baseUrl);
    const response = await fetch(`${normalized}/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  },
  getAdminStatus: (baseUrl: string) =>
    jsonRequest<AdminStatusResponse>(baseUrl, '/admin/status'),
  registerAdmin: (baseUrl: string, payload: Record<string, string>) =>
    jsonRequest<AdminAuthResponse>(baseUrl, '/admin/register', {
      method: 'POST',
      body: payload,
    }),
  loginAdmin: (baseUrl: string, payload: { username: string; password: string }) =>
    jsonRequest<AdminAuthResponse>(baseUrl, '/admin/login', {
      method: 'POST',
      body: payload,
    }),
  logoutAdmin: (baseUrl: string, token: string) =>
    jsonRequest(baseUrl, '/admin/logout', {
      method: 'POST',
      token,
    }),
  createDepartment: (
    baseUrl: string,
    token: string,
    payload: { departmentName: string; organizationName: string }
  ) =>
    jsonRequest<DepartmentCreationResponse>(baseUrl, '/departments', {
      method: 'POST',
      token,
      body: payload,
    }),
  registerUser: (
    baseUrl: string,
    payload: {
      username: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      jobTitle: string;
      phone: string;
      departmentName: string;
      organizationName: string;
      role?: string;
    }
  ) =>
    jsonRequest<LocalUserRegistrationResponse>(baseUrl, '/users/register', {
      method: 'POST',
      body: payload,
    }),
};

