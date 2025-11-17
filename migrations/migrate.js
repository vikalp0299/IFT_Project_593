import mongoose from 'mongoose';
import { connectDB } from '../db.js';
import { logger } from '../utils/logger.js';
import { databaseConfig } from '../config/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Migration Schema to track executed migrations
const migrationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  executedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  error: {
    type: String,
    default: null
  }
});

const Migration = mongoose.model('Migration', migrationSchema);

/**
 * Get all migration files from the migrations directory
 */
function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, 'scripts');
  
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }
  
  return fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.js'))
    .sort();
}

/**
 * Load a migration file
 */
async function loadMigration(filename) {
  const filePath = path.join(__dirname, 'scripts', filename);
  const migration = await import(`file://${filePath}`);
  return migration.default || migration;
}

/**
 * Check if a migration has already been executed
 */
async function isMigrationExecuted(name) {
  const migration = await Migration.findOne({ name });
  return migration && migration.status === 'completed';
}

/**
 * Mark a migration as running
 */
async function markMigrationRunning(name) {
  await Migration.findOneAndUpdate(
    { name },
    { name, status: 'running', executedAt: new Date() },
    { upsert: true, new: true }
  );
}

/**
 * Mark a migration as completed
 */
async function markMigrationCompleted(name) {
  await Migration.findOneAndUpdate(
    { name },
    { status: 'completed', executedAt: new Date(), error: null },
    { upsert: true }
  );
}

/**
 * Mark a migration as failed
 */
async function markMigrationFailed(name, error) {
  await Migration.findOneAndUpdate(
    { name },
    { status: 'failed', error: error.message || String(error) },
    { upsert: true }
  );
}

/**
 * Run a single migration
 */
async function runMigration(filename) {
  const name = path.basename(filename, '.js');
  
  try {
    // Check if already executed
    if (await isMigrationExecuted(name)) {
      logger.info(`Migration ${name} already executed, skipping...`);
      console.log(`⏭️  Migration ${name} already executed, skipping...`);
      return { success: true, skipped: true };
    }

    logger.info(`Running migration: ${name}`);
    console.log(`🔄 Running migration: ${name}...`);

    // Mark as running
    await markMigrationRunning(name);

    // Load and run migration
    const migration = await loadMigration(filename);
    
    if (!migration.up) {
      throw new Error('Migration must export an "up" function');
    }

    // Run the migration
    await migration.up();

    // Mark as completed
    await markMigrationCompleted(name);

    logger.info(`Migration ${name} completed successfully`);
    console.log(`✅ Migration ${name} completed successfully`);
    
    return { success: true, skipped: false };
  } catch (error) {
    logger.error(`Migration ${name} failed`, { error: error.message, stack: error.stack });
    console.error(`❌ Migration ${name} failed:`, error.message);
    
    // Mark as failed
    await markMigrationFailed(name, error);
    
    return { success: false, error: error.message };
  }
}

/**
 * Rollback a single migration
 */
async function rollbackMigration(filename) {
  const name = path.basename(filename, '.js');
  
  try {
    // Check if migration was executed
    const migrationRecord = await Migration.findOne({ name });
    if (!migrationRecord || migrationRecord.status !== 'completed') {
      logger.info(`Migration ${name} was not executed, skipping rollback...`);
      console.log(`⏭️  Migration ${name} was not executed, skipping rollback...`);
      return { success: true, skipped: true };
    }

    logger.info(`Rolling back migration: ${name}`);
    console.log(`🔄 Rolling back migration: ${name}...`);

    // Load and run rollback
    const migration = await loadMigration(filename);
    
    if (!migration.down) {
      throw new Error('Migration must export a "down" function for rollback');
    }

    // Run the rollback
    await migration.down();

    // Remove migration record
    await Migration.deleteOne({ name });

    logger.info(`Migration ${name} rolled back successfully`);
    console.log(`✅ Migration ${name} rolled back successfully`);
    
    return { success: true, skipped: false };
  } catch (error) {
    logger.error(`Rollback of ${name} failed`, { error: error.message, stack: error.stack });
    console.error(`❌ Rollback of ${name} failed:`, error.message);
    
    return { success: false, error: error.message };
  }
}

/**
 * Flush all collections - Drop and recreate all collections
 */
