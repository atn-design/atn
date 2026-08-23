// Andrea Top Nutrition — Edge Function: paypal-capture-order (Fase 2, Sandbox)
// Se llama desde el navegador cuando el comprador aprueba el pago en el botón de
// PayPal (onApprove). Captura el pago del lado del servidor (nunca confiar en el
// navegador para esto), marca la orden como 'paid' en Supabase y notifica a Andrea.
// Deploy: supabase functions deploy paypal-capture-order
// Secrets requeridos: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE, GMAIL_APP_PASSWORD

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GMAIL_ADDRESS = 'soporte.wattaia@gmail.com';
const NOTIFICATION_EMAIL = 'soporte.wattaia@gmail.com';
const SITE_URL = 'https://atn-design.github.io/atn';

const PLAN_NAMES: Record<string, string> = {
  'reset-7d': 'Reset Metabólico 7 Días',
  'perdida-peso': 'Transformación Integral (45 Días)',
  'recomposicion': 'Vitalidad Constante (90 Días)',
  'combo-t2-t3': 'Combo Transforma + Consolida (Reset 7D de regalo)',
  'evaluacion-1a1': 'Evaluación Metabólica Estratégica',
};

function toPlainAscii(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x00-\x7F]/g, '');
}

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

async function capturePaypalOrder(accessToken: string, paypalOrderId: string) {
  const res = await fetch(`${paypalApiBase()}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`No se pudo capturar el pago en PayPal: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

function buildSmtpClient() {
  const appPassword = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!appPassword) return null;
  return new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: GMAIL_ADDRESS, password: appPassword },
    },
  });
}

// Le avisa a Andrea que se cerró una venta real (con quién, qué plan y cuánto pagó).
async function sendPaidNotificationToAndrea(planName: string, amount: number, customerName: string, whatsapp: string, email: string) {
  const client = buildSmtpClient();
  if (!client) {
    console.warn('GMAIL_APP_PASSWORD no configurado — se omite el envío de correo a Andrea.');
    return;
  }

  try {
    await client.send({
      from: `Andrea Top Nutrition <${GMAIL_ADDRESS}>`,
      to: NOTIFICATION_EMAIL,
      subject: toPlainAscii(`Pago confirmado con PayPal: ${planName}`),
      content: 'auto',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
          <p style="font-size:18px; font-weight:bold; margin-bottom:16px;">💰 Pago confirmado con PayPal</p>
          <p><strong>Nombre:</strong> ${customerName}</p>
          <p><strong>WhatsApp:</strong> ${whatsapp}</p>
          <p><strong>Correo:</strong> ${email || '(no dejó correo)'}</p>
          <p><strong>Plan:</strong> ${planName}</p>
          <p><strong>Monto:</strong> $${amount} USD</p>
          <p style="margin-top:20px;"><a href="${SITE_URL}/admin.html">Ver en el panel de clientes</a></p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Error enviando correo de notificación a Andrea:', err);
  } finally {
    await client.close();
  }
}

// Le confirma al cliente que su pago se procesó correctamente.
async function sendPaidConfirmationToCustomer(customerEmail: string, customerName: string, planName: string, amount: number) {
  if (!customerEmail) return; // el WhatsApp es obligatorio en el formulario, el correo no.

  const client = buildSmtpClient();
  if (!client) {
    console.warn('GMAIL_APP_PASSWORD no configurado — se omite el envío de correo al cliente.');
    return;
  }

  try {
    await client.send({
      from: `Andrea Top Nutrition <${GMAIL_ADDRESS}>`,
      to: customerEmail,
      subject: toPlainAscii(`Pago confirmado: ${planName}`),
      content: 'auto',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
          <h2 style="color:#0B0B0D;">Hola ${customerName || ''} 👋</h2>
          <p>Confirmamos tu pago de <strong>$${amount} USD</strong> por <strong>${planName}</strong>.</p>
          <p>Andrea ya fue notificada y te va a escribir por WhatsApp para arrancar tu programa.</p>
          <p>Cualquier duda, escribinos directo por WhatsApp — con gusto te acompañamos.</p>
          <p>— Andrea, Andrea Top Nutrition</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Error enviando correo de confirmación al cliente:', err);
  } finally {
    await client.close();
  }
}

function backgroundTask(promise: Promise<unknown>) {
  // deno-lint-ignore no-explicit-any
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime?.waitUntil) {
    runtime.waitUntil(promise);
    return Promise.resolve();
  }
  return promise;
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
    const { paypal_order_id } = await req.json();
    if (!paypal_order_id) {
      return new Response(JSON.stringify({ error: 'Falta paypal_order_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: order, error: orderLookupError } = await supabaseAdmin
      .from('orders')
      .select('id, plan_code, amount, customer_id, customers(full_name, whatsapp_phone, email)')
      .eq('provider_order_id', paypal_order_id)
      .single();

    if (orderLookupError || !order) {
      throw orderLookupError ?? new Error('Orden no encontrada para ese paypal_order_id');
    }

    const accessToken = await getPaypalAccessToken();
    const capture = await capturePaypalOrder(accessToken, paypal_order_id);

    if (capture.status !== 'COMPLETED') {
      return new Response(JSON.stringify({ ok: false, status: capture.status }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabaseAdmin
      .from('orders')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', order.id);

    await supabaseAdmin.from('payment_events').insert({
      order_id: order.id,
      provider: 'paypal',
      event_type: 'CAPTURE_COMPLETED',
      raw_payload: capture,
    });

    // deno-lint-ignore no-explicit-any
    const customer = order.customers as any;
    const planName = PLAN_NAMES[order.plan_code] ?? order.plan_code;
    await backgroundTask(
      sendPaidNotificationToAndrea(planName, order.amount, customer?.full_name ?? '', customer?.whatsapp_phone ?? '', customer?.email ?? ''),
    );
    await backgroundTask(
      sendPaidConfirmationToCustomer(customer?.email ?? '', customer?.full_name ?? '', planName, order.amount),
    );

    return new Response(JSON.stringify({ ok: true, status: 'paid' }), {
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
