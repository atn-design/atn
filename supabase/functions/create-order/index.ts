// Team Top Nutrition — Edge Function: create-order (Fase 1, sin pagos todavía)
// Recibe los datos del modal de inscripción, guarda cliente + orden en Supabase.
// Deploy: supabase functions deploy create-order

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { nombre, email, whatsapp, plan_code, first_source } = await req.json();

    if (!nombre || !whatsapp || !plan_code) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('code, is_free, price_clp, price_usd')
      .eq('code', plan_code)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: 'Plan no encontrado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert de cliente por whatsapp_phone (dedupe natural: mismo número = mismo cliente)
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .upsert(
        {
          full_name: nombre,
          email: email || null,
          whatsapp_phone: whatsapp,
          first_source: first_source || 'programas_cta',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'whatsapp_phone' },
      )
      .select('id')
      .single();

    if (customerError || !customer) {
      throw customerError ?? new Error('No se pudo crear/actualizar el cliente');
    }

    // Fase 1: sin pasarela de pago todavía — el gratuito queda 'paid' de una vez,
    // los planes pagos quedan 'pending' hasta que existan Flow/PayPal (Fase 2/3).
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_id: customer.id,
        plan_code,
        payment_provider: 'none',
        status: plan.is_free ? 'paid' : 'pending',
        paid_at: plan.is_free ? new Date().toISOString() : null,
      })
      .select('id, status')
      .single();

    if (orderError || !order) {
      throw orderError ?? new Error('No se pudo crear la orden');
    }

    return new Response(JSON.stringify({ ok: true, order_id: order.id, status: order.status }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
