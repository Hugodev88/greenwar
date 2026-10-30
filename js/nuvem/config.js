// Configuração pública do Supabase (usada por cloud.js).
// A "publishable key" (sb_publishable_…) é feita para ficar no código do navegador:
// quem protege os dados são as políticas RLS de supabase/migrations/001_init.sql.
// NUNCA coloque aqui a secret key / service_role nem a senha do banco.
export const SUPABASE_URL = "https://yhaeuliejppixxkezspf.supabase.co";
export const SUPABASE_KEY = "sb_publishable_eapsNH7VDyMcDBwrC6PN6Q_STbV0n5w";

export const FEATURES = {
  // Botão "Entrar com Google": só ligue depois de ativar o provedor Google em
  // Supabase → Authentication → Sign In / Providers → Google.
  googleLogin: false,
};
