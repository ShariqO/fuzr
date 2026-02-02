/**
 * Type-safe database query helpers
 * 
 * This module provides typed wrappers for Supabase queries to avoid
 * TypeScript's 'never' type inference issues with the generated types.
 * 
 * Usage:
 *   const companies = await getCompanies(supabase)
 *   const company = await getCompanyById(supabase, id)
 */

import type { Database, Company, Signal, Profile, Recommendation } from '@/types/database'

// Use 'any' for client type to avoid complex type inference issues
// The return types are still strongly typed
type SupabaseClientAny = any

/**
 * Fetch all companies
 */
export async function getCompanies(supabase: SupabaseClientAny): Promise<Company[]> {
    const { data, error } = await supabase
        .from('companies')
        .select('*')

    if (error) throw error
    return (data ?? []) as Company[]
}

/**
 * Fetch a company by ID
 */
export async function getCompanyById(
    supabase: SupabaseClientAny,
    id: string
): Promise<Company | null> {
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as Company | null
}

/**
 * Insert a company
 */
export async function insertCompany(
    supabase: SupabaseClientAny,
    company: Database['public']['Tables']['companies']['Insert']
): Promise<Company> {
    const { data, error } = await supabase
        .from('companies')
        .insert(company)
        .select('*')
        .single()

    if (error) throw error
    return data as Company
}

/**
 * Update a company
 */
export async function updateCompany(
    supabase: SupabaseClientAny,
    id: string,
    updates: Database['public']['Tables']['companies']['Update']
): Promise<void> {
    const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)

    if (error) throw error
}

/**
 * Fetch all signals
 */
export async function getSignals(supabase: SupabaseClientAny): Promise<Signal[]> {
    const { data, error } = await supabase
        .from('signals')
        .select('*')

    if (error) throw error
    return (data ?? []) as Signal[]
}

/**
 * Insert signals
 */
export async function insertSignals(
    supabase: SupabaseClientAny,
    signals: Database['public']['Tables']['signals']['Insert'][]
): Promise<void> {
    if (signals.length === 0) return

    const { error } = await supabase
        .from('signals')
        .insert(signals)

    if (error) throw error
}

/**
 * Delete signals by company ID and extraction method
 */
export async function deleteSignalsByMethod(
    supabase: SupabaseClientAny,
    companyId: string,
    methods: string[]
): Promise<void> {
    const { error } = await supabase
        .from('signals')
        .delete()
        .eq('company_id', companyId)
        .in('extraction_method', methods)

    if (error) throw error
}

/**
 * Fetch profile by user ID
 */
export async function getProfileByUserId(
    supabase: SupabaseClientAny,
    userId: string
): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as Profile | null
}

/**
 * Upsert profile
 */
export async function upsertProfile(
    supabase: SupabaseClientAny,
    profile: Database['public']['Tables']['profiles']['Insert']
): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .upsert(profile)

    if (error) throw error
}

/**
 * Delete recommendations by user ID
 */
export async function deleteRecommendationsByUserId(
    supabase: SupabaseClientAny,
    userId: string
): Promise<void> {
    const { error } = await supabase
        .from('recommendations')
        .delete()
        .eq('user_id', userId)

    if (error) throw error
}

/**
 * Insert recommendations
 */
export async function insertRecommendations(
    supabase: SupabaseClientAny,
    recommendations: Database['public']['Tables']['recommendations']['Insert'][]
): Promise<void> {
    if (recommendations.length === 0) return

    const { error } = await supabase
        .from('recommendations')
        .insert(recommendations)

    if (error) throw error
}

/**
 * Fetch recommendations with companies for a user
 */
export async function getRecommendationsWithCompanies(
    supabase: SupabaseClientAny,
    userId: string
): Promise<(Recommendation & { companies: Company })[]> {
    const { data, error } = await supabase
        .from('recommendations')
        .select('*, companies(*)')
        .eq('user_id', userId)
        .order('score', { ascending: false })

    if (error) throw error
    return (data ?? []) as (Recommendation & { companies: Company })[]
}

/**
 * Check if company exists by company number
 * Returns basic fields needed for enrichment
 */
export async function findCompanyByNumber(
    supabase: SupabaseClientAny,
    companyNumber: string
): Promise<{ id: string; name: string; industry: string | null; website: string | null } | null> {
    const { data, error } = await supabase
        .from('companies')
        .select('id, name, industry, website')
        .eq('company_number', companyNumber)
        .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as { id: string; name: string; industry: string | null; website: string | null } | null
}
