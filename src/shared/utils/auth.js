const jwt = require('jsonwebtoken');

function authenticateToken(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return { authenticated: false, error: 'Access token required' };
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return { authenticated: false, error: 'Server configuration error' };
  }

  try {
    const user = jwt.verify(token, secret);
    return { authenticated: true, user };
  } catch (error) {
    return { authenticated: false, error: 'Invalid or expired token' };
  }
}

function requireRole(roles, user) {
  if (!user) {
    return { authorized: false, error: 'Authentication required' };
  }
  
  if (!roles.includes(user.role)) {
    return { authorized: false, error: 'Insufficient permissions' };
  }
  
  return { authorized: true };
}

module.exports = {
  authenticateToken,
  requireRole
};
