/**
 * Registration Page JavaScript
 * Handles user registration with comprehensive client-side validation
 * Integrates with JWT-based authentication system
 * Follows ES module patterns and security best practices
 */

document.addEventListener('DOMContentLoaded', () => {
    // Form elements
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');
    const messageArea = document.getElementById('messageArea');

    // Input elements
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    // Validation message elements
    const usernameValidation = document.getElementById('usernameValidation');
    const emailValidation = document.getElementById('emailValidation');
    const passwordValidation = document.getElementById('passwordValidation');
    const confirmPasswordValidation = document.getElementById('confirmPasswordValidation');

    // Password strength elements
    const passwordStrength = document.querySelector('.password-strength');
    const passwordStrengthBar = document.querySelector('.password-strength-bar');
    const passwordRequirements = document.getElementById('passwordRequirements');

    // Password toggle buttons
    const togglePasswordBtn = document.getElementById('togglePassword');
    const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');

    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/files.html';
        return;
    }

    // Password visibility toggles
    togglePasswordBtn.addEventListener('click', () => {
        togglePasswordVisibility(passwordInput, togglePasswordBtn);
    });

    toggleConfirmPasswordBtn.addEventListener('click', () => {
        togglePasswordVisibility(confirmPasswordInput, toggleConfirmPasswordBtn);
    });

    // Real-time validation
    usernameInput.addEventListener('input', () => validateUsername());
    usernameInput.addEventListener('blur', () => validateUsername());

    emailInput.addEventListener('input', () => validateEmail());
    emailInput.addEventListener('blur', () => validateEmail());

    passwordInput.addEventListener('input', () => {
        validatePassword();
        checkPasswordStrength();
    });
    passwordInput.addEventListener('focus', () => {
        passwordRequirements.classList.add('show');
        passwordStrength.classList.add('show');
    });
    passwordInput.addEventListener('blur', () => {
        validatePassword();
    });

    confirmPasswordInput.addEventListener('input', () => validateConfirmPassword());
    confirmPasswordInput.addEventListener('blur', () => validateConfirmPassword());

    // Form submission
    registerForm.addEventListener('submit', handleSubmit);

    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e.preventDefault();

        // Validate all fields
        const isUsernameValid = validateUsername();
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();
        const isConfirmPasswordValid = validateConfirmPassword();

        if (!isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
            showMessage('Please fix all validation errors before submitting', 'error');
            return;
        }

        const username = usernameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        try {
            // Disable form
            registerBtn.disabled = true;
            const originalText = registerBtn.innerHTML;
            registerBtn.innerHTML = '<span class="loading-spinner"></span>Creating account...';
            messageArea.style.display = 'none';

            // Make registration request
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // Store token and username
            if (data.data && data.data.token) {
                localStorage.setItem('token', data.data.token);
                localStorage.setItem('username', data.data.username);
            }

            showMessage('Account created successfully! Redirecting...', 'success');

            // Redirect to files page
            setTimeout(() => {
                window.location.href = '/files.html';
            }, 1500);

        } catch (error) {
            console.error('Registration error:', error);
            showMessage(error.message || 'Registration failed. Please try again.', 'error');
            registerBtn.disabled = false;
            registerBtn.innerHTML = 'Create Account';
        }
    }

    /**
     * Validate username
     */
    function validateUsername() {
        const username = usernameInput.value.trim();
        
        if (!username) {
            setValidationState(usernameInput, usernameValidation, 'Username is required', false);
            return false;
        }

        // Username requirements: 3-20 characters, alphanumeric and underscores
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        
        if (!usernameRegex.test(username)) {
            setValidationState(
                usernameInput, 
                usernameValidation, 
                'Username must be 3-20 characters (letters, numbers, underscores only)', 
                false
            );
            return false;
        }

        setValidationState(usernameInput, usernameValidation, 'Username looks good!', true);
        return true;
    }

    /**
     * Validate email
     */
    function validateEmail() {
        const email = emailInput.value.trim();
        
        if (!email) {
            setValidationState(emailInput, emailValidation, 'Email is required', false);
            return false;
        }

        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
            setValidationState(emailInput, emailValidation, 'Please enter a valid email address', false);
            return false;
        }

        setValidationState(emailInput, emailValidation, 'Email looks good!', true);
        return true;
    }

    /**
     * Validate password
     */
    function validatePassword() {
        const password = passwordInput.value;
        
        if (!password) {
            setValidationState(passwordInput, passwordValidation, 'Password is required', false);
            return false;
        }

        // Check minimum length (backend requires 6)
        if (password.length < 6) {
            setValidationState(passwordInput, passwordValidation, 'Password must be at least 6 characters', false);
            return false;
        }

        // Check for stronger password requirements
        const requirements = {
            length: password.length >= 6,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password)
        };

        // Update requirements display
        updatePasswordRequirements(requirements);

        // All requirements must be met
        const allMet = Object.values(requirements).every(req => req);
        
        if (!allMet) {
            setValidationState(passwordInput, passwordValidation, 'Please meet all password requirements', false);
            return false;
        }

        setValidationState(passwordInput, passwordValidation, 'Strong password!', true);
        
        // Re-validate confirm password if it has a value
        if (confirmPasswordInput.value) {
            validateConfirmPassword();
        }
        
        return true;
    }

    /**
     * Validate confirm password
     */
    function validateConfirmPassword() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (!confirmPassword) {
            setValidationState(confirmPasswordInput, confirmPasswordValidation, 'Please confirm your password', false);
            return false;
        }

        if (password !== confirmPassword) {
            setValidationState(confirmPasswordInput, confirmPasswordValidation, 'Passwords do not match', false);
            return false;
        }

        setValidationState(confirmPasswordInput, confirmPasswordValidation, 'Passwords match!', true);
        return true;
    }

    /**
     * Check password strength
     */
    function checkPasswordStrength() {
        const password = passwordInput.value;
        
        if (!password) {
            passwordStrengthBar.className = 'password-strength-bar';
            return;
        }

        let strength = 0;
        
        // Length check
        if (password.length >= 6) strength++;
        if (password.length >= 10) strength++;
        
        // Character variety
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        // Set strength class
        passwordStrengthBar.className = 'password-strength-bar';
        if (strength <= 2) {
            passwordStrengthBar.classList.add('weak');
        } else if (strength <= 4) {
            passwordStrengthBar.classList.add('medium');
        } else {
            passwordStrengthBar.classList.add('strong');
        }
    }

    /**
     * Update password requirements display
     */
    function updatePasswordRequirements(requirements) {
        const requirementItems = passwordRequirements.querySelectorAll('.requirement-item');
        
        requirementItems.forEach(item => {
            const requirement = item.dataset.requirement;
            if (requirements[requirement]) {
                item.classList.add('met');
            } else {
                item.classList.remove('met');
            }
        });
    }

    /**
     * Set validation state for input
     */
    function setValidationState(input, messageElement, message, isValid) {
        if (isValid) {
            input.classList.remove('invalid');
            input.classList.add('valid');
            messageElement.textContent = message;
            messageElement.className = 'validation-message success';
        } else {
            input.classList.remove('valid');
            input.classList.add('invalid');
            messageElement.textContent = message;
            messageElement.className = 'validation-message error';
        }
    }

    /**
     * Toggle password visibility
     */
    function togglePasswordVisibility(input, button) {
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        button.textContent = type === 'password' ? 'Show' : 'Hide';
    }

    /**
     * Display message to user
     */
    function showMessage(message, type = 'error') {
        messageArea.textContent = message;
        messageArea.className = `message ${type}`;
        messageArea.style.display = 'block';
        messageArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
