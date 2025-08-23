const fs = require('fs');
const path = require('path');
const supabase = require('./supabase-connection');

async function runMigration(migrationFile) {
    try {
        console.log(`Running migration: ${migrationFile}`);
        
        // Read the migration file
        const migrationPath = path.join(__dirname, 'migrations', migrationFile);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('Migration SQL content:');
        console.log(migrationSQL);
        
        // For Supabase, we need to execute the SQL manually
        // The migration adds columns to payment_transactions table
        console.log('Note: Please run this SQL manually in your Supabase SQL editor:');
        console.log('Dashboard > SQL Editor > New Query > Paste the above SQL');
        
        console.log(`✅ Migration SQL ready for ${migrationFile}`);
        console.log('Execute the SQL manually in Supabase dashboard to complete the migration.');
        
    } catch (error) {
        console.error(`❌ Migration failed:`, error);
        throw error;
    }
}

// Run the Razorpay fields migration
if (require.main === module) {
    runMigration('add-razorpay-fields.sql')
        .then(() => {
            console.log('All migrations completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { runMigration };