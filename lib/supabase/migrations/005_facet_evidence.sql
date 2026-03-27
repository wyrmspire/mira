-- lib/supabase/migrations/005_facet_evidence.sql
-- Add an evidence column to the profile_facets table to explain why AI extracted a facet.

ALTER TABLE public.profile_facets 
ADD COLUMN IF NOT EXISTS evidence text;

COMMENT ON COLUMN public.profile_facets.evidence IS 'AI-generated justification or evidence for why this facet was extracted.';
