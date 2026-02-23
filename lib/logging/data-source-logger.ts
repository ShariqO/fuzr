/**
 * Data Source Logger
 * 
 * Tracks which APIs, GPT models, and data sources are used during
 * company enrichment and signal generation. Writes structured logs
 * to a file for transparency and debugging.
 */

import fs from 'fs'
import path from 'path'

export interface DataSourceLogEntry {
    timestamp: string
    companyName: string
    companyId?: string
    action: 'enrich' | 'refresh' | 'score' | 'analyze'
    source: string       // e.g., 'RapidAPI/JSearch', 'Adzuna', 'OpenAI/gpt-4o-mini', 'FCA Register'
    sourceType: 'api' | 'ai' | 'scraping' | 'database'
    detail: string       // What was fetched or generated
    result: 'success' | 'error' | 'skipped' | 'no_data'
    itemCount?: number   // Number of items returned (jobs, signals, articles, etc.)
    durationMs?: number  // How long the call took
}

const LOG_DIR = path.join(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'data-sources.log')

/**
 * Ensure the log directory exists
 */
function ensureLogDir(): void {
    try {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true })
        }
    } catch {
        // Silently fail if we can't create the directory (e.g., read-only filesystem)
    }
}

/**
 * Log a data source usage entry
 */
export function logDataSource(entry: DataSourceLogEntry): void {
    try {
        ensureLogDir()

        const line = JSON.stringify({
            ...entry,
            timestamp: entry.timestamp || new Date().toISOString(),
        })

        fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8')
    } catch {
        // Silently fail — logging should never break the app
    }
}

/**
 * Log multiple entries at once (for batch operations)
 */
export function logDataSources(entries: DataSourceLogEntry[]): void {
    for (const entry of entries) {
        logDataSource(entry)
    }
}

/**
 * Helper to create a log entry with timing
 */
export function createSourceLog(
    companyName: string,
    source: string,
    sourceType: DataSourceLogEntry['sourceType'],
    action: DataSourceLogEntry['action'] = 'refresh'
): {
    finish: (result: DataSourceLogEntry['result'], detail: string, itemCount?: number) => void
} {
    const startTime = Date.now()

    return {
        finish(result, detail, itemCount) {
            logDataSource({
                timestamp: new Date().toISOString(),
                companyName,
                action,
                source,
                sourceType,
                detail,
                result,
                itemCount,
                durationMs: Date.now() - startTime,
            })
        }
    }
}
