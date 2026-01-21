-- Migration: Add vector support and live data columns
-- Run this in your Supabase SQL Editor

-- Enable pgvector extension (Supabase has this pre-installed)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to companies (1536 dimensions for OpenAI text-embedding-3-small)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add embedding column to profiles for semantic matching
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selling_embedding vector(1536);

-- Add data source tracking to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'mock';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_number TEXT; -- Companies House number
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sic_codes TEXT[]; -- Industry classification codes
ALTER TABLE companies ADD COLUMN IF NOT EXISTS incorporation_date DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMP WITH TIME ZONE;

-- Add confidence and source tracking to signals
ALTER TABLE signals ADD COLUMN IF NOT EXISTS confidence REAL DEFAULT 1.0; -- 0-1 confidence score
ALTER TABLE signals ADD COLUMN IF NOT EXISTS extraction_method TEXT DEFAULT 'manual'; -- manual, ai_extracted, api

-- Create vector similarity index for fast searches
CREATE INDEX IF NOT EXISTS idx_companies_embedding ON companies 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_profiles_embedding ON profiles 
  USING ivfflat (selling_embedding vector_cosine_ops)
  WITH (lists = 100);

-- Add index for company number lookups
CREATE INDEX IF NOT EXISTS idx_companies_company_number ON companies(company_number);

-- Add index for data source filtering
CREATE INDEX IF NOT EXISTS idx_companies_data_source ON companies(data_source);
