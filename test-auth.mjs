import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  throw new Error('Manque SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
}

// client “service role” pour tester côté serveur
const supabase = createClient(url, service);

// on crée un user de test (confirmé), donc il doit apparaître directement dans Auth → Users
const email = `test+${Date.now()}@example.com`;
const password = 'FaceUpTest!123';

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

console.log({ createdUserId: data?.user?.id, email, error });