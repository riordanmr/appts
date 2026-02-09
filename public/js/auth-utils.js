// Shared authentication utilities
const API_URL = window.location.origin + '/api';

/**
 * Handle login for both customer and stylist portals
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback on successful login
 * @param {Function} options.onError - Callback on error
 * @param {Array<string>} options.allowedRoles - Roles allowed to login (null = all roles)
 */
async function handleLogin(email, password, options = {}) {
  const { onSuccess, onError, allowedRoles = null } = options;

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Check role if restrictions are specified
    if (allowedRoles && !allowedRoles.includes(data.user.role)) {
      throw new Error('Access denied. Insufficient permissions.');
    }

    // Store token and user info
    localStorage.setItem('token', data.token);
    
    if (onSuccess) {
      onSuccess(data.token, data.user);
    }

    return { token: data.token, user: data.user };
  } catch (error) {
    if (onError) {
      onError(error);
    }
    throw error;
  }
}

/**
 * Check if user is authenticated via stored token
 * @param {string} endpoint - API endpoint to validate token against
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback on successful auth check
 * @param {Function} options.onError - Callback on auth failure
 */
async function checkAuth(endpoint, options = {}) {
  const { onSuccess, onError } = options;
  const token = localStorage.getItem('token');

  if (!token) {
    if (onError) {
      onError(new Error('No token found'));
    }
    return false;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      if (onSuccess) {
        onSuccess();
      }
      return true;
    } else {
      localStorage.removeItem('token');
      if (onError) {
        onError(new Error('Token invalid or expired'));
      }
      return false;
    }
  } catch (error) {
    localStorage.removeItem('token');
    if (onError) {
      onError(error);
    }
    return false;
  }
}

/**
 * Logout user
 * @param {Function} callback - Callback after logout
 */
function logout(callback) {
  localStorage.removeItem('token');
  if (callback) {
    callback();
  }
}

/**
 * Get current auth token
 */
function getToken() {
  return localStorage.getItem('token');
}

/**
 * Set error message display
 * @param {string} elementId - ID of error display element
 * @param {string} message - Error message to display
 */
function showError(elementId, message) {
  const errorDiv = document.getElementById(elementId);
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
  }
}

/**
 * Clear error message display
 * @param {string} elementId - ID of error display element
 */
function clearError(elementId) {
  const errorDiv = document.getElementById(elementId);
  if (errorDiv) {
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
  }
}
