# Database Migrations Guide

This guide explains how to use the migration system for managing database schema changes.

## Quick Start

### 1. Run All Pending Migrations

```bash
npm run migrate
```

This will:
- Connect to your MongoDB database
- Find all migration files in `migrations/scripts/`
- Run any pending migrations in order
- Track executed migrations in the `migrations` collection

### 2. Check Migration Status

```bash
npm run migrate:status
```

This shows:
- Which migrations have been executed
- Which migrations are pending
- Any failed migrations with error messages

### 3. Rollback Last Migration

```bash
npm run migrate:down
```

This will rollback the last executed migration.

## Creating a New Migration

### Step 1: Create Migration File

Create a new file in `migrations/scripts/` with a sequential number and descriptive name:

```bash
# Example: migrations/scripts/002_add_email_index.js
```

### Step 2: Write Migration Code

```javascript
import mongoose from 'mongoose';
import User from '../../models/User.js';

export default {
  async up() {
    // Migration logic - runs when migrating up
    console.log('   Creating email index...');
    await User.collection.createIndex({ email: 1 }, { unique: true });
    console.log('   ✅ Email index created');
  },

  async down() {
    // Rollback logic - runs when rolling back
    console.log('   Dropping email index...');
    await User.collection.dropIndex('email_1');
    console.log('   ✅ Email index dropped');
  }
};
```

### Step 3: Run the Migration

```bash
npm run migrate
```

## Migration File Naming Convention

- Use sequential numbers: `001_`, `002_`, `003_`, etc.
- Use descriptive names: `001_create_departments_collection.js`
- Use underscores to separate words
- Always end with `.js`

## Common Migration Patterns

### Creating a New Collection

```javascript
import mongoose from 'mongoose';
import Department from '../../models/Department.js';

export default {
  async up() {
    // Collection is created automatically when first document is inserted
    // Just ensure indexes are created
    await Department.createIndexes();
    console.log('   ✅ Department collection and indexes created');
  },

  async down() {
    await mongoose.connection.db.dropCollection('departments');
    console.log('   ✅ Department collection dropped');
  }
};
```

### Adding a Field to Existing Collection

```javascript
import User from '../../models/User.js';

export default {
  async up() {
    await User.updateMany(
      { newField: { $exists: false } },
      { $set: { newField: 'defaultValue' } }
    );
    console.log('   ✅ Added newField to User documents');
  },

  async down() {
    await User.updateMany(
      {},
      { $unset: { newField: '' } }
    );
    console.log('   ✅ Removed newField from User documents');
  }
};
```

### Creating Indexes

```javascript
import User from '../../models/User.js';

export default {
  async up() {
    await User.collection.createIndex(
      { email: 1, organization: 1 },
      { unique: true, name: 'email_organization_unique' }
    );
    console.log('   ✅ Created composite index');
  },

  async down() {
    await User.collection.dropIndex('email_organization_unique');
    console.log('   ✅ Dropped composite index');
  }
};
```

### Data Transformation

```javascript
import User from '../../models/User.js';

export default {
  async up() {
    const users = await User.find({});
    for (const user of users) {
      // Transform data
      user.fullName = `${user.firstName} ${user.lastName}`;
      await user.save();
    }
    console.log('   ✅ Transformed user data');
  },

  async down() {
    const users = await User.find({});
    for (const user of users) {
      // Reverse transformation
      if (user.fullName) {
        const [firstName, ...lastNameParts] = user.fullName.split(' ');
        user.firstName = firstName;
        user.lastName = lastNameParts.join(' ');
        user.fullName = undefined;
        await user.save();
      }
    }
    console.log('   ✅ Reversed user data transformation');
  }
};
```

## Migration Tracking

Migrations are tracked in a `migrations` collection in MongoDB. Each record contains:

- `name`: Migration file name (without .js extension)
- `status`: Migration status (`pending`, `running`, `completed`, `failed`)
- `executedAt`: Timestamp when migration was executed
- `error`: Error message if migration failed

## Best Practices

1. **Always write rollback logic**: Every migration should have a `down` function
2. **Test migrations first**: Test on development database before production
3. **Make migrations idempotent**: Safe to run multiple times
4. **Use descriptive names**: Make it clear what the migration does
5. **Keep migrations small**: Break large changes into multiple migrations
6. **Never modify executed migrations**: Once run, don't change the file
7. **Backup before production**: Always backup database before running migrations

## Troubleshooting

### Migration Failed

If a migration fails:

1. Check the error message in the console
2. Check the `migrations` collection for error details:
   ```javascript
   db.migrations.find({ status: 'failed' })
   ```
3. Fix the migration file
4. Update the migration status manually if needed:
   ```javascript
   db.migrations.updateOne(
     { name: 'failed_migration_name' },
     { $set: { status: 'pending' } }
   )
   ```
5. Re-run the migration

### Need to Re-run a Migration

If you need to re-run a completed migration:

1. Remove the migration record:
   ```javascript
   db.migrations.deleteOne({ name: 'migration_name' })
   ```
2. Or make the migration idempotent (safe to run multiple times)
3. Run the migration again: `npm run migrate`

### Rollback Failed

If rollback fails:

1. Check the error message
2. Manually fix the database state if needed
3. Update the migration record:
   ```javascript
   db.migrations.updateOne(
     { name: 'migration_name' },
     { $set: { status: 'completed' } }
   )
   ```

## Example: Department Model Migration

The first migration (`001_create_departments_collection.js`) creates the departments collection:

```bash
npm run migrate
```

This will:
- Create the `departments` collection (if it doesn't exist)
- Create indexes defined in the Department model
- Validate the schema
- Track the migration as completed

## Migration Commands Summary

| Command | Description |
|---------|-------------|
| `npm run migrate` | Run all pending migrations |
| `npm run migrate:down` | Rollback the last migration |
| `npm run migrate:status` | Show migration status |

## Files Structure

```
project/
├── migrations/
│   ├── migrate.js              # Migration runner
│   ├── scripts/                # Migration files
│   │   └── 001_*.js           # Migration scripts
│   └── README.md              # Detailed documentation
├── models/
│   └── Department.js          # Model definitions
└── package.json               # NPM scripts
```

## Notes

- Migrations run in alphabetical/numerical order
- Always backup your database before running migrations in production
- Migrations execute synchronously, one at a time
- If a migration fails, subsequent migrations will not run