async function flushAllCollections() {
  try {
    console.log('⚠️  FLUSH MODE: This will DELETE ALL DATA and recreate all collections!');
    console.log('🔄 Flushing all collections...\n');
    
    // Import all models
    const User = (await import('../models/User.js')).default;
    const Department = (await import('../models/Department.js')).default;
    const File = (await import('../models/File.js')).default;
    const Access = (await import('../models/access.js')).default;
    const PublicKey = (await import('../models/PublicKey.js')).default;
    const { Organization } = await import('../db.js');

    const models = [
      { name: 'User', model: User, collectionName: 'users' },
      { name: 'Organization', model: Organization, collectionName: 'organizations' },
      { name: 'Department', model: Department, collectionName: 'departments' },
      { name: 'File', model: File, collectionName: 'files' },
      { name: 'Access', model: Access, collectionName: 'accesses' },
      { name: 'PublicKey', model: PublicKey, collectionName: 'publickeys' }
    ];

    // Drop all data collections (but keep migrations collection for tracking)
    console.log('🗑️  Dropping all data collections...');
    for (const { name, collectionName } of models) {
      try {
        await mongoose.connection.db.dropCollection(collectionName).catch(err => {
          if (err.codeName !== 'NamespaceNotFound') {
            throw err;
          }
        });
        console.log(`   ✅ Dropped ${name} collection (${collectionName})`);
      } catch (error) {
        console.log(`   ℹ️  ${name} collection (${collectionName}) does not exist or could not be dropped`);
      }
    }

    // Clear migration history so all migrations will run again
    console.log('🧹 Clearing migration history...');
    try {
      await Migration.deleteMany({});
      console.log('   ✅ Migration history cleared');
    } catch (error) {
      console.log('   ℹ️  Migration collection does not exist or could not be cleared');
    }

    // Recreate all collections
    console.log('\n🔨 Recreating all collections...');
    for (const { name, model, collectionName } of models) {
      try {
        await mongoose.connection.db.createCollection(collectionName);
        console.log(`   ✅ Created ${name} collection (${collectionName})`);
        
        // Create indexes
        await model.createIndexes();
        console.log(`   ✅ Created indexes for ${name}`);
      } catch (error) {
        console.error(`   ❌ Error recreating ${name}:`, error.message);
        throw error;
      }
    }

    console.log('\n✅ All collections flushed and recreated');
    console.log('💡 Run "npm run migrate" to re-run all migrations');
    
  } catch (error) {
    logger.error('Flush process failed', { error: error.message, stack: error.stack });
    console.error('❌ Flush process failed:', error);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(flush = false) {
  try {
    // Connect to database
    await connectDB();
    
    // If flush flag is set, flush all collections first
    if (flush) {
      await flushAllCollections();
      console.log('\n📦 Now running all migrations from scratch...\n');
    }
    
    const migrationFiles = getMigrationFiles();
    
    if (migrationFiles.length === 0) {
      console.log('📭 No migration files found');
      return;
    }

    console.log(`📦 Found ${migrationFiles.length} migration file(s)`);
    
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const file of migrationFiles) {
      const result = await runMigration(file);
      
      if (result.success) {
        if (result.skipped) {
          skippedCount++;
        } else {
          successCount++;
        }
      } else {
        failedCount++;
        console.error(`❌ Stopping migrations due to failure in ${file}`);
        break;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Completed: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    
    process.exit(failedCount > 0 ? 1 : 0);
  } catch (error) {
    logger.error('Migration process failed', { error: error.message, stack: error.stack });
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  }
}

/**
 * Rollback the last migration
 */
export async function rollbackLastMigration() {
  try {
    await connectDB();
    
    const migrationFiles = getMigrationFiles().reverse(); // Start from latest
    
    // Find the last executed migration
    for (const file of migrationFiles) {
      const name = path.basename(file, '.js');
      const migrationRecord = await Migration.findOne({ name, status: 'completed' });
      
      if (migrationRecord) {
        await rollbackMigration(file);
        return;
      }
    }
    
    console.log('📭 No migrations to rollback');
  } catch (error) {
    logger.error('Rollback process failed', { error: error.message, stack: error.stack });
    console.error('❌ Rollback process failed:', error);
    process.exit(1);
  }
}

/**
 * Show migration status
 */
export async function showMigrationStatus() {
  try {
    await connectDB();
    
    const migrationFiles = getMigrationFiles();
    const executedMigrations = await Migration.find({});
    const executedNames = new Set(executedMigrations.map(m => m.name));
    
    console.log('\n📊 Migration Status:\n');
    console.log('Executed Migrations:');
    executedMigrations.forEach(m => {
      const statusIcon = m.status === 'completed' ? '✅' : m.status === 'failed' ? '❌' : '🔄';
      console.log(`   ${statusIcon} ${m.name} (${m.status}) - ${m.executedAt}`);
      if (m.error) {
        console.log(`      Error: ${m.error}`);
      }
    });
    
    console.log('\nPending Migrations:');
    const pendingFiles = migrationFiles.filter(file => {
      const name = path.basename(file, '.js');
      return !executedNames.has(name);
    });
    
    if (pendingFiles.length === 0) {
      console.log('   ✨ No pending migrations');
    } else {
      pendingFiles.forEach(file => {
        console.log(`   ⏳ ${path.basename(file, '.js')}`);
      });
    }
    
    console.log('');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to show migration status', { error: error.message });
    console.error('❌ Failed to show migration status:', error);
    process.exit(1);
  }
}

// CLI interface
(async () => {
  const command = process.argv[2];
  const flushFlag = process.argv.includes('--flush') || process.argv.includes('-f');

  if (command === 'up' || !command) {
    if (flushFlag) {
      console.log('⚠️  WARNING: --flush flag detected!');
      console.log('⚠️  This will DELETE ALL DATA from all collections!');
      console.log('⚠️  Press Ctrl+C within 5 seconds to cancel...\n');
      
      // Wait 5 seconds before proceeding
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    runMigrations(flushFlag);
  } else if (command === 'down') {
    rollbackLastMigration();
  } else if (command === 'status') {
    showMigrationStatus();
  } else if (command === 'flush') {
    console.log('⚠️  WARNING: This will DELETE ALL DATA from all collections!');
    console.log('⚠️  Press Ctrl+C within 5 seconds to cancel...\n');
    
    // Wait 5 seconds before proceeding
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
      await connectDB();
      await flushAllCollections();
      process.exit(0);
    } catch (error) {
      console.error('❌ Flush failed:', error);
      process.exit(1);
    }
  } else {
    console.log('Usage:');
    console.log('  node migrations/migrate.js [command] [options]');
    console.log('');
    console.log('Commands:');
    console.log('  up           Run all pending migrations (default)');
    console.log('  down         Rollback the last migration');
    console.log('  status       Show migration status');
    console.log('  flush        Flush all collections (drop and recreate)');
    console.log('');
    console.log('Options:');
    console.log('  --flush, -f  Flush all collections before running migrations');
    console.log('');
    console.log('Examples:');
    console.log('  node migrations/migrate.js up');
    console.log('  node migrations/migrate.js up --flush');
    console.log('  node migrations/migrate.js flush');
    process.exit(1);
  }
})();

