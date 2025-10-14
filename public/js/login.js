/**
 * Login Page JavaScript
 * Handles user authentication with email/username and password
 * Integrates with JWT-based authentication system
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const messageArea = document.getElementById('messageArea');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const identifierInput = document.getElementById('identifier');

    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        // Redirect to files page if already authenticated
        window.location.href = '/files.html';
        return;
    }

    // Password visibility toggle
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePasswordBtn.textContent = type === 'password' ? 'Show' : 'Hide';
    });

    // Form submission handler
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const identifier = identifierInput.value.trim();
        const password = passwordInput.value;

        // Client-side validation
        if (!identifier || !password) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        if (password.length < 6) {
            showMessage('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            // Disable form during request
            loginBtn.disabled = true;
            const originalText = loginBtn.innerHTML;
            loginBtn.innerHTML = '<span class="loading-spinner"></span>Signing in...';
            messageArea.style.display = 'none';

            // Send unified identity field (can be email or username)
            const payload = {
                identity: identifier,
                password: password
            };

            // Make login request to existing endpoint
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Store JWT token and username (check both root level and data object)
            const token = data.token || data.data?.token;
            const username = data.username || data.data?.username;

            if (!token) {
                throw new Error('No authentication token received');
            }

            localStorage.setItem('token', token);
            
            if (username) {
                localStorage.setItem('username', username);
            }

            showMessage('Login successful! Redirecting...', 'success');

            // Redirect to files page
            setTimeout(() => {
                window.location.href = '/files.html';
            }, 1000);

        } catch (error) {
            console.error('Login error:', error);
            showMessage(error.message || 'Login failed. Please check your credentials and try again.', 'error');
            
            // Re-enable form
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        }
    });

    /**
     * Display message to user
     * @param {string} message - Message text
     * @param {string} type - 'success' or 'error'
     */
    function showMessage(message, type = 'error') {
        messageArea.textContent = message;
        messageArea.className = `message ${type}`;
        messageArea.style.display = 'block';
    }
});
 
