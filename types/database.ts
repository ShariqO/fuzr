export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    user_id: string
                    full_name: string
                    role: string
                    region: string
                    selling_category: string
                    selling_description: string
                    target_industries: string[]
                    target_size_band: string[]
                    typical_buyer_personas: string[]
                    deal_size_min: number | null
                    deal_size_max: number | null
                    created_at: string
                    updated_at: string
                    selling_embedding: number[] | null
                }
                Insert: {
                    user_id: string
                    full_name: string
                    role: string
                    region?: string
                    selling_category: string
                    selling_description: string
                    target_industries: string[]
                    target_size_band: string[]
                    typical_buyer_personas: string[]
                    deal_size_min?: number | null
                    deal_size_max?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    user_id?: string
                    full_name?: string
                    role?: string
                    region?: string
                    selling_category?: string
                    selling_description?: string
                    target_industries?: string[]
                    target_size_band?: string[]
                    typical_buyer_personas?: string[]
                    deal_size_min?: number | null
                    deal_size_max?: number | null
                    updated_at?: string
                }
            }
            companies: {
                Row: {
                    id: string
                    name: string
                    website: string
                    industry: string
                    size_band: string
                    location_uk: string
                    description: string
                    embedding: number[] | null
                    data_source: string
                    company_number: string | null
                    sic_codes: string[] | null
                    incorporation_date: string | null
                    last_enriched_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    website: string
                    industry: string
                    size_band: string
                    location_uk: string
                    description: string
                    embedding?: number[] | null
                    data_source?: string
                    company_number?: string | null
                    sic_codes?: string[] | null
                    incorporation_date?: string | null
                    last_enriched_at?: string | null
                }
                Update: {
                    name?: string
                    website?: string
                    industry?: string
                    size_band?: string
                    location_uk?: string
                    description?: string
                    embedding?: number[] | null
                    data_source?: string
                    company_number?: string | null
                    sic_codes?: string[] | null
                    incorporation_date?: string | null
                    last_enriched_at?: string | null
                }
            }
            signals: {
                Row: {
                    id: string
                    company_id: string
                    signal_type: string
                    evidence_text: string
                    source_label: string
                    signal_date: string
                    confidence: number
                    extraction_method: string
                }
                Insert: {
                    id?: string
                    company_id: string
                    signal_type: string
                    evidence_text: string
                    source_label: string
                    signal_date: string
                    confidence?: number
                    extraction_method?: string
                }
                Update: {
                    company_id?: string
                    signal_type?: string
                    evidence_text?: string
                    source_label?: string
                    signal_date?: string
                    confidence?: number
                    extraction_method?: string
                }
            }
            recommendations: {
                Row: {
                    id: string
                    user_id: string
                    company_id: string
                    score: number
                    confidence: number
                    explanation_json: ExplanationJson
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    company_id: string
                    score: number
                    confidence: number
                    explanation_json: ExplanationJson
                    created_at?: string
                }
                Update: {
                    user_id?: string
                    company_id?: string
                    score?: number
                    confidence?: number
                    explanation_json?: ExplanationJson
                    created_at?: string
                }
            }
        }
    }
}

export interface ExplanationJson {
    reasons: string[]
    matched_fields: {
        industries?: string[]
        size_bands?: string[]
        personas?: string[]
    }
    scoring_breakdown: {
        base_fit: number
        signal_boost: number
        semantic_similarity: number
        total_score: number
    }
    pitch_angle?: string
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Company = Database['public']['Tables']['companies']['Row']
export type Signal = Database['public']['Tables']['signals']['Row']
export type Recommendation = Database['public']['Tables']['recommendations']['Row']

export interface CompanyWithSignals extends Company {
    signals: Signal[]
}

export interface RecommendationWithCompany extends Recommendation {
    companies: Company
}
