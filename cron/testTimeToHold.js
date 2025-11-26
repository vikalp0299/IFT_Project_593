/**
 * Test Script for Time-to-Hold Feature
 * 
 * This script tests the time-to-hold cleanup functionality
 * Run with: node cron/testTimeToHold.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import File from '../models/File.js';
import User from '../models/User.js';
import { processExpiredFiles, revokeAccessFromOtherOrganizations } from './timeToHoldCleanup.js';
import { logger } from '../utils/logger.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/safe-system';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function displayCurrentStatus() {
  console.log('\n📊 CURRENT STATUS\n' + '='.repeat(80));
  
  const now = new Date();
  
  // Get all files
  const allFiles = await File.find({})
    .populate('uploader', 'username organizationName')
    .select('filename toHoldTime accessRights encryptedSymmetricKeys');
  
  console.log(`Total files in database: ${allFiles.length}\n`);
  
  // Expired files
  const expiredFiles = allFiles.filter(f => f.toHoldTime <= now && f.accessRights.length > 1);
  console.log(`🔴 Expired files (ready for cleanup): ${expiredFiles.length}`);
  expiredFiles.forEach(f => {
    console.log(`  - ${f.filename}`);
    console.log(`    ID: ${f._id}`);
    console.log(`    Expired: ${f.toHoldTime.toISOString()}`);
    console.log(`    Uploader Org: ${f.uploader?.organizationName || 'N/A'}`);
    console.log(`    Organizations with access: ${f.accessRights.length}`);
    console.log(`    Organizations: ${f.accessRights.map(ar => ar.organizationName).join(', ')}`);
    console.log(`    Encrypted keys: ${f.encryptedSymmetricKeys.length}\n`);
  });
  
  // Active files
  const activeFiles = allFiles.filter(f => f.toHoldTime > now);
  console.log(`🟢 Active files (not yet expired): ${activeFiles.length}`);
  activeFiles.slice(0, 5).forEach(f => {
    const timeRemaining = f.toHoldTime - now;
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log(`  - ${f.filename}`);
    console.log(`    Expires in: ${hoursRemaining}h ${minutesRemaining}m`);
    console.log(`    Organizations: ${f.accessRights.length}\n`);
  });
  
  if (activeFiles.length > 5) {
    console.log(`  ... and ${activeFiles.length - 5} more\n`);
  }
  
  console.log('='.repeat(80));
}

async function testCleanup() {
  console.log('\n🧪 TESTING CLEANUP PROCESS\n' + '='.repeat(80));
  
  try {
    await processExpiredFiles();
    console.log('✅ Cleanup process completed successfully');
  } catch (error) {
    console.error('❌ Cleanup process failed:', error);
  }
  
  console.log('='.repeat(80));
}

async function createTestFile() {
  console.log('\n🆕 CREATING TEST FILE\n' + '='.repeat(80));
  
  try {
    // Find a user to use as uploader
    const user = await User.findOne();
    if (!user) {
      console.log('❌ No users found in database. Cannot create test file.');
      return null;
    }
    
    console.log(`Using user: ${user.username} (${user.organizationName})`);
    
    // Create a test file with toHoldTime in the past
    const testFile = new File({
      filename: `test-file-${Date.now()}.txt`,
      originalname: 'test-file.txt',
      mimetype: 'text/plain',
      size: 1024,
      path: `/uploads/test-${Date.now()}.txt`,
      userId: user._id,
      uploader: user._id,
      toHoldTime: new Date(Date.now() - 60000), // 1 minute ago (expired)
      accessRights: [
        {
          organizationId: user.organization,
          organizationName: user.organizationName,
          organizationDisplayName: user.organizationName,
          departmentId: new mongoose.Types.ObjectId(),
          departmentName: user.department,
          departmentDisplayName: user.department
        },
        // Add a fake second organization
        {
          organizationId: new mongoose.Types.ObjectId(),
          organizationName: 'test-partner-org',
          organizationDisplayName: 'Test Partner Organization',
          departmentId: new mongoose.Types.ObjectId(),
          departmentName: 'engineering',
          departmentDisplayName: 'Engineering'
        },
        // Add a fake third organization
        {
          organizationId: new mongoose.Types.ObjectId(),
          organizationName: 'test-vendor-inc',
          organizationDisplayName: 'Test Vendor Inc',
          departmentId: new mongoose.Types.ObjectId(),
          departmentName: 'sales',
          departmentDisplayName: 'Sales'
        }
      ],
      encryptedSymmetricKeys: [
        {
          organizationId: user.organization,
          organizationName: user.organizationName,
          departmentId: new mongoose.Types.ObjectId(),
          departmentName: user.department,
          encryptedKey: 'test-key-1'
        },
        {
          organizationId: new mongoose.Types.ObjectId(),
          organizationName: 'test-partner-org',
          departmentId: new mongoose.Types.ObjectId(),
          departmentName: 'engineering',
          encryptedKey: 'test-key-2'
        },
        {
          organizationId: new mongoose.Types.ObjectId(),
          organizationName: 'test-vendor-inc',
          departmentId: new mongoose.Types.ObjectId(),
          departmentName: 'sales',
          encryptedKey: 'test-key-3'
        }
      ],
      encryption: {
        algorithm: 'AES-256-GCM',
        iv: Buffer.from('test-iv-12345678').toString('base64'),
        authTag: Buffer.from('test-auth-tag-16').toString('base64')
      }
    });
    
    await testFile.save();
    
    console.log('✅ Test file created:');
    console.log(`   ID: ${testFile._id}`);
    console.log(`   Filename: ${testFile.filename}`);
    console.log(`   Expired: ${testFile.toHoldTime.toISOString()}`);
    console.log(`   Organizations with access: ${testFile.accessRights.length}`);
    console.log(`   Encrypted keys: ${testFile.encryptedSymmetricKeys.length}`);
    console.log('='.repeat(80));
    
    return testFile._id;
  } catch (error) {
    console.error('❌ Error creating test file:', error);
    return null;
  }
}

async function verifyTestFile(fileId) {
  console.log('\n🔍 VERIFYING TEST FILE AFTER CLEANUP\n' + '='.repeat(80));
  
  try {
    const file = await File.findById(fileId).populate('uploader', 'username organizationName');
    
    if (!file) {
      console.log('❌ Test file not found');
      return;
    }
    
    console.log(`File: ${file.filename}`);
    console.log(`Uploader Org: ${file.uploader?.organizationName}`);
    console.log(`Organizations with access: ${file.accessRights.length}`);
    console.log(`Organizations: ${file.accessRights.map(ar => ar.organizationName).join(', ')}`);
    console.log(`Encrypted keys: ${file.encryptedSymmetricKeys.length}`);
    
    if (file.accessRights.length === 1 && file.encryptedSymmetricKeys.length === 1) {
      console.log('\n✅ SUCCESS: Access properly revoked from other organizations');
      console.log(`   Only ${file.uploader?.organizationName} has access`);
    } else {
      console.log('\n❌ FAILED: Other organizations still have access');
    }
    
  } catch (error) {
    console.error('❌ Error verifying test file:', error);
  }
  
  console.log('='.repeat(80));
}

async function cleanupTestFile(fileId) {
  console.log('\n🗑️  CLEANING UP TEST FILE\n' + '='.repeat(80));
  
  try {
    const result = await File.deleteOne({ _id: fileId });
    if (result.deletedCount > 0) {
      console.log('✅ Test file deleted successfully');
    } else {
      console.log('❌ Test file not found');
    }
  } catch (error) {
    console.error('❌ Error deleting test file:', error);
  }
  
  console.log('='.repeat(80));
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('TIME-TO-HOLD FEATURE TEST SUITE');
  console.log('='.repeat(80));
  
  await connectToDatabase();
  
  // Display current status
  await displayCurrentStatus();
  
  // Ask user what to do
  console.log('\n📋 TEST OPTIONS:');
  console.log('  1. Run cleanup on existing expired files');
  console.log('  2. Create test file and run cleanup');
  console.log('  3. Just display status (no changes)');
  console.log('  4. Exit\n');
  
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Select option (1-4): ', async (answer) => {
    console.log('');
    
    switch (answer.trim()) {
      case '1':
        await testCleanup();
        await displayCurrentStatus();
        break;
        
      case '2':
        const testFileId = await createTestFile();
        if (testFileId) {
          console.log('\n⏳ Waiting 2 seconds before cleanup...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          await testCleanup();
          await verifyTestFile(testFileId);
          
          rl.question('\nDelete test file? (y/n): ', async (deleteAnswer) => {
            if (deleteAnswer.trim().toLowerCase() === 'y') {
              await cleanupTestFile(testFileId);
            }
            await mongoose.disconnect();
            console.log('\n👋 Disconnected from MongoDB');
            rl.close();
            process.exit(0);
          });
          return;
        }
        break;
        
      case '3':
        console.log('No changes made.');
        break;
        
      case '4':
        console.log('Exiting...');
        break;
        
      default:
        console.log('Invalid option.');
    }
    
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    rl.close();
    process.exit(0);
  });
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
