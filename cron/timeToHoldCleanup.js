import cron from 'node-cron';
import File from '../models/File.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

/**
 * Time-to-Hold Cleanup Service
 * 
 * This cron job runs every 5 minutes to check files whose toHoldTime has expired.
 * When a file's toHoldTime is exceeded:
 * 1. Find the uploader's organization
 * 2. Remove all accessRights and encryptedSymmetricKeys from other organizations
 * 3. Keep only the uploader's organization access
 */

const TIME_TO_HOLD_CLEANUP_SCHEDULE = '*/5 * * * *'; // Every 5 minutes

/**
 * Process expired files and revoke access from other organizations
 */
async function processExpiredFiles() {
  const startTime = Date.now();
  logger.info('🕒 [TIME-TO-HOLD CLEANUP] Starting scheduled cleanup...');

  try {
    const now = new Date();
    
    // Find all files where toHoldTime has passed
    const expiredFiles = await File.find({
      toHoldTime: { $lte: now },
      // Only process files that still have multiple organizations with access
      $expr: { $gt: [{ $size: '$accessRights' }, 1] }
    }).populate('uploader', 'organization organizationName');

    if (expiredFiles.length === 0) {
      logger.info('✅ [TIME-TO-HOLD CLEANUP] No expired files found');
      return;
    }

    logger.info(`📋 [TIME-TO-HOLD CLEANUP] Found ${expiredFiles.length} expired file(s) to process`);

    let processedCount = 0;
    let errorCount = 0;

    for (const file of expiredFiles) {
      try {
        await revokeAccessFromOtherOrganizations(file);
        processedCount++;
      } catch (error) {
        errorCount++;
        logger.error(`❌ [TIME-TO-HOLD CLEANUP] Error processing file ${file._id}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`✅ [TIME-TO-HOLD CLEANUP] Completed in ${duration}ms. Processed: ${processedCount}, Errors: ${errorCount}`);

  } catch (error) {
    logger.error('❌ [TIME-TO-HOLD CLEANUP] Fatal error during cleanup:', error);
  }
}

/**
 * Revoke access from all organizations except the uploader's organization
 * @param {Object} file - The file document to process
 */
async function revokeAccessFromOtherOrganizations(file) {
  try {
    // Get uploader information
    let uploaderOrgId;
    let uploaderOrgName;

    if (file.uploader) {
      // If populated
      uploaderOrgId = file.uploader.organization;
      uploaderOrgName = file.uploader.organizationName;
    } else {
      // If not populated, fetch the user
      const uploader = await User.findById(file.userId || file.uploader);
      if (!uploader) {
        throw new Error(`Uploader not found for file ${file._id}`);
      }
      uploaderOrgId = uploader.organization;
      uploaderOrgName = uploader.organizationName;
    }

    logger.info(`🔒 [TIME-TO-HOLD CLEANUP] Processing file: ${file.filename} (${file._id})`);
    logger.info(`   Uploader organization: ${uploaderOrgName} (${uploaderOrgId})`);

    // Get current access rights before cleanup
    const beforeCount = file.accessRights.length;
    const beforeOrgs = file.accessRights.map(ar => ar.organizationName).join(', ');

    // Filter accessRights to keep only uploader's organization
    const updatedAccessRights = file.accessRights.filter(
      accessRight => accessRight.organizationId.toString() === uploaderOrgId.toString()
    );

    // Filter encryptedSymmetricKeys to keep only uploader's organization
    const updatedEncryptedKeys = file.encryptedSymmetricKeys.filter(
      key => key.organizationId.toString() === uploaderOrgId.toString()
    );

    // Update the file
    file.accessRights = updatedAccessRights;
    file.encryptedSymmetricKeys = updatedEncryptedKeys;
    
    await file.save();

    const afterCount = file.accessRights.length;
    const revokedCount = beforeCount - afterCount;

    logger.info(`   ✅ Access revoked from ${revokedCount} organization(s)`);
    logger.info(`   📊 Before: [${beforeOrgs}]`);
    logger.info(`   📊 After: [${updatedAccessRights.map(ar => ar.organizationName).join(', ')}]`);
    logger.info(`   🔑 Encrypted keys: ${file.encryptedSymmetricKeys.length} remaining`);

  } catch (error) {
    logger.error(`❌ [TIME-TO-HOLD CLEANUP] Error revoking access for file ${file._id}:`, error);
    throw error;
  }
}

/**
 * Start the time-to-hold cleanup cron job
 */
export function startTimeToHoldCleanup() {
  logger.info('🚀 [TIME-TO-HOLD CLEANUP] Initializing cron job...');
  logger.info(`   Schedule: Every 5 minutes (${TIME_TO_HOLD_CLEANUP_SCHEDULE})`);

  const task = cron.schedule(TIME_TO_HOLD_CLEANUP_SCHEDULE, async () => {
    await processExpiredFiles();
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  // Run immediately on startup for testing
  logger.info('   Running initial cleanup check...');
  processExpiredFiles().catch(error => {
    logger.error('❌ [TIME-TO-HOLD CLEANUP] Error in initial run:', error);
  });

  return task;
}

/**
 * Manual trigger for testing/administrative purposes
 */
export async function triggerManualCleanup() {
  logger.info('🔧 [TIME-TO-HOLD CLEANUP] Manual cleanup triggered');
  await processExpiredFiles();
}

// Export for testing
export { processExpiredFiles, revokeAccessFromOtherOrganizations };
