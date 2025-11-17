import mongoose from 'mongoose';
import User from '../../models/User.js';
import Department from '../../models/Department.js';
import File from '../../models/File.js';
import Access from '../../models/access.js';
import PublicKey from '../../models/PublicKey.js';
import { Organization } from '../../db.js';

/**
 * Migration: Ensure All Collections Exist
 * 
 * This migration ensures all database collections exist and have proper indexes.
 * If a collection already exists, it will be left untouched.
 */
export default {
  /**
   * Run the migration - create collections if they don't exist
   */
  async up() {
    console.log('   Ensuring all collections exist...');
    
    // Define all models and their collection names
    const models = [
      { name: 'User', model: User, collectionName: 'users' },
      { name: 'Organization', model: Organization, collectionName: 'organizations' },
      { name: 'Department', model: Department, collectionName: 'departments' },
      { name: 'File', model: File, collectionName: 'files' },
      { name: 'Access', model: Access, collectionName: 'accesses' },
      { name: 'PublicKey', model: PublicKey, collectionName: 'publickeys' }
    ];

    const results = {
      created: [],
      exists: [],
      errors: []
    };

    for (const { name, model, collectionName } of models) {
      try {
        // Check if collection exists
        const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
        
        if (collections.length === 0) {
          console.log(`   Creating ${name} collection (${collectionName})...`);
          
          // Create the collection explicitly
          await mongoose.connection.db.createCollection(collectionName);
          console.log(`   ✅ ${name} collection created`);
          results.created.push(name);
        } else {
          console.log(`   ✅ ${name} collection (${collectionName}) already exists`);
          results.exists.push(name);
        }
        
        // Ensure indexes are created (idempotent - won't fail if indexes already exist)
        try {
          await model.createIndexes();
          console.log(`   ✅ ${name} indexes created/verified`);
        } catch (error) {
          // If indexes already exist, that's okay
          if (error.code !== 85 && error.code !== 86) {
            throw error;
          }
          console.log(`   ℹ️  ${name} indexes already exist`);
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${name}:`, error.message);
        results.errors.push({ name, error: error.message });
      }
    }

    console.log('\n   📊 Summary:');
    console.log(`      Created: ${results.created.length} collection(s)`);
    console.log(`      Existing: ${results.exists.length} collection(s)`);
    if (results.errors.length > 0) {
      console.log(`      Errors: ${results.errors.length}`);
      results.errors.forEach(err => {
        console.log(`         - ${err.name}: ${err.error}`);
      });
      throw new Error(`Failed to create ${results.errors.length} collection(s)`);
    }

    console.log('   ✅ All collections ensured');
  },

  /**
   * Rollback - This migration doesn't drop collections on rollback
   */
  async down() {
    console.log('   ⚠️  Rollback: This migration does not drop collections');
    console.log('   ℹ️  Collections will remain in the database');
    console.log('   ℹ️  Use --flush flag to drop all collections');
  }
};

