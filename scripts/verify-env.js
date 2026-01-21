require('dotenv').config({ path: '.env.local' });

console.log('--- Environment Variable Verification ---');

const keys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENAI_API_KEY',
    'COMPANIES_HOUSE_API_KEY',
    'ADZUNA_APP_ID',
    'ADZUNA_APP_KEY'
];

keys.forEach(key => {
    const value = process.env[key];
    if (value) {
        console.log(`✅ ${key}: Found (Length: ${value.length})`);
        // Print first 4 chars to verify it's not a placeholder
        console.log(`   Starts with: ${value.substring(0, 4)}...`);
    } else {
        console.log(`❌ ${key}: NOT FOUND or EMPTY`);
    }
});

console.log('-----------------------------------------');
