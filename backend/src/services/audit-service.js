const { AuditLog } = require('../models');

/**
 * Asynchronously logs admin actions to maintain a tamper-evident audit trail
 * without interrupting the primary request pipeline.
 */
async function logAuditAction({
  adminId,
  action,
  targetStudentId = null,
  details = '',
  ipAddress = '',
  metadata = {}
}) {
  try {
    if (!adminId || !action) return null;
    return await AuditLog.create({
      adminId,
      action,
      targetStudentId,
      details,
      ipAddress,
      metadata,
      timestamp: new Date()
    });
  } catch (error) {
    console.error(`Failed to record audit log (${action}):`, error.message);
    return null;
  }
}

module.exports = { logAuditAction };
