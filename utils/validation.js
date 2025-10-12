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
