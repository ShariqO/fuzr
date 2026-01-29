import { z } from 'zod'

export const ProfileSchema = z.object({
    full_name: z.string().min(1, 'Full name is required'),
    role: z.string().min(1, 'Role is required'),
    region: z.string().default('UK'),
    selling_category: z.string().min(1, 'Selling category is required'),
    selling_description: z.string().min(10, 'Please provide at least 10 characters'),
    target_industries: z.array(z.string()).min(1, 'Select at least one industry'),
    target_size_band: z.array(z.string()).min(1, 'Select at least one size band'),
    typical_buyer_personas: z.array(z.string()).min(1, 'Select at least one buyer persona'),
    deal_size_min: z.number().nullable().optional(),
    deal_size_max: z.number().nullable().optional(),
    // Employment status fields
    employment_status: z.string().optional(),
    employer_company_name: z.string().optional(),
    employer_position: z.string().optional(),
})

export type ProfileFormData = z.infer<typeof ProfileSchema>

export const EMPLOYMENT_STATUSES = [
    'Self-Employed',
    'Employed',
    'Freelancer',
    'Business Owner',
    'Contractor',
    'Looking for work',
] as const

export const SELLING_CATEGORIES = [
    'CRM',
    'Data/AI',
    'Cybersecurity',
    'Cloud',
    'DevOps',
    'FinTech',
    'HRTech',
    'MarTech',
    'Other',
] as const

export const INDUSTRIES = [
    'Technology',
    'Financial Services',
    'Healthcare',
    'Retail',
    'Manufacturing',
    'Professional Services',
    'Education',
    'Media & Entertainment',
    'Real Estate',
    'Energy',
    'Transportation',
    'Telecommunications',
    'Government',
    'Non-Profit',
] as const

export const SIZE_BANDS = [
    'Any',
    '1-50',
    '51-200',
    '201-1000',
    '1001-5000',
    '5000+',
] as const

export const BUYER_PERSONAS = [
    'CTO',
    'CIO',
    'CISO',
    'Head of Data',
    'RevOps',
    'VP Eng',
    'Finance',
    'HR',
] as const

export const ROLES = [
    'Sales Manager',
    'AE',
    'RevOps',
    'Other',
] as const

