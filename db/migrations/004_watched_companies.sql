-- Add watched_companies table for users to track companies they're interested in
CREATE TABLE IF NOT EXISTS watched_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  notes TEXT,
  UNIQUE(user_id, company_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_watched_companies_user_id ON watched_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_watched_companies_company_id ON watched_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_watched_companies_added_at ON watched_companies(added_at DESC);

-- Enable Row Level Security
ALTER TABLE watched_companies ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see/manage their own watched companies
CREATE POLICY "Users can view their watched companies"
  ON watched_companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add watched companies"
  ON watched_companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their watched companies"
  ON watched_companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove watched companies"
  ON watched_companies FOR DELETE
  USING (auth.uid() = user_id);
