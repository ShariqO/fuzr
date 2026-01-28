-- Add employment status fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employment_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employer_company_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employer_position TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.employment_status IS 'Employment status: self-employed, employed, freelancer, etc.';
COMMENT ON COLUMN profiles.employer_company_name IS 'Company name if employed';
COMMENT ON COLUMN profiles.employer_position IS 'Job title/position if employed';
