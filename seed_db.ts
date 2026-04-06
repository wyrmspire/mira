import { getSupabaseClient } from './lib/supabase/client';
import { DEFAULT_USER_ID, DEFAULT_TEMPLATE_IDS } from './lib/constants';

async function seed() {
  const supabase = getSupabaseClient();
  
  // 1. Insert default user
  const { error: userError } = await supabase!.from('users').upsert({
    id: DEFAULT_USER_ID,
    email: 'dev@maddyup.com'
  });
  if (userError) console.error('User seed error:', userError);
  else console.log('User seeded');

  // 2. Insert default workspace
  const { data: wsData, error: wsError } = await supabase!.from('workspaces').upsert({
    id: DEFAULT_USER_ID,
    name: 'Default Workspace'
  }).select().single();
  if (wsError) console.error('Workspace seed error:', wsError);
  else console.log('Workspace seeded:', wsData);

  // 3. Insert default templates
  for (const [key, id] of Object.entries(DEFAULT_TEMPLATE_IDS)) {
    const { error: tmplError } = await supabase!.from('experience_templates').upsert({
      id: id,
      slug: key,
      name: key,
      class: key,
      renderer_type: key
    });
    if (tmplError) console.error(`Template ${key} seed error:`, tmplError);
  }
  console.log('Templates seeded');
}

seed().catch(console.error);
