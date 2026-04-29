import { Request, Response, NextFunction } from 'express';
import SuperAdminConfig from '../models/SuperAdminConfig.js';

/**
 * Maintenance Guard: Blocks all non-superadmin traffic when platform is locked.
 */
export const checkMaintenance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Never block SuperAdmin or Test routes
    if (req.path.startsWith('/api/superadmin') || req.path === '/api/test' || req.path === '/') {
      return next();
    }

    // 2. Fetch global config from singleton
    const config = await SuperAdminConfig.findOne();
    
    // 3. If Maintenance Mode is active, block the node
    if (config?.maintenanceMode) {
      return res.status(503).json({
        success: false,
        message: 'PLATFORM_OFFLINE: NexusBill is currently undergoing scheduled maintenance for infrastructure optimization.',
        isMaintenance: true
      });
    }

    next();
  } catch (error) {
    // Fail-safe: If DB check fails, allow traffic to prevent total lockout
    next();
  }
};
