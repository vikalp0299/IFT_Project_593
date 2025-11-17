# Database Migrations

This directory contains database migration scripts for managing schema changes and data transformations.

## Structure

```
migrations/
├── migrate.js              # Migration runner utility
├── scripts/                # Migration script files
│   └── 001_*.js           # Migration files (numbered sequentially)
└── README.md              # This file
```

## Migration Files

Migration files should be named with a numeric prefix (e.g., `001_`, `002_`, etc.) followed by a descriptive name. They must export an object with `up` and `down` functions:

```javascript
export default {
  async up() {
    // Migration logic - runs when migrating up
  },
  
  async down() {
    // Rollback logic - runs when rolling back
  }
};
```

## Usage

### Run All Pending Migrations

```bash
npm run migrate
# or
node migrations/migrate.js up
```

### Rollback Last Migration

```bash
npm run migrate:down
# or
node migrations/migrate.js down
```

### Check Migration Status

```bash
npm run migrate:status
# or
node migrations/migrate.js status
```

## Creating a New Migration

1. Create a new file in `migrations/scripts/` with a sequential number:
   ```
   migrations/scripts/002_add_field_to_users.js
   ```

2. Export an object with `up` and `down` functions:

   ```javascript
   import mongoose from 'mongoose';
   import User from '../../models/User.js';

   export default {
     async up() {
       // Add new field to existing documents
       await User.updateMany(
         {},
         { $set: { newField: 'defaultValue' } }
       );
       console.log('✅ Added newField to User documents');
     },

     async down() {
       // Remove the field
       await User.updateMany(
         {},
         { $unset: { newField: '' } }
       );
       console.log('✅ Removed newField from User documents');
     }
   };
   ```

3. Run the migration:
   ```bash
   npm run migrate
   ```

## Migration Tracking

Migrations are tracked in a `migrations` collection in MongoDB. Each migration record contains:
- `name`: Migration file name (without .js)
- `status`: Migration status (pending, running, completed, failed)
- `executedAt`: When the migration was executed
- `error`: Error message if migration failed

## Best Practices

1. **Always write rollback logic**: Every migration should have a corresponding `down` function
2. **Test migrations**: Test migrations on a development database before running on production
3. **Use transactions when possible**: For data integrity, wrap operations in transactions
4. **Make migrations idempotent**: Migrations should be safe to run multiple times
5. **Number migrations sequentially**: Use sequential numbering to ensure proper execution order
6. **Keep migrations small**: Break large changes into multiple smaller migrations
7. **Never modify executed migrations**: Once a migration has been run, don't modify it

## Examples

### Adding a New Collection

```javascript
import mongoose from 'mongoose';

export default {
  async up() {
    // Collection will be created automatically when first document is inserted
    // Just ensure the model is imported and indexes are created
    const NewModel = mongoose.model('NewModel', newSchema);
    await NewModel.createIndexes();
  },

  async down() {
    await mongoose.connection.db.dropCollection('newmodels');
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
  },

  async down() {
    await User.updateMany(
      {},
      { $unset: { newField: '' } }
    );
  }
};
```

### Creating Indexes

```javascript
import User from '../../models/User.js';

export default {
  async up() {
    await User.collection.createIndex({ email: 1, organization: 1 }, { unique: true });
  },

  async down() {
    await User.collection.dropIndex('email_1_organization_1');
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
      user.someField = transformData(user.oldField);
      await user.save();
    }
  },

  async down() {
    const users = await User.find({});
    for (const user of users) {
      // Reverse transformation
      user.oldField = reverseTransform(user.someField);
      await user.save();
    }
  }
};
```

## Troubleshooting

### Migration Failed

If a migration fails:
1. Check the error message in the console
2. Check the `migrations` collection in MongoDB for error details
3. Fix the migration file
4. Manually update the migration status in the database if needed
5. Re-run the migration

### Rollback Failed

If a rollback fails:
1. Check the error message
2. Manually fix the database state if needed
3. Update the migration record in the `migrations` collection

### Migration Already Executed

Migrations are tracked, so they won't run twice. If you need to re-run a migration:
1. Remove the migration record from the `migrations` collection
2. Or modify the migration to be idempotent

## Notes

- Migrations run in alphabetical/numerical order based on filename
- Always backup your database before running migrations in production
- Migrations are executed synchronously, one at a time
- If a migration fails, subsequent migrations will not run

