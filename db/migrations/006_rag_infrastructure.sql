-- Migration: Add RAG infrastructure
-- Adds signal embeddings and vector similarity search functions
-- Run this in your Supabase SQL Editor

-- ============================================================
-- 1. Add embedding column to signals table
-- ============================================================
ALTER TABLE signals ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create ivfflat cosine similarity index for fast vector search
CREATE INDEX IF NOT EXISTS idx_signals_embedding ON signals
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- 2. RPC: match_signals
-- Finds signals semantically similar to a query embedding
-- Optionally filtered by company_id
-- ============================================================
CREATE OR REPLACE FUNCTION match_signals(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_company_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  signal_type text,
  evidence_text text,
  confidence real,
  signal_date date,
  source_label text,
  extraction_method text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.company_id,
    s.signal_type,
    s.evidence_text,
    s.confidence,
    s.signal_date,
    s.source_label,
    s.extraction_method,
    1 - (s.embedding <=> query_embedding) AS similarity
  FROM signals s
  WHERE
    s.embedding IS NOT NULL
    AND 1 - (s.embedding <=> query_embedding) > match_threshold
    AND (filter_company_id IS NULL OR s.company_id = filter_company_id)
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- 3. RPC: match_companies
-- Finds companies semantically similar to a query embedding
-- ============================================================
CREATE OR REPLACE FUNCTION match_companies(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  industry text,
  description text,
  website text,
  size_band text,
  location_uk text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.industry,
    c.description,
    c.website,
    c.size_band,
    c.location_uk,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM companies c
  WHERE
    c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- 4. RPC: match_signals_cross_company
-- Finds similar signals across ALL companies (for pattern detection)
-- Excludes a specific company to find patterns in OTHER companies
-- ============================================================
CREATE OR REPLACE FUNCTION match_signals_cross_company(
  query_embedding vector(1536),
  exclude_company_id uuid,
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  company_name text,
  signal_type text,
  evidence_text text,
  confidence real,
  signal_date date,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.company_id,
    c.name AS company_name,
    s.signal_type,
    s.evidence_text,
    s.confidence,
    s.signal_date,
    1 - (s.embedding <=> query_embedding) AS similarity
  FROM signals s
  JOIN companies c ON c.id = s.company_id
  WHERE
    s.embedding IS NOT NULL
    AND s.company_id != exclude_company_id
    AND 1 - (s.embedding <=> query_embedding) > match_threshold
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
