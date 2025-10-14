/**
 * Input Validation Utilities
 * Production-ready validation functions for all user inputs
 */

import { validationRules } from '../config/index.js';

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {Object} Validation result
 */
export const validateUsername = (username) => {
  const rules = validationRules.username;
  const errors = [];

  if (!username) {
    errors.push('Username is required');
    return { isValid: false, errors };
  }

  if (typeof username !== 'string') {
    errors.push('Username must be a string');
    return { isValid: false, errors };
  }

  const trimmed = username.trim();

  if (trimmed.length < rules.minLength) {
    errors.push(`Username must be at least ${rules.minLength} characters long`);
  }

  if (trimmed.length > rules.maxLength) {
    errors.push(`Username must be no more than ${rules.maxLength} characters long`);
  }

  if (!rules.pattern.test(trimmed)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmed.toLowerCase()
  };
};

/**
 * Validate password
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
export const validatePassword = (password) => {
  const rules = validationRules.password;
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (typeof password !== 'string') {
    errors.push('Password must be a string');
    return { isValid: false, errors };
  }

  if (password.length < rules.minLength) {
    errors.push(`Password must be at least ${rules.minLength} characters long`);
  }

  if (password.length > rules.maxLength) {
    errors.push(`Password must be no more than ${rules.maxLength} characters long`);
  }

  if (rules.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (rules.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (rules.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (rules.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: password
  };
};

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {Object} Validation result
 */
export const validateEmail = (email) => {
  const rules = validationRules.email;
  const errors = [];

  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  if (typeof email !== 'string') {
    errors.push('Email must be a string');
    return { isValid: false, errors };
  }

  const trimmed = email.trim().toLowerCase();

  if (!rules.pattern.test(trimmed)) {
    errors.push('Please enter a valid email address');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmed
  };
};

/**
 * Validate organization name
 * @param {string} organizationName - Organization name to validate
 * @returns {Object} Validation result
 */
export const validateOrganizationName = (organizationName) => {
  const rules = validationRules.organizationName;
  const errors = [];

  if (!organizationName) {
    errors.push('Organization name is required');
    return { isValid: false, errors };
  }

  if (typeof organizationName !== 'string') {
    errors.push('Organization name must be a string');
    return { isValid: false, errors };
  }

  const trimmed = organizationName.trim();

  if (trimmed.length < rules.minLength) {
    errors.push(`Organization name must be at least ${rules.minLength} characters long`);
  }

  if (trimmed.length > rules.maxLength) {
    errors.push(`Organization name must be no more than ${rules.maxLength} characters long`);
  }

  if (!rules.pattern.test(trimmed)) {
    errors.push('Organization name can only contain letters, numbers, spaces, hyphens, and underscores');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmed
  };
};

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

/**
 * Validate login credentials (less strict than registration)
 * @param {Object} credentials - Login credentials
 * @returns {Object} Validation result
 */
export const validateLoginCredentials = (credentials) => {
  const { username, password } = credentials;
  const errors = [];

  // Basic username validation for login
  if (!username || typeof username !== 'string') {
    errors.push('Username is required');
  } else if (username.trim().length < 1) {
    errors.push('Username cannot be empty');
  }

  // Basic password validation for login (no strict rules)
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else if (password.trim().length < 1) {
    errors.push('Password cannot be empty');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      username: username ? username.trim().toLowerCase() : '',
      password: password ? password.trim() : ''
    }
  };
};

/**
 * Validate registration data
 * @param {Object} data - Registration data
 * @returns {Object} Validation result
 */
export const validateRegistrationData = (data) => {
  const { username, password, email } = data;
  const errors = [];

  const usernameValidation = validateUsername(username);
  if (!usernameValidation.isValid) {
    errors.push(...usernameValidation.errors);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors);
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.push(...emailValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      username: usernameValidation.sanitized,
      password: passwordValidation.sanitized,
      email: emailValidation.sanitized
    }
  };
};

/**
 * Validate public key upload data
 * @param {Object} keyData - Key data to validate
 * @returns {Object} Validation result
 */
export const validateKeyUpload = (keyData) => {
  const errors = [];

  // Validate public key PEM format
  if (!keyData.publicKeyPem) {
    errors.push('Public key is required');
  } else if (typeof keyData.publicKeyPem !== 'string') {
    errors.push('Public key must be a string');
  } else {
    const pem = keyData.publicKeyPem.trim();
    
    // Check PEM format
    if (!pem.includes('-----BEGIN PUBLIC KEY-----') || !pem.includes('-----END PUBLIC KEY-----')) {
      errors.push('Public key must be in valid PEM format');
    }
    
    // Check minimum length (RSA 2048-bit key should be at least 400 characters in PEM format)
    if (pem.length < 400) {
      errors.push(`Public key appears to be too short for a valid RSA key (${pem.length} characters, expected at least 400)`);
    }
    
    // Check maximum length (reasonable limit for very large keys)
    if (pem.length > 10000) {
      errors.push('Public key is too large');
    }
  }

  // Validate organization name
  if (!keyData.organizationName) {
    errors.push('Organization name is required');
  } else if (typeof keyData.organizationName !== 'string') {
    errors.push('Organization name must be a string');
  } else if (keyData.organizationName.trim().length === 0) {
    errors.push('Organization name cannot be empty');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      publicKeyPem: keyData.publicKeyPem?.trim(),
      organizationName: keyData.organizationName?.trim()
    }
  };
};

/**
 * Validate key query parameters
 * @param {Object} queryData - Query data to validate
 * @returns {Object} Validation result
 */
export const validateKeyQuery = (queryData) => {
  const errors = [];

  // Validate organization ID if provided
  if (queryData.organizationId) {
    if (typeof queryData.organizationId !== 'string') {
      errors.push('Organization ID must be a string');
    } else if (!queryData.organizationId.match(/^[0-9a-fA-F]{24}$/)) {
      errors.push('Invalid organization ID format');
    }
  }

  // Validate user ID if provided
  if (queryData.userId) {
    if (typeof queryData.userId !== 'string') {
      errors.push('User ID must be a string');
    } else if (!queryData.userId.match(/^[0-9a-fA-F]{24}$/)) {
      errors.push('Invalid user ID format');
    }
  }

  // Validate key ID if provided
  if (queryData.keyId) {
    if (typeof queryData.keyId !== 'string') {
      errors.push('Key ID must be a string');
    } else {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(queryData.keyId)) {
        errors.push('Invalid key ID format');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
