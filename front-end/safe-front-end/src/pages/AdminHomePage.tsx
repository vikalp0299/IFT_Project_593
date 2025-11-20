import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { privateKeyServerClient } from '../services/privateKeyServerClient';
import './AdminHomePage.css';

const PRIVATE_KEY_SERVER_URL_KEY = 'safe.privateKeyServerUrl';
const ACTIVE_PRIVATE_KEY_SERVER_KEY = 'safe.activePrivateKeyServer';

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

type StatusBanner = {
  type: 'success' | 'error' | 'info';
  message: string;
};

interface AdminSession {
  baseUrl: string;
  token: string;
  admin: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface RemotePrivateKeyServer {
  id: string;
  baseUrl: string;
  isActive: boolean;
  addedAt: string;
  addedByName?: string;
}

export const AdminHomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [departmentName, setDepartmentName] = useState('');
  const [departmentStatus, setDepartmentStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDepartmentSubmitting, setIsDepartmentSubmitting] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [accessSearchTerm, setAccessSearchTerm] = useState('');
  const [isAccessSearching, setIsAccessSearching] = useState(false);
  const [employeeResults, setEmployeeResults] = useState<Array<{ id: string; name: string; title: string; email: string }>>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [departmentOptions, setDepartmentOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [accessStatus, setAccessStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [privateKeyServerUrl, setPrivateKeyServerUrl] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return localStorage.getItem(PRIVATE_KEY_SERVER_URL_KEY) ?? '';
  });
  const [savedPrivateKeyServers, setSavedPrivateKeyServers] = useState<RemotePrivateKeyServer[]>([]);
  const [isServersLoading, setIsServersLoading] = useState(false);
  const [serversError, setServersError] = useState<string | null>(null);
  const [isPrivateKeyServerConnected, setIsPrivateKeyServerConnected] = useState(false);
  const [activePrivateKeyServerUrl, setActivePrivateKeyServerUrl] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return localStorage.getItem(ACTIVE_PRIVATE_KEY_SERVER_KEY) ?? '';
  });
  const [lastCheckedServer, setLastCheckedServer] = useState<{ url: string; details?: Record<string, unknown> } | null>(null);
  const [isCheckingPrivateKeyServer, setIsCheckingPrivateKeyServer] = useState(false);
  const [privateKeyServerStatus, setPrivateKeyServerStatus] = useState<StatusBanner | null>(null);
  const [isPrivateKeyModalOpen, setIsPrivateKeyModalOpen] = useState(false);
  const [adminStatusInfo, setAdminStatusInfo] = useState<{ exists: boolean } | null>(null);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [adminRegisterData, setAdminRegisterData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [adminLoginData, setAdminLoginData] = useState({
    username: '',
    password: '',
  });
  const [isAdminActionLoading, setIsAdminActionLoading] = useState(false);
  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);

  const organizationContext = useMemo(
    () => ({
      organizationName: user?.organizationName?.trim() ?? '',
      organizationDisplayName:
        user?.organizationDisplayName?.trim() ?? user?.organizationName?.trim() ?? '',
      organizationId: user?.organizationId,
    }),
    [user?.organizationName, user?.organizationDisplayName, user?.organizationId]
  );

  const syncServersState = useCallback((servers: RemotePrivateKeyServer[]) => {
    setSavedPrivateKeyServers(servers);
    const activeServer = servers.find((server) => server.isActive);
    setActivePrivateKeyServerUrl(activeServer?.baseUrl ?? '');
  }, []);

  const refreshAdminStatus = useCallback(
    async (targetUrl: string) => {
      if (!organizationContext.organizationName) {
        setAdminStatusInfo(null);
        setAdminActionMessage('Organization context is missing. Please sign in again.');
        return;
      }
      try {
        setIsAdminActionLoading(true);
        const status = await privateKeyServerClient.getAdminStatus(
          targetUrl,
          organizationContext.organizationName
        );
        setAdminStatusInfo(status.data);
        if (status.data.exists) {
          setAdminActionMessage('Admin account detected. Sign in to continue.');
        } else {
          setAdminActionMessage('No admin account found. Create one to continue.');
        }
      } catch (error) {
        console.error('Failed to fetch admin status:', error);
        setAdminStatusInfo(null);
        setAdminActionMessage(
          error instanceof Error ? error.message : 'Unable to verify admin status.'
        );
      } finally {
        setIsAdminActionLoading(false);
      }
    },
    [organizationContext.organizationName]
  );

  const fetchSavedServers = useCallback(async () => {
    try {
      setIsServersLoading(true);
      setServersError(null);
      const response = await authService.authenticatedRequest<{
        servers: RemotePrivateKeyServer[];
      }>('/api/local-servers');

      if (response.success && response.data?.servers) {
        syncServersState(response.data.servers);
      } else {
        setServersError(response.message || 'Unable to load saved servers.');
      }
    } catch (fetchError) {
      console.error('Failed to fetch saved servers:', fetchError);
      setServersError(
        fetchError instanceof Error ? fetchError.message : 'Unable to load saved servers.'
      );
    } finally {
      setIsServersLoading(false);
    }
  }, [syncServersState]);

  const normalizeServerUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    const hasProtocol = /^https?:\/\//i.test(trimmed);
    const urlWithProtocol = hasProtocol ? trimmed : `http://${trimmed}`;
    return urlWithProtocol.replace(/\/+$/, '');
  };

  const getSessionStorageKey = (url: string) => `safe.localServerSession::${url}`;

  const checkPrivateKeyServerHealth = useCallback(
    async (
      inputUrl?: string,
      options: { silent?: boolean; autoConnect?: boolean } = {}
    ) => {
      const targetUrl = inputUrl ?? privateKeyServerUrl;
      if (!targetUrl.trim()) {
        if (!options.silent) {
          setPrivateKeyServerStatus({
            type: 'error',
            message: 'Please enter a private-key-server address.',
          });
        }
        return false;
      }

      const normalizedUrl = normalizeServerUrl(targetUrl);
      if (!options.silent) {
        setIsCheckingPrivateKeyServer(true);
        setPrivateKeyServerStatus({
          type: 'info',
          message: 'Checking connectivity...',
        });
      }

      try {
        const data = await privateKeyServerClient.getHealth(normalizedUrl);
        setLastCheckedServer({ url: normalizedUrl, details: data });
        setPrivateKeyServerUrl(normalizedUrl);

        if (!options.silent) {
          setPrivateKeyServerStatus({
            type: 'success',
            message: data?.message
              ? `${data.message} (${normalizedUrl})`
              : `Healthy response received from ${normalizedUrl}`,
          });
        }

        await refreshAdminStatus(normalizedUrl);
        return true;
      } catch (checkError) {
        console.error('Private key server check failed:', checkError);
        setLastCheckedServer(null);
        setAdminStatusInfo(null);
        if (!options.silent) {
          const message =
            checkError instanceof DOMException && checkError.name === 'AbortError'
              ? 'Connection timed out while waiting for the private-key-server.'
              : checkError instanceof Error
                ? checkError.message
                : 'Unable to reach the private-key-server.';
          setPrivateKeyServerStatus({
            type: 'error',
            message,
          });
        }

        return false;
      } finally {
        if (!options.silent) {
          setIsCheckingPrivateKeyServer(false);
        }
      }
    },
    [privateKeyServerUrl, refreshAdminStatus]
  );

  const handleCheckPrivateKeyServer = () => {
    void checkPrivateKeyServerHealth();
  };

  const handleAdminRegister = async () => {
    if (!privateKeyServerUrl) {
      setAdminActionMessage('Enter a server URL before creating an admin.');
      return;
    }
    if (!organizationContext.organizationName) {
      setAdminActionMessage('Your organization context is missing. Please refresh and sign in again.');
      return;
    }

    if (!adminRegisterData.password || adminRegisterData.password !== adminRegisterData.confirmPassword) {
      setAdminActionMessage('Passwords must match before continuing.');
      return;
    }

    const normalizedUrl = normalizeServerUrl(privateKeyServerUrl);

    try {
      setIsAdminActionLoading(true);
      const response = await privateKeyServerClient.registerAdmin(
        normalizedUrl,
        adminRegisterData,
        organizationContext
      );
      setAdminSession({
        baseUrl: normalizedUrl,
        token: response.data.token,
        admin: response.data.admin,
      });
      setAdminRegisterData({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
      setAdminStatusInfo({ exists: true });
      setAdminActionMessage(`Admin account created for ${response.data.admin.username}.`);
      setPrivateKeyServerStatus({
        type: 'success',
        message: `Securely connected to ${normalizedUrl}.`,
      });
    } catch (error) {
      setAdminActionMessage(
        error instanceof Error ? error.message : 'Failed to create admin account.'
      );
    } finally {
      setIsAdminActionLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!privateKeyServerUrl) {
      setAdminActionMessage('Enter a server URL before connecting.');
      return;
    }
    if (!organizationContext.organizationName) {
      setAdminActionMessage('Your organization context is missing. Please refresh and sign in again.');
      return;
    }
    if (!adminLoginData.username || !adminLoginData.password) {
      setAdminActionMessage('Username and password are required.');
      return;
    }

    const normalizedUrl = normalizeServerUrl(privateKeyServerUrl);

    try {
      setIsAdminActionLoading(true);
      const response = await privateKeyServerClient.loginAdmin(
        normalizedUrl,
        adminLoginData,
        organizationContext
      );
      setAdminSession({
        baseUrl: normalizedUrl,
        token: response.data.token,
        admin: response.data.admin,
      });
      setAdminLoginData({
        username: '',
        password: '',
      });
      setAdminActionMessage(`Connected as ${response.data.admin.username}.`);
      setPrivateKeyServerStatus({
        type: 'success',
        message: `Authenticated with ${normalizedUrl}.`,
      });
    } catch (error) {
      setAdminActionMessage(
        error instanceof Error ? error.message : 'Failed to authenticate with the server.'
      );
    } finally {
      setIsAdminActionLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    if (!adminSession) {
      return;
    }
    try {
      await privateKeyServerClient.logoutAdmin(adminSession.baseUrl, adminSession.token);
    } catch (error) {
      console.warn('Failed to notify server about logout:', error);
    } finally {
      setAdminSession(null);
      setAdminActionMessage('Disconnected from private-key-server.');
      setPrivateKeyServerStatus({
        type: 'info',
        message: 'Disconnected from private-key-server.',
      });
    }
  };

  const handleAddPrivateKeyServer = async () => {
    if (!lastCheckedServer) {
      setPrivateKeyServerStatus({
        type: 'error',
        message: 'Check connectivity before adding the server.',
      });
      return;
    }

    try {
      setPrivateKeyServerStatus({
        type: 'info',
        message: 'Saving server to organization list...',
      });

      const response = await authService.authenticatedRequest<{
        servers: RemotePrivateKeyServer[];
      }>('/api/local-servers', {
        method: 'POST',
        body: JSON.stringify({ baseUrl: lastCheckedServer.url }),
      });

      if (response.success && response.data?.servers) {
        syncServersState(response.data.servers);
        setPrivateKeyServerStatus({
          type: 'success',
          message: `${lastCheckedServer.url} saved and set as active.`,
        });
      } else {
        setPrivateKeyServerStatus({
          type: 'error',
          message: response.message || 'Failed to save server. Please try again.',
        });
      }
    } catch (saveError) {
      console.error('Failed to save private-key-server:', saveError);
      setPrivateKeyServerStatus({
        type: 'error',
        message:
          saveError instanceof Error
            ? saveError.message
            : 'Unable to save server. Please try again.',
      });
    }
  };

  const handleUseSavedServer = (server: RemotePrivateKeyServer) => {
    setPrivateKeyServerUrl(server.baseUrl);
    setLastCheckedServer(null);
    setAdminSession(null);
    setAdminStatusInfo(null);
    setAdminActionMessage(null);
    setPrivateKeyServerStatus({
      type: 'info',
      message: 'Server address loaded. Run a connectivity check to continue.',
    });
  };

  const handleMarkActiveServer = async (server: RemotePrivateKeyServer) => {
    if (server.isActive) {
      return;
    }

    try {
      setPrivateKeyServerStatus({
        type: 'info',
        message: 'Updating active server...',
      });

      const response = await authService.authenticatedRequest<{
        servers: RemotePrivateKeyServer[];
      }>(`/api/local-servers/${server.id}/activate`, {
        method: 'PATCH',
      });

      if (response.success && response.data?.servers) {
        syncServersState(response.data.servers);
        
        // Configure organization on private-key-server with JWT_SECRET
        if (adminSession && adminSession.token && user) {
          try {
            // Get JWT_SECRET from main server environment (via API endpoint)
            const jwtSecretResponse = await authService.authenticatedRequest<{
              jwtSecret: string;
            }>('/api/local-servers/jwt-secret');
            
            if (jwtSecretResponse.success && jwtSecretResponse.data?.jwtSecret) {
              await privateKeyServerClient.configureOrganization(
                server.baseUrl,
                adminSession.token,
                {
                  organizationName: user.organizationName || '',
                  organizationDisplayName: user.organizationDisplayName || user.organizationName || '',
                  organizationId: user.organizationId || '',
                  jwtSecret: jwtSecretResponse.data.jwtSecret,
                  mainServerUrl: window.location.origin,
                }
              );
            }
          } catch (configError) {
            console.warn('Failed to configure organization on private-key-server:', configError);
            // Don't fail the activation if config fails - admin can configure manually
          }
        }
        
        setPrivateKeyServerStatus({
          type: 'success',
          message: `${server.baseUrl} marked as the active private-key-server.`,
        });
      } else {
        setPrivateKeyServerStatus({
          type: 'error',
          message: response.message || 'Failed to update active server.',
        });
      }
    } catch (error) {
      console.error('Failed to update active server:', error);
      setPrivateKeyServerStatus({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Unable to update active server.',
      });
    }
  };

  const openPrivateKeyModal = () => {
    setIsPrivateKeyModalOpen(true);
    void fetchSavedServers();
  };

  const closePrivateKeyModal = () => {
    if (!isCheckingPrivateKeyServer) {
      setIsPrivateKeyModalOpen(false);
    }
  };

  const canManageDepartments = isPrivateKeyServerConnected;
  const canAttemptConnection = Boolean(lastCheckedServer) && !isCheckingPrivateKeyServer;

  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      navigate('/signin');
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      // Check if user is Admin
      if (currentUser.role !== 'Admin') {
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }
      setUser(currentUser);
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PRIVATE_KEY_SERVER_URL_KEY, privateKeyServerUrl);
    }
  }, [privateKeyServerUrl]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_PRIVATE_KEY_SERVER_KEY, activePrivateKeyServerUrl);
    }
  }, [activePrivateKeyServerUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (adminSession) {
      sessionStorage.setItem(
        getSessionStorageKey(adminSession.baseUrl),
        JSON.stringify(adminSession)
      );
    } else if (privateKeyServerUrl) {
      sessionStorage.removeItem(getSessionStorageKey(privateKeyServerUrl));
    }
  }, [adminSession, privateKeyServerUrl]);

  useEffect(() => {
    if (typeof window === 'undefined' || !privateKeyServerUrl) {
      return;
    }

    const stored = sessionStorage.getItem(getSessionStorageKey(privateKeyServerUrl));
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AdminSession;
        setAdminSession(parsed);
      } catch {
        sessionStorage.removeItem(getSessionStorageKey(privateKeyServerUrl));
      }
    } else {
      setAdminSession(null);
    }
  }, [privateKeyServerUrl]);

  useEffect(() => {
    if (!isPrivateKeyServerConnected && isDepartmentModalOpen) {
      setIsDepartmentModalOpen(false);
    }
  }, [isPrivateKeyServerConnected, isDepartmentModalOpen]);

  useEffect(() => {
    setIsPrivateKeyServerConnected(Boolean(adminSession));
  }, [adminSession]);

  const handleCreateBlockchain = () => {
    navigate('/create-blockchain');
  };

  const handleJoinBlockchain = () => {
    navigate('/join-blockchain');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      navigate('/');
    }
  };

  const handleDepartmentMenu = () => {
    if (!canManageDepartments) {
      setPrivateKeyServerStatus({
        type: 'error',
        message: 'Connect to your private-key-server before managing departments.',
      });
      return;
    }
    setDepartmentStatus(null);
    setDepartmentName('');
    setIsDepartmentModalOpen(true);
  };

  const handleAccessMenu = () => {
    setAccessStatus(null);
    setAccessSearchTerm('');
    setEmployeeResults([]);
    setSelectedEmployeeId('');
    setSelectedDepartmentId('');
    setIsAccessModalOpen(true);
  };

  const handleDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentName.trim()) {
      setDepartmentStatus({ type: 'error', message: 'Department name is required.' });
      return;
    }
    if (!adminSession) {
      setDepartmentStatus({
        type: 'error',
        message: 'Connect to your private-key-server as an admin before creating departments.',
      });
      return;
    }

    setIsDepartmentSubmitting(true);
    setDepartmentStatus(null);

    let departmentResult: Awaited<
      ReturnType<typeof privateKeyServerClient.createDepartment>
    > | null = null;

    try {
      const normalizedDepartment = departmentName.trim();

      if (!organizationContext.organizationName) {
        throw new Error('Organization context missing. Please refresh and try again.');
      }

      departmentResult = await privateKeyServerClient.createDepartment(
        adminSession.baseUrl,
        adminSession.token,
        {
          departmentName: normalizedDepartment,
          organizationName: organizationContext.organizationName,
          organizationId: organizationContext.organizationId,
        }
      );

      await authService.authenticatedRequest('/org/departments', {
        method: 'POST',
        body: JSON.stringify({
          departmentName: normalizedDepartment,
          publicKeyPem: departmentResult.data.publicKeyPem,
          keyType: departmentResult.data.keyType,
          keySize: departmentResult.data.keySize,
          fingerprint: departmentResult.data.fingerprint,
        }),
      });

      setDepartmentStatus({
        type: 'success',
        message: `Department "${normalizedDepartment}" created and keys synced.`,
      });
      setDepartmentName('');
    } catch (submitError) {
      console.error('Department creation failed:', submitError);

      if (departmentResult) {
        try {
          await privateKeyServerClient.deleteDepartment(
            adminSession.baseUrl,
            adminSession.token,
            {
              organizationName: organizationContext.organizationName,
              departmentName: departmentName.trim(),
            }
          );
        } catch (rollbackError) {
          console.error('Failed to rollback department on private-key-server:', rollbackError);
        }
      }

      setDepartmentStatus({
        type: 'error',
        message:
          submitError instanceof Error
            ? submitError.message
            : 'Failed to create department. Please try again.',
      });
    } finally {
      setIsDepartmentSubmitting(false);
    }
  };

  const closeDepartmentModal = () => {
    setIsDepartmentModalOpen(false);
    setDepartmentStatus(null);
    setDepartmentName('');
  };

  const handleAccessSearch = async () => {
    if (!accessSearchTerm.trim()) {
      setAccessStatus({ type: 'error', message: 'Please enter a name or email to search.' });
      return;
    }

    setIsAccessSearching(true);
    setAccessStatus(null);
    setEmployeeResults([]);
    setSelectedEmployeeId('');
    setSelectedDepartmentId('');

    try {
      // TODO: Replace with real API call to search organization employees
      await new Promise((resolve) => setTimeout(resolve, 900));
      const normalizedQuery = accessSearchTerm.trim();

      const mockEmployees = [
        {
          id: `${normalizedQuery}-emp-1`,
          name: 'Ava Martinez',
          title: 'Security Analyst',
          email: 'ava.martinez@example.com',
        },
        {
          id: `${normalizedQuery}-emp-2`,
          name: 'Noah Patel',
          title: 'DevOps Engineer',
          email: 'noah.patel@example.com',
        },
      ];

      const mockDepartments = [
        { id: 'dept-1', name: 'Security Operations' },
        { id: 'dept-2', name: 'Core Infrastructure' },
        { id: 'dept-3', name: 'Compliance' },
      ];

      setEmployeeResults(mockEmployees);
      setDepartmentOptions(mockDepartments);
      setAccessStatus({
        type: 'success',
        message: `${mockEmployees.length} employee${mockEmployees.length > 1 ? 's' : ''} found within the organization.`,
      });
    } catch (searchError) {
      console.error('Employee search failed:', searchError);
      setAccessStatus({
        type: 'error',
        message: 'Unable to search employees. Please try again.',
      });
    } finally {
      setIsAccessSearching(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !selectedDepartmentId) {
      setAccessStatus({ type: 'error', message: 'Please select both an employee and a department.' });
      return;
    }

    setIsGrantingAccess(true);
    setAccessStatus(null);

    try {
      // TODO: Replace with real API call to grant temporary access
      await new Promise((resolve) => setTimeout(resolve, 900));

      const employee = employeeResults.find((emp) => emp.id === selectedEmployeeId);
      const department = departmentOptions.find((dept) => dept.id === selectedDepartmentId);

      setAccessStatus({
        type: 'success',
        message: `${employee?.name} has temporary access to ${department?.name}.`,
      });
    } catch (grantError) {
      console.error('Grant access failed:', grantError);
      setAccessStatus({
        type: 'error',
        message: 'Unable to grant access. Please try again.',
      });
    } finally {
      setIsGrantingAccess(false);
    }
  };

  const closeAccessModal = () => {
    setIsAccessModalOpen(false);
    setAccessStatus(null);
    setAccessSearchTerm('');
    setEmployeeResults([]);
    setSelectedEmployeeId('');
    setSelectedDepartmentId('');
  };

  if (loading) {
    return (
      <div className="admin-homepage-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-homepage-container">
        <div className="error-message">
          <h2>Access Denied</h2>
          <p>{error}</p>
          <button onClick={handleLogout} className="retry-button">
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-homepage-container">
      {/* Header */}
      <header className="admin-homepage-header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <p className="organization-name">{user?.organizationName}</p>
          <p className="user-name">Welcome, {user?.firstName} {user?.lastName}</p>
        </div>
        <div className="header-actions">
          <button
            onClick={openPrivateKeyModal}
            className="menu-button key-server-button"
            title={isPrivateKeyServerConnected ? 'Connected to private-key-server' : 'Not connected to private-key-server'}
          >
            <span
              className={`status-dot ${isPrivateKeyServerConnected ? 'connected' : 'disconnected'}`}
              aria-hidden="true"
            ></span>
            <span>Key Server</span>
          </button>
          <button onClick={handleAccessMenu} className="menu-button access-button">
            <span className="menu-icon" aria-hidden="true">🗝️</span>
            <span>Access</span>
          </button>
          <button
            onClick={handleDepartmentMenu}
            className="menu-button"
            disabled={!canManageDepartments}
            title={!canManageDepartments ? 'Connect your private-key-server to enable department creation.' : undefined}
          >
            <span className="menu-icon" aria-hidden="true">🏢</span>
            <span>Departments</span>
          </button>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-homepage-main">
        <div className="blockchain-section">
          <div className="welcome-message">
            <h2>Blockchain Management</h2>
            <p className="section-description">
              Create a new blockchain network or join an existing one to start collaborating and sharing files securely.
            </p>
          </div>
          
          <div className="blockchain-actions">
            <button 
              onClick={handleCreateBlockchain}
              className="blockchain-button create-button"
            >
              <div className="button-icon">🔗</div>
              <div className="button-content">
                <h3>Create Blockchain</h3>
                <p>Create a new blockchain network for your organization</p>
              </div>
              <div className="button-arrow">→</div>
            </button>

            <button 
              onClick={handleJoinBlockchain}
              className="blockchain-button join-button"
            >
              <div className="button-icon">➕</div>
              <div className="button-content">
                <h3>Join Blockchain</h3>
                <p>Join an existing blockchain network using an invitation code</p>
              </div>
              <div className="button-arrow">→</div>
            </button>
          </div>
        </div>
      </main>

      {isPrivateKeyModalOpen && (
        <div className="private-key-modal-overlay" role="dialog" aria-modal="true">
          <div className="private-key-modal">
            <div className="private-key-modal-header">
              <button
                type="button"
                className="modal-back-button"
                onClick={closePrivateKeyModal}
                aria-label="Close private key modal"
                title="Back to dashboard"
              >
                <span aria-hidden="true">←</span>
              </button>
              <div className="private-key-heading">
                <p className="private-key-eyebrow">Private-key-server</p>
                <h2>Secure Key Bridge</h2>
                <p className="private-key-subtitle">
                  Link your admin console to the local private-key-server to unlock sensitive actions.
                </p>
              </div>
              <div
                className={`status-pill ${
                  isPrivateKeyServerConnected
                    ? 'connected'
                    : isCheckingPrivateKeyServer
                      ? 'checking'
                      : 'disconnected'
                }`}
              >
                <span className="status-indicator" aria-hidden="true"></span>
                {isPrivateKeyServerConnected ? 'Connected' : isCheckingPrivateKeyServer ? 'Checking...' : 'Disconnected'}
              </div>
            </div>

            <div className="private-key-grid">
              <div className="private-key-panel">
                <div className="panel-header">
                  <h3>Connection details</h3>
                  <p>Use your local tunnel or LAN address.</p>
                </div>

                <label htmlFor="privateKeyServerUrl">Server URL *</label>
                <div className="connection-input-row">
                  <input
                    id="privateKeyServerUrl"
                    className="connection-input"
                    type="text"
                    placeholder="e.g. http://localhost:8001"
                    value={privateKeyServerUrl}
                    onChange={(e) => setPrivateKeyServerUrl(e.target.value)}
                    disabled={isCheckingPrivateKeyServer}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="connection-button"
                    onClick={handleCheckPrivateKeyServer}
                    disabled={isCheckingPrivateKeyServer || !privateKeyServerUrl.trim()}
                  >
                    {isCheckingPrivateKeyServer ? 'Checking...' : 'Check'}
                  </button>
                </div>

                {privateKeyServerStatus && (
                  <div className={`connection-status ${privateKeyServerStatus.type}`}>
                    {privateKeyServerStatus.message}
                  </div>
                )}

                <div className="connection-actions">
                  {adminSession ? (
                    <>
                      <button
                        type="button"
                        className="disconnect-button"
                        onClick={handleAdminLogout}
                        disabled={isAdminActionLoading}
                      >
                        Disconnect
                      </button>
                      <button
                        type="button"
                        className="connection-secondary-button"
                        onClick={handleAddPrivateKeyServer}
                        disabled={!canAttemptConnection}
                      >
                        Add to list
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="connection-secondary-button"
                      onClick={handleAddPrivateKeyServer}
                      disabled={!canAttemptConnection}
                    >
                      Add to list
                    </button>
                  )}
                </div>

                {adminActionMessage && (
                  <p className="admin-action-message">{adminActionMessage}</p>
                )}

                {!adminStatusInfo && (
                  <p className="muted-text">
                    Run a connectivity check to verify administrator status.
                  </p>
                )}

                {adminStatusInfo?.exists === false && (
                  <form
                    className="admin-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleAdminRegister();
                    }}
                  >
                    <div className="admin-form-grid">
                      <input
                        type="text"
                        placeholder="First name"
                        value={adminRegisterData.firstName}
                        onChange={(e) =>
                          setAdminRegisterData((prev) => ({ ...prev, firstName: e.target.value }))
                        }
                        required
                        disabled={isAdminActionLoading}
                      />
                      <input
                        type="text"
                        placeholder="Last name"
                        value={adminRegisterData.lastName}
                        onChange={(e) =>
                          setAdminRegisterData((prev) => ({ ...prev, lastName: e.target.value }))
                        }
                        required
                        disabled={isAdminActionLoading}
                      />
                      <input
                        type="text"
                        placeholder="Username"
                        value={adminRegisterData.username}
                        onChange={(e) =>
                          setAdminRegisterData((prev) => ({ ...prev, username: e.target.value }))
                        }
                        required
                        disabled={isAdminActionLoading}
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={adminRegisterData.email}
                        onChange={(e) =>
                          setAdminRegisterData((prev) => ({ ...prev, email: e.target.value }))
                        }
                        required
                        disabled={isAdminActionLoading}
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={adminRegisterData.password}
                        onChange={(e) =>
                          setAdminRegisterData((prev) => ({ ...prev, password: e.target.value }))
                        }
                        required
                        disabled={isAdminActionLoading}
                      />
                      <input
                        type="password"
                        placeholder="Confirm password"
                        value={adminRegisterData.confirmPassword}
                        onChange={(e) =>
                          setAdminRegisterData((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                        required
                        disabled={isAdminActionLoading}
                      />
                    </div>
                    <button
                      type="submit"
                      className="submit-button"
                      disabled={isAdminActionLoading}
                    >
                      {isAdminActionLoading ? 'Creating...' : 'Create admin account'}
                    </button>
                  </form>
                )}

                {adminStatusInfo?.exists && !adminSession && (
                  <form
                    className="admin-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleAdminLogin();
                    }}
                  >
                    <div className="admin-form-grid">
                      <input
                        type="text"
                        placeholder="Admin username"
                        value={adminLoginData.username}
                        onChange={(e) =>
                          setAdminLoginData((prev) => ({ ...prev, username: e.target.value }))
                        }
                        required
                        disabled={isAdminActionLoading}
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={adminLoginData.password}
                        onChange={(e) =>
                          setAdminLoginData((prev) => ({ ...prev, password: e.target.value }))
                        }
                        required
                        disabled={isAdminActionLoading}
                      />
                    </div>
                    <button
                      type="submit"
                      className="connection-button"
                      disabled={isAdminActionLoading}
                    >
                      {isAdminActionLoading ? 'Connecting...' : 'Connect'}
                    </button>
                  </form>
                )}

                {adminSession && (
                  <div className="admin-session-banner">
                    <div>
                      <p>
                        Connected as <strong>{adminSession.admin.username}</strong>
                      </p>
                      <span>{adminSession.admin.email}</span>
                    </div>
                    <button
                      type="button"
                      className="use-server-button"
                      onClick={handleAdminLogout}
                      disabled={isAdminActionLoading}
                    >
                      Disconnect
                    </button>
                  </div>
                )}

                {!isPrivateKeyServerConnected && (
                  <div className="private-key-note">
                    <strong>Heads up:</strong> Departments remain locked until a secure connection is active.
                  </div>
                )}
              </div>

              <div className="private-key-panel">
                <div className="panel-header">
                  <h3>Saved servers</h3>
                  <p>Reuse known-good endpoints for faster onboarding.</p>
                </div>

                {isServersLoading ? (
                  <div className="empty-state">
                    <p>Loading saved servers...</p>
                  </div>
                ) : serversError ? (
                  <div className="empty-state error">
                    <p>{serversError}</p>
                    <span>Try refreshing or adding a new server.</span>
                  </div>
                ) : savedPrivateKeyServers.length === 0 ? (
                  <div className="empty-state">
                    <p>No saved servers yet.</p>
                    <span>Add one after a successful connectivity check.</span>
                  </div>
                ) : (
                  <ul className="saved-server-list modern">
                    {savedPrivateKeyServers.map((server) => (
                      <li className="saved-server-item modern" key={server.id}>
                        <div>
                          <p className="saved-server-url">{server.baseUrl}</p>
                          <p className="saved-server-meta">
                            Added on {new Date(server.addedAt).toLocaleString()}
                            {server.addedByName ? ` · ${server.addedByName}` : ''}
                          </p>
                          {server.isActive && (
                            <span className="active-server-chip">Active server</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="use-server-button"
                          onClick={() => handleUseSavedServer(server)}
                        >
                          Use
                        </button>
                        <button
                          type="button"
                          className="activate-server-button"
                          onClick={() => handleMarkActiveServer(server)}
                          disabled={server.isActive}
                        >
                          {server.isActive ? 'Active' : 'Set Active'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {activePrivateKeyServerUrl && !isServersLoading && (
                  <p className="active-server-note">
                    Active server:{' '}
                    <span className="active-server-highlight">{activePrivateKeyServerUrl}</span>.
                    This endpoint will be used to distribute keys to employees once backend support is enabled.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isDepartmentModalOpen && (
        <div className="department-modal-overlay" role="dialog" aria-modal="true">
          <div className="department-modal">
            <div className="department-modal-header">
              <div className="department-modal-icon">🏢</div>
              <div>
                <h3>Create Department</h3>
                <p>Add a new department to your organization</p>
              </div>
              <button className="modal-close-button" onClick={closeDepartmentModal} aria-label="Close department modal">
                ×
              </button>
            </div>
            <form className="department-form" onSubmit={handleDepartmentSubmit}>
              <label htmlFor="departmentName">Department Name *</label>
              <input
                id="departmentName"
                type="text"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                placeholder="Enter department name"
                disabled={isDepartmentSubmitting || !canManageDepartments}
                className="department-input"
                autoFocus
              />
              {departmentStatus && (
                <div className={`department-status ${departmentStatus.type}`}>
                  {departmentStatus.message}
                </div>
              )}
              <div className="department-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeDepartmentModal}
                  disabled={isDepartmentSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={isDepartmentSubmitting || !canManageDepartments}
                >
                  {isDepartmentSubmitting ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAccessModalOpen && (
        <div className="access-modal-overlay" role="dialog" aria-modal="true">
          <div className="access-modal">
            <div className="access-modal-header">
              <div className="access-modal-icon">🗝️</div>
              <div>
                <h3>Temporary Department Access</h3>
                <p>Search an employee and grant limited-time access</p>
              </div>
              <button
                className="modal-close-button"
                onClick={closeAccessModal}
                aria-label="Close access modal"
              >
                ×
              </button>
            </div>

            <div className="access-search">
              <label htmlFor="accessSearch">Employee Name or Email</label>
              <div className="search-input-container">
                <input
                  id="accessSearch"
                  type="text"
                  value={accessSearchTerm}
                  onChange={(e) => setAccessSearchTerm(e.target.value)}
                  placeholder="Search employees within your organization"
                  disabled={isAccessSearching || isGrantingAccess}
                  className="department-input-field"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isAccessSearching && accessSearchTerm.trim()) {
                      e.preventDefault();
                      handleAccessSearch();
                    }
                  }}
                />
                <button
                  type="button"
                  className="search-icon-button"
                  onClick={handleAccessSearch}
                  disabled={isAccessSearching || !accessSearchTerm.trim()}
                  aria-label="Search for employee"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </div>
            </div>

            {accessStatus && (
              <div className={`department-status ${accessStatus.type}`}>
                {accessStatus.message}
              </div>
            )}

            <div className="access-content">
              <div className="access-column">
                <h4>Employees</h4>
                {isAccessSearching && <p className="muted-text">Searching employees...</p>}
                {!isAccessSearching && employeeResults.length === 0 && (
                  <p className="muted-text">
                    Search for employees to view available results.
                  </p>
                )}
                <div className="employee-results">
                  {employeeResults.map((employee) => (
                    <label
                      key={employee.id}
                      className={`employee-card ${
                        selectedEmployeeId === employee.id ? 'selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="employee"
                        value={employee.id}
                        checked={selectedEmployeeId === employee.id}
                        onChange={() => setSelectedEmployeeId(employee.id)}
                        disabled={isGrantingAccess}
                      />
                      <div>
                        <p className="employee-name">{employee.name}</p>
                        <p className="employee-meta">{employee.title}</p>
                        <p className="employee-email">{employee.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="access-column">
                <h4>Departments</h4>
                {employeeResults.length === 0 ? (
                  <p className="muted-text">Search for an employee to view departments.</p>
                ) : (
                  <form className="grant-access-form" onSubmit={handleGrantAccess}>
                    <div className="select-wrapper">
                      <select
                        id="departmentSelect"
                        className="channel-select"
                        value={selectedDepartmentId}
                        onChange={(e) => setSelectedDepartmentId(e.target.value)}
                        disabled={isGrantingAccess || departmentOptions.length === 0}
                        required
                        aria-label="Department"
                      >
                        <option value="">Select department</option>
                        {departmentOptions.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label htmlFor="accessDuration">Access Duration (Hours)</label>
                    <input
                      id="accessDuration"
                      type="number"
                      min={1}
                      max={72}
                      defaultValue={24}
                      className="department-input"
                      disabled={isGrantingAccess}
                    />

                    <button
                      type="submit"
                      className="submit-button full-width"
                      disabled={isGrantingAccess}
                    >
                      {isGrantingAccess ? 'Granting...' : 'Grant Temporary Access'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

