CREATE TABLE IF NOT EXISTS public.change_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  url text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
