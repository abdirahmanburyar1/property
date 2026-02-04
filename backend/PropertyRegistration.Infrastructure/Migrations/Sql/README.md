# SQL Migrations

This directory contains SQL migration files that are automatically executed on application startup.

## How It Works

1. **Automatic Execution**: When you run `dotnet run`, the application scans this directory for `.sql` files
2. **Ordered Execution**: Files are executed in alphabetical order (use numbered prefixes like `001_`, `002_`, etc.)
3. **Tracking**: Executed migrations are tracked in the `__MigrationHistory` table to prevent re-execution
4. **Idempotent**: Migrations can be safely re-run - already executed migrations are skipped

## Creating a New Migration

1. Create a new `.sql` file in this directory with a descriptive name:
   ```
   002_add_new_column.sql
   ```

2. Use numbered prefixes to control execution order:
   - `001_` - First migration
   - `002_` - Second migration
   - etc.

3. Write your SQL statements:
   ```sql
   -- Migration: Add new column
   -- Date: 2026-01-21
   -- Description: Add RegionId column to Properties table
   
   ALTER TABLE "Properties" ADD COLUMN IF NOT EXISTS "RegionId" uuid;
   ```

4. Run `dotnet run` - the migration will execute automatically

## Migration File Format

- Use PostgreSQL syntax
- Multiple statements are supported (separated by semicolons)
- Comments starting with `--` are ignored
- Empty lines are ignored

## Example Migration

```sql
-- Migration: Make Country column nullable
-- Date: 2026-01-21

ALTER TABLE "Properties" ALTER COLUMN "Country" DROP NOT NULL;
```

## Notes

- Migrations run **before** NHibernate's SchemaUpdate
- If a migration fails, it's logged but doesn't stop the application (in development mode)
- The `__MigrationHistory` table is created automatically if it doesn't exist
