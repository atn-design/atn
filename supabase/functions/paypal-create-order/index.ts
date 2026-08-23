// Andrea Top Nutrition — Edge Function: paypal-create-order (Fase 2, Sandbox)
// Recibe los datos del modal de inscripción para un plan pagado, crea la orden
// en Supabase (status='pending', payment_provider='paypal') y crea la orden
// equivalente en PayPal (Orders API v2). Devuelve el paypal_order_id para que
// el botón de PayPal en el navegador pueda completar el pago (onApprove → capture).
// Deploy: supabase functions deploy paypal-create-order
// Secrets requeridos: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE ('sandbox' | 'live')

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Precios en USD (fijos acá, del lado del servidor, para que nadie pueda pagar
// menos manipulando el navegador). Deben reflejar lo que se muestra en index.html.
const PLAN_PRICES_USD: Record<string, { amount: number; name: string }> = {
  'reset-7d': { amount: 29, name: 'Reset Metabólico 7 Días' },
  'perdida-peso': { amount: 59, name: 'Transformación Integral (45 Días)' },
  'recomposicion': { amount: 39, name: 'Vitalidad Constante (90 Días)' },
  'combo-t2-t3': { amount: 98, name: 'Combo Transforma + Consolida (Reset 7D de regalo)' },
  'evaluacion-1a1': { amount: 49, name: 'Evaluación Metabólica Estratégica' },
};

function paypalApiBase() {
  const mode = Deno.env.get('PAYPAL_MODE') ?? 'sandbox';
  return mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

async function getPaypalAccessToken() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID')!;
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')!;
  const auth = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`No se pudo obtener el access token de PayPal: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

async function createPaypalOrder(accessToken: string, amount: number, planName: string) {
  const res = await fetch(`${paypalApiBase()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: planName,
          amount: { currency_code: 'USD', value: amount.toFixed(2) },
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`No se pudo crear la orden en PayPal: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { nombre, email, whatsapp, plan_code } = await req.json();

    if (!nombre || !whatsapp || !plan_code) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plan = PLAN_PRICES_USD[plan_code];
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Plan no válido para pago con PayPal' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .upsert(
        {
          full_name: nombre,
          email: email || null,
          whatsapp_phone: whatsapp,
          first_source: 'programas_cta',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'whatsapp_phone' },
      )
      .select('id')
      .single();

    if (customerError || !customer) {
      throw customerError ?? new Error('No se pudo crear/actualizar el cliente');
    }

    const accessToken = await getPaypalAccessToken();
    const paypalOrder = await createPaypalOrder(accessToken, plan.amount, plan.name);

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_id: customer.id,
        plan_code,
        currency: 'USD',
        amount: plan.amount,
        payment_provider: 'paypal',
        provider_order_id: paypalOrder.id,
        status: 'pending',
      })
      .select('id')
      .single();

    if (orderError || !order) {
      throw orderError ?? new Error('No se pudo crear la orden');
    }

    return new Response(JSON.stringify({ ok: true, paypal_order_id: paypalOrder.id, order_id: order.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
