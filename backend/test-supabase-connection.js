require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        console.log('🔗 Testing Supabase connection...');
        console.log('URL:', supabaseUrl);
        console.log('Key:', supabaseKey ? '✅ Present' : '❌ Missing');
        
        // Test a simple query
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        
        if (error) {
            if (error.message.includes('relation "users" does not exist')) {
                console.log('✅ Connection successful! (Tables not created yet)');
                console.log('📋 Next step: Create tables using the schema in supabase-schema.sql');
            } else {
                console.error('❌ Connection failed:', error);
            }
        } else {
            console.log('✅ Connection successful!');
            console.log('📊 Data:', data);
        }
        
    } catch (error) {
        console.error('❌ Connection test failed:', error);
    }
}

// Run the test
testConnection(); 