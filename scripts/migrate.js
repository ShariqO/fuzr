const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Ensure environment variables are loaded
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase credentials not found in environment variables')
    console.error('Please create a .env.local file with:')
    console.error('  NEXT_PUBLIC_SUPABASE_URL=your_url')
    console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigrations() {
    console.log('Running database migrations...')

    const migrationsDir = path.join(__dirname, '../db/migrations')
    const files = fs.readdirSync(migrationsDir).sort()

    for (const file of files) {
        if (!file.endsWith('.sql')) continue

        console.log(`Running migration: ${file}`)
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')

        const { error } = await supabase.rpc('exec_sql', { sql_string: sql })

        if (error) {
            console.error(`Error in migration ${file}:`, error)
            console.error('\nNote: You may need to run these migrations manually in the Supabase SQL editor.')
            console.error('Migration file location:', path.join(migrationsDir, file))
        } else {
            console.log(`✓ ${file} completed`)
        }
    }

    console.log('\nMigrations complete!')
    console.log('If you see errors, please run the SQL files manually in your Supabase dashboard.')
}

runMigrations().catch(console.error)
