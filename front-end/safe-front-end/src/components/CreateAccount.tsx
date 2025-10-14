import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './CreateAccount.css';
import { AccountCreatedSuccess } from './AccountCreatedSuccess';
import { authService } from '../services/authService';
import { cryptoService } from '../services/cryptoService';

interface CreateAccountProps {
  onAccountCreated?: (accountData: { organizationName: string; username: string; password: string }) => void;
  onSignIn?: () => void;
}

export const CreateAccount: React.FC<CreateAccountProps> = ({ 
  onAccountCreated
}) => {
  
  const [formData, setFormData] = useState({
    // Basic Authentication
    organizationName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    
    // Personal Information
    firstName: '',
    lastName: '',
    phone: '',
    jobTitle: '',
    department: '',
    
    // Role and Preferences
    role: 'Employee',
    bio: '',
    timezone: 'UTC',
    language: 'en',
    
    // Contact Preferences
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [keyGenerationStatus, setKeyGenerationStatus] = useState('');

  // Password validation function
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return errors;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }

    // Validate password in real-time
    if (name === 'password') {
      const errors = validatePassword(value);
      setPasswordErrors(errors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Frontend validation
      const errors = [];
      
      // Basic validation
      if (!formData.username.trim()) errors.push('Username is required');
      if (!formData.email.trim()) errors.push('Email is required');
      if (!formData.firstName.trim()) errors.push('First name is required');
      if (!formData.lastName.trim()) errors.push('Last name is required');
      if (!formData.phone.trim()) errors.push('Phone number is required');
      if (!formData.jobTitle.trim()) errors.push('Job title is required');
      if (!formData.department.trim()) errors.push('Department is required');
      if (!formData.organizationName.trim()) errors.push('Organization name is required');
      
      // Password validation
      const passwordValidationErrors = validatePassword(formData.password);
      if (passwordValidationErrors.length > 0) {
        errors.push('Password does not meet requirements');
      }
      
      // Password confirmation
      if (formData.password !== formData.confirmPassword) {
        errors.push('Password confirmation does not match');
      }
      
      if (errors.length > 0) {
        setError(errors.join('. '));
        setIsLoading(false);
        return;
      }

      // Step 1: Generate RSA key pair (but don't store private key yet)
      setIsGeneratingKeys(true);
      setKeyGenerationStatus('🔑 Generating secure RSA key pair...');
      
      try {
        // Generate keys but don't store private key yet
        const keyPair = await cryptoService.generateKeyPair();
        const publicKeyPem = await cryptoService.exportPublicKeyAsPem(keyPair.publicKey);

        setKeyGenerationStatus('✅ Keys generated successfully!');
        
        // Step 2: Register user account first
        setKeyGenerationStatus('📝 Creating user account...');
        
        const data = await authService.register({
          // Basic Authentication
          username: formData.username,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          email: formData.email,
          
          // Personal Information
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          jobTitle: formData.jobTitle,
          department: formData.department,
          
          // Role and Organization
          role: formData.role,
          organizationName: formData.organizationName,
          
          // Contact Preferences
          emailNotifications: formData.emailNotifications,
          smsNotifications: formData.smsNotifications,
          marketingEmails: formData.marketingEmails,
          
          // Optional fields
          bio: formData.bio,
          timezone: formData.timezone,
          language: formData.language
        });
        
        if (!data.success) {
          throw new Error(data.message || 'User registration failed');
        }

        setKeyGenerationStatus('🔐 Uploading public key to server...');
        
        // Step 3: Upload public key to backend
        const keyUploadResult = await authService.uploadPublicKey(
          publicKeyPem,
          formData.organizationName
        );

        if (!keyUploadResult.success) {
          // If key upload fails, we should ideally rollback user creation
          // For now, we'll just show an error
          throw new Error(`Public key upload failed: ${keyUploadResult.message}. User account was created but key management is not available.`);
        }

        setKeyGenerationStatus('💾 Storing private key securely...');
        
        // Step 4: Only now store the private key since public key upload succeeded
        await cryptoService.storeEncryptedPrivateKey(
          keyPair.privateKey,
          formData.password,
          formData.organizationName,
          data.data.userId
        );

        setKeyGenerationStatus('✅ Registration completed successfully!');
        
        if (onAccountCreated) {
          onAccountCreated(formData);
        }
        setShowSuccess(true);

      } catch (keyError) {
        console.error('Registration process failed:', keyError);
        setError(`Registration failed: ${keyError instanceof Error ? keyError.message : 'Unknown error'}`);
        
        // If user was created but key operations failed, show warning
        if (keyError instanceof Error && keyError.message.includes('User account was created')) {
          setError(`Registration completed with warnings: ${keyError.message}`);
          setShowSuccess(true); // Still show success since user was created
        }
      } finally {
        setIsGeneratingKeys(false);
        setKeyGenerationStatus('');
      }
    } catch (err) {
      console.error('Account creation failed:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return <AccountCreatedSuccess />;
  }

  return (
    <div className="create-account-container">
      <div className="create-account-card">
        {/* Home Navigation */}
        <div className="create-account-nav">
          <Link to="/" className="create-account-home">
            🏠 Landing
          </Link>
        </div>
        
        <h1 className="create-account-title">Create Account</h1>
        <p className="create-account-subtitle">Complete your profile to get started</p>
        
        <form onSubmit={handleSubmit} className="create-account-form">
          {/* Basic Authentication Section */}
          <div className="form-section">
            <h3 className="section-title">Authentication</h3>
            
            <div className="create-account-field">
              <label htmlFor="organizationName" className="create-account-label">
                Organization Name *
              </label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                value={formData.organizationName}
                onChange={handleInputChange}
                placeholder="Enter your organization name"
                className="create-account-input"
                required
              />
              <p className="create-account-helper">
                Enter the organization name you want to join
              </p>
            </div>

            <div className="create-account-field">
              <label htmlFor="username" className="create-account-label">
                Username *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Choose a username"
                className="create-account-input"
                required
              />
            </div>

            <div className="create-account-field">
              <label htmlFor="email" className="create-account-label">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                className="create-account-input"
                required
              />
            </div>

            <div className="create-account-field">
              <label htmlFor="password" className="create-account-label">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                onFocus={() => setShowPasswordRequirements(true)}
                onBlur={() => setShowPasswordRequirements(false)}
                placeholder="Create a password"
                className={`create-account-input ${passwordErrors.length > 0 ? 'error' : ''}`}
                required
              />
            </div>

            <div className="create-account-field">
              <label htmlFor="confirmPassword" className="create-account-label">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                className={`create-account-input ${formData.password !== formData.confirmPassword && formData.confirmPassword ? 'error' : ''}`}
                required
              />
            </div>
            
            {/* Password Requirements */}
            {(showPasswordRequirements || passwordErrors.length > 0) && (
              <div className="password-requirements">
                <p className="requirements-title">Password Requirements:</p>
                <ul className="requirements-list">
                  <li className={formData.password.length >= 8 ? 'valid' : 'invalid'}>
                    ✓ At least 8 characters long
                  </li>
                  <li className={/[A-Z]/.test(formData.password) ? 'valid' : 'invalid'}>
                    ✓ At least one uppercase letter (A-Z)
                  </li>
                  <li className={/[a-z]/.test(formData.password) ? 'valid' : 'invalid'}>
                    ✓ At least one lowercase letter (a-z)
                  </li>
                  <li className={/\d/.test(formData.password) ? 'valid' : 'invalid'}>
                    ✓ At least one number (0-9)
                  </li>
                  <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'valid' : 'invalid'}>
                    ✓ At least one special character (!@#$%^&*...)
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Personal Information Section */}
          <div className="form-section">
            <h3 className="section-title">Personal Information</h3>
            
            <div className="name-row">
              <div className="create-account-field">
                <label htmlFor="firstName" className="create-account-label">
                  First Name *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  className="create-account-input"
                  required
                />
              </div>

              <div className="create-account-field">
                <label htmlFor="lastName" className="create-account-label">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  className="create-account-input"
                  required
                />
              </div>
            </div>

            <div className="create-account-field">
              <label htmlFor="phone" className="create-account-label">
                Phone Number *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+1 (555) 123-4567"
                className="create-account-input"
                required
              />
            </div>

            <div className="job-row">
              <div className="create-account-field">
                <label htmlFor="jobTitle" className="create-account-label">
                  Job Title *
                </label>
                <input
                  id="jobTitle"
                  name="jobTitle"
                  type="text"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  placeholder="Software Engineer"
                  className="create-account-input"
                  required
                />
              </div>

              <div className="create-account-field">
                <label htmlFor="department" className="create-account-label">
                  Department *
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  value={formData.department}
                  onChange={handleInputChange}
                  placeholder="Engineering"
                  className="create-account-input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Role and Preferences Section */}
          <div className="form-section">
            <h3 className="section-title">Role & Preferences</h3>
            
            <div className="create-account-field">
              <label htmlFor="role" className="create-account-label">
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="create-account-input"
                required
              >
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
                <option value="Guest">Guest</option>
              </select>
            </div>

            <div className="create-account-field">
              <label htmlFor="bio" className="create-account-label">
                Bio (Optional)
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself..."
                className="create-account-input"
                rows={3}
              />
            </div>
          </div>

          {/* Contact Preferences Section */}
          <div className="form-section">
            <h3 className="section-title">Contact Preferences</h3>
            
            <div className="preferences-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="emailNotifications"
                  checked={formData.emailNotifications}
                  onChange={handleInputChange}
                />
                <span className="checkbox-text">Email Notifications</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="smsNotifications"
                  checked={formData.smsNotifications}
                  onChange={handleInputChange}
                />
                <span className="checkbox-text">SMS Notifications</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="marketingEmails"
                  checked={formData.marketingEmails}
                  onChange={handleInputChange}
                />
                <span className="checkbox-text">Marketing Emails</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="create-account-error">
              <p className="create-account-error-text">{error}</p>
            </div>
          )}

          {keyGenerationStatus && (
            <div className="key-generation-status">
              <p className="key-generation-status-text">{keyGenerationStatus}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isGeneratingKeys}
            className="create-account-button"
          >
            {isGeneratingKeys ? 'Generating Keys...' : isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};