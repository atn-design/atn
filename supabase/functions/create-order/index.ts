// Team Top Nutrition — Edge Function: create-order (Fase 1, sin pagos todavía)
// Recibe los datos del modal de inscripción, guarda cliente + orden en Supabase,
// y (solo para el Protocolo Gratis) manda el ebook por correo automático vía Gmail SMTP.
// Deploy: supabase functions deploy create-order
// Secret requerido: GMAIL_APP_PASSWORD (Google Account → Seguridad → Contraseñas de aplicaciones)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TODO: cambiar a contactoandreatopnutrition@gmail.com apenas se tenga esa contraseña de aplicación.
const GMAIL_ADDRESS = 'soporte.wattaia@gmail.com';
// Notificaciones internas (nueva compra del Plan 1 / nueva anotación en lista de espera).
// Por ahora es la misma cuenta que envía — se puede separar el día que Andrea tenga la suya.
const NOTIFICATION_EMAIL = 'soporte.wattaia@gmail.com';
// TODO: actualizar si el sitio se muda a un dominio propio.
const SITE_URL = 'https://contactoandreatopnutrition-design.github.io/pagina-andrea-top-nutrition';

async function sendEmail(to: string, subject: string, html: string) {
  const appPassword = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!appPassword) {
    console.warn('GMAIL_APP_PASSWORD no configurado — se omite el envío de correo.');
    return;
  }

  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: GMAIL_ADDRESS, password: appPassword },
    },
  });

  try {
    await client.send({ from: `Team Top Nutrition <${GMAIL_ADDRESS}>`, to, subject, content: 'auto', html });
  } catch (err) {
    console.error(`Error enviando correo a ${to}:`, err);
  } finally {
    await client.close();
  }
}

function sendEbookEmail(toEmail: string, toName: string) {
  return sendEmail(
    toEmail,
    'Tu Protocolo de Desinflamación Express (72h) 🌿',
    `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
        <h2 style="color:#0B0B0D;">Hola ${toName || ''} 👋</h2>
        <p>Aquí tienes tu <strong>Protocolo de Desinflamación Express (72h)</strong> — un respiro real para tu cuerpo.</p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${SITE_URL}/ebook.html" style="background:#ECEF00; color:#000; font-weight:bold; text-decoration:none; padding:14px 28px; border-radius:10px; display:inline-block;">Abrir mi Protocolo</a>
        </p>
        <p>Cualquier duda, escríbeme directo por WhatsApp — con gusto te acompaño.</p>
        <p>— Andrea, Team Top Nutrition</p>
      </div>
    `,
  );
}

function sendNotificationEmail(kind: 'compra' | 'waitlist', planName: string, customerName: string, whatsapp: string, email: string) {
  const subject = kind === 'compra'
    ? `🛒 Nueva inscripción: ${planName}`
    : `🔔 Nueva anotación en lista de espera: ${planName}`;
  return sendEmail(
    NOTIFICATION_EMAIL,
    subject,
    `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
        <h2>${subject}</h2>
        <p><strong>Nombre:</strong> ${customerName}</p>
        <p><strong>WhatsApp:</strong> ${whatsapp}</p>
        <p><strong>Correo:</strong> ${email || '(no dejó correo)'}</p>
        <p><strong>Plan:</strong> ${planName}</p>
        <p style="margin-top:20px;"><a href="${SITE_URL}/admin.html">Ver en el panel de clientes</a></p>
      </div>
    `,
  );
}

// Deja viva la función en segundo plano lo necesario para terminar de mandar el correo,
// sin retrasar la respuesta al navegador (si no, Deno la mataría antes de que termine).
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
    const { nombre, email, whatsapp, plan_code, first_source, is_waitlist } = await req.json();

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
      .select('code, name, is_free, price_clp, price_usd')
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
    // los planes "Próximamente" (waitlist) quedan 'waitlist', y el resto 'pending'
    // hasta que existan Flow/PayPal (Fase 2/3).
    const status = is_waitlist ? 'waitlist' : plan.is_free ? 'paid' : 'pending';
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_id: customer.id,
        plan_code,
        payment_provider: 'none',
        status,
        paid_at: status === 'paid' ? new Date().toISOString() : null,
      })
      .select('id, status')
      .single();

    if (orderError || !order) {
      throw orderError ?? new Error('No se pudo crear la orden');
    }

    if (plan_code === 'protocolo-gratis' && email) {
      await backgroundTask(sendEbookEmail(email, nombre));
    } else if (status === 'waitlist') {
      await backgroundTask(sendNotificationEmail('waitlist', plan.name, nombre, whatsapp, email));
    } else if (plan_code === 'reset-7d' && status === 'pending') {
      await backgroundTask(sendNotificationEmail('compra', plan.name, nombre, whatsapp, email));
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
