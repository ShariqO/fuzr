const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigration() {
    console.log('Checking database schema...');

    // Try to select the new columns from companies
    const { data, error } = await supabase
        .from('companies')
        .select('embedding, data_source')
        .limit(1);

    if (error) {
        console.error('Migration check failed:', error.message);
        if (error.message.includes('does not exist') || error.code === 'PGRST301') {
            console.log('❌ New columns not found. Migration 003_add_vectors.sql has NOT been applied.');
        } else {
            console.log('❌ Unexpected error checking database.');
        }
    } else {
        console.log('✅ New columns found. Migration seems to be applied!');
    }
}

checkMigration();
