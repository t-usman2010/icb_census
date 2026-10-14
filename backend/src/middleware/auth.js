const jwt = require('jsonwebtoken');
const { Admin } = require('../models');

const SENSITIVE_PROJECTION = [
  '-healthDetails',
  '-parentGuardian.father.cnic',
  '-parentGuardian.mother.cnic',
  '-parentGuardian.father.incomePerMonth',
  '-parentGuardian.mother.incomePerMonth',
  '-parentGuardian.father.bps',
  '-personalDetails.cnicOrFormBNumber',
  '-idpDetails.refugeeCardNumber'
].join(' ');

/**
 * Signs both Access Token and Refresh Token for an admin
 */
function signTokens(admin) {
  const payload = {
    sub: admin._id.toString(),
    role: admin.role,
    email: admin.email,
    name: admin.name
  };

  const accessSecret = process.env.JWT_ACCESS_SECRET;
  if (!accessSecret) throw new Error('JWT_ACCESS_SECRET environment variable must be set');
  const accessToken = jwt.sign(
    payload,
    accessSecret,
    { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' }
  );

  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET environment variable must be set');
  const refreshToken = jwt.sign(
    payload,
    refreshSecret,
    { expiresIn: process.env.REFRESH_TOKEN_TTL || '7d' }
  );

  return { accessToken, refreshToken };
}

/**
 * Authentication middleware checking Bearer token or cookies
 */
async function requireAuth(request, response, next) {
  try {
    let token = '';

    const authHeader = request.headers.authorization;
    if (authHeader && /^Bearer\s+/i.test(authHeader)) {
      token = authHeader.replace(/^Bearer\s+/i, '').trim();
    } else if (request.cookies && request.cookies.accessToken) {
      token = request.cookies.accessToken;
    }

    if (!token) {
      return response.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const accessSecret = process.env.JWT_ACCESS_SECRET;
    if (!accessSecret) throw new Error('JWT_ACCESS_SECRET environment variable must be set');
    const payload = jwt.verify(
      token,
      accessSecret
    );

    const admin = await Admin.findById(payload.sub).select('-passwordHash');
    if (!admin) {
      return response.status(401).json({ error: 'Admin account not found.' });
    }

    if (admin.isActive === false) {
      return response.status(403).json({ error: 'This admin account has been deactivated.' });
    }

    request.admin = admin;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return response.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return response.status(401).json({ error: 'Invalid authentication token.' });
  }
}

/**
 * Role-guard middleware restricting access to specific admin roles
 */
function allow(...roles) {
  return (request, response, next) => {
    if (!request.admin) {
      return response.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(request.admin.role)) {
      return response.status(403).json({
        error: `Forbidden: Requires one of [${roles.join(', ')}] roles. Your role is '${request.admin.role}'.`
      });
    }
    return next();
  };
}

/**
 * Strips sensitive personal fields for Viewer role
 */
function sanitizeStudentForRole(student, role) {
  if (!student || role !== 'Viewer') return student;
  const clone = typeof student.toObject === 'function' ? student.toObject() : JSON.parse(JSON.stringify(student));

  if (clone.personalDetails) {
    clone.personalDetails.cnicOrFormBNumber = '***-***-*** (Protected)';
  }
  if (clone.parentGuardian) {
    if (clone.parentGuardian.father) {
      clone.parentGuardian.father.cnic = '***-***-*** (Protected)';
      clone.parentGuardian.father.incomePerMonth = '[Confidential]';
      clone.parentGuardian.father.bps = '[Confidential]';
    }
    if (clone.parentGuardian.mother) {
      clone.parentGuardian.mother.cnic = '***-***-*** (Protected)';
      clone.parentGuardian.mother.incomePerMonth = '[Confidential]';
    }
  }
  delete clone.healthDetails;
  if (clone.idpDetails) {
    clone.idpDetails.refugeeCardNumber = '[Protected]';
  }

  return clone;
}

module.exports = {
  signTokens,
  requireAuth,
  allow,
  sanitizeStudentForRole,
  SENSITIVE_PROJECTION
};
