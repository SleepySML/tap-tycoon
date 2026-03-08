// Shared CORS headers for Supabase Edge Functions.
// Allow requests from the game's web origin and Telegram Mini App context.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
