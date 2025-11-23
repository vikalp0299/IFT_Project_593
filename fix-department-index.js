import mongoose from 'mongoose';

async function fixIndex() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/safe-app';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('departments');

    // List current indexes
    const indexes = await collection.indexes();
    console.log('\nCurrent indexes:');
    indexes.forEach(idx => console.log(`  - ${idx.name}:`, JSON.stringify(idx.key)));

    // Drop the problematic index
    try {
      await collection.dropIndex('publicKey.fingerprint_1');
      console.log('\n✓ Successfully dropped publicKey.fingerprint_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('\n✓ Index publicKey.fingerprint_1 does not exist (already removed)');
      } else {
        throw err;
      }
    }

    // List indexes after removal
    const newIndexes = await collection.indexes();
    console.log('\nIndexes after cleanup:');
    newIndexes.forEach(idx => console.log(`  - ${idx.name}:`, JSON.stringify(idx.key)));

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixIndex();
