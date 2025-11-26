import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { triggerManualCleanup } from '../cron/timeToHoldCleanup.js';
import File from '../models/File.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/cron/time-to-hold/status
 * Get status of files and their toHoldTime
 */
router.get('/time-to-hold/status', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    
    // Get files grouped by status
    const expiredFiles = await File.find({
      toHoldTime: { $lte: now },
      $expr: { $gt: [{ $size: '$accessRights' }, 1] }
    }).select('filename toHoldTime accessRights uploader')
      .populate('uploader', 'username organizationName');

    const activeFiles = await File.find({
      toHoldTime: { $gt: now }
    }).select('filename toHoldTime accessRights uploader')
      .populate('uploader', 'username organizationName');

    res.json({
      success: true,
      data: {
        currentTime: now,
        expired: {
          count: expiredFiles.length,
          files: expiredFiles.map(f => ({
            id: f._id,
            filename: f.filename,
            toHoldTime: f.toHoldTime,
            uploaderOrg: f.uploader?.organizationName,
            organizationsWithAccess: f.accessRights.length,
            organizations: f.accessRights.map(ar => ar.organizationName)
          }))
        },
        active: {
          count: activeFiles.length,
          files: activeFiles.map(f => ({
            id: f._id,
            filename: f.filename,
            toHoldTime: f.toHoldTime,
            timeRemaining: Math.max(0, f.toHoldTime - now),
            uploaderOrg: f.uploader?.organizationName,
            organizationsWithAccess: f.accessRights.length
          }))
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching time-to-hold status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status',
      error: error.message
    });
  }
});

/**
 * POST /api/cron/time-to-hold/trigger
 * Manually trigger the cleanup process (Admin only)
 */
router.post('/time-to-hold/trigger', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    logger.info(`Manual cleanup triggered by user: ${req.user.username}`);
    
    await triggerManualCleanup();
    
    res.json({
      success: true,
      message: 'Cleanup process triggered successfully',
      triggeredBy: req.user.username,
      triggeredAt: new Date()
    });
  } catch (error) {
    logger.error('Error triggering manual cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger cleanup',
      error: error.message
    });
  }
});

/**
 * PUT /api/cron/time-to-hold/:fileId
 * Update toHoldTime for a specific file (Admin/Manager only)
 */
router.put('/time-to-hold/:fileId', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
  try {
    const { fileId } = req.params;
    const { toHoldTime } = req.body;

    if (!toHoldTime) {
      return res.status(400).json({
        success: false,
        message: 'toHoldTime is required'
      });
    }

    const newToHoldTime = new Date(toHoldTime);
    if (isNaN(newToHoldTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format for toHoldTime'
      });
    }

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const oldToHoldTime = file.toHoldTime;
    file.toHoldTime = newToHoldTime;
    await file.save();

    logger.info(`toHoldTime updated for file ${fileId} by ${req.user.username}`, {
      oldTime: oldToHoldTime,
      newTime: newToHoldTime
    });

    res.json({
      success: true,
      message: 'toHoldTime updated successfully',
      data: {
        fileId: file._id,
        filename: file.filename,
        oldToHoldTime,
        newToHoldTime,
        updatedBy: req.user.username
      }
    });
  } catch (error) {
    logger.error('Error updating toHoldTime:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update toHoldTime',
      error: error.message
    });
  }
});

export default router;
