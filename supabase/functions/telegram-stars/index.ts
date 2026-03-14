// ============================================
// BASEMENT TYCOON — Telegram Stars Edge Function
//
// Creates a Telegram Stars (XTR) invoice link for the
// "2× Boost" purchase inside the Mini App.
//
// Flow:
//   1. Client calls this function (authenticated with Supabase anon key)
//   2. Function calls Telegram Bot API: createInvoiceLink
//      with currency=XTR and prices=[{label, amount}]
//   3. Returns the invoice link URL to the client
//   4. Client opens it via window.Telegram.WebApp.openInvoice(url, cb)
//   5. On cb('paid'), client activates the boost locally
//
// Required Supabase Edge Function secrets:
//   TELEGRAM_BOT_TOKEN  — from @BotFather
//
// Stars invoices do NOT require a payment provider token.
// The bot must have /setpayments enabled via @BotFather
// (choose "Telegram Stars" as the payment provider).
// ============================================

import { corsHeaders } from '../_shared/cors.ts';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Price in Stars (XTR). 1 Star ≈ $0.013 USD at current rate.
// 50 Stars ≈ $0.65 — fair price for a 2-hour 2× boost.
const BOOST_STARS_PRICE = 2;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!TELEGRAM_BOT_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // Create a Telegram Stars invoice link via Bot API
    const resp = await fetch(`${TELEGRAM_API}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '2× Income Boost',
        description: 'Double your income for 2 hours in Basement Tycoon!',
        payload: 'boost_2h',
        currency: 'XTR',          // Telegram Stars currency code
        prices: [{ label: '2× Boost (2h)', amount: BOOST_STARS_PRICE }],
        // provider_token is intentionally omitted for Stars payments
      }),
    });

    const data = await resp.json();

    if (!data.ok || !data.result) {
      console.error('[telegram-stars] createInvoiceLink failed:', data);
      return new Response(
        JSON.stringify({ error: data.description ?? 'Failed to create invoice' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ invoice_url: data.result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[telegram-stars]', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
