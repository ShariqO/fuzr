-- Quick fix: Allow inserts to companies and signals tables
-- Run this in your Supabase SQL Editor first

CREATE POLICY "Allow insert for companies" 
  ON companies FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow insert for signals" 
  ON signals FOR INSERT 
  WITH CHECK (true);
