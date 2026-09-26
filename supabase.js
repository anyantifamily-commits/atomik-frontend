import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://acuzqoorbhfolmjycziu.supabase.co"
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7AGjx-Nrsig5YYvcir7vFQ_f__2jlkn";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    }
);