/**
 * Cloudflare Pages Function — lead capture for the debt calculator.
 *
 * Path: POST /api/leads
 * Body: {
 *   fullName: string,
 *   phone: string,
 *   debtRange: 'under_50k' | '50k_100k' | 'over_100k',
 *   source?: string,
 *   page?: string,
 *   calculation?: { principal, baseInterest, penaltyTotal, grandTotal },
 *   company?: string
 * }
 *
 * Production delivery:
 * - Email through Resend when RESEND_API_KEY, LEAD_NOTIFY_EMAIL and LEAD_FROM_EMAIL exist.
 * - Optional webhook through LEAD_WEBHOOK_URL for Make/Zapier/CRM.
 */

const ALLOWED_RANGES = {
  under_50k: 'עד 50 אלף',
  '50k_100k': '50-100 אלף',
  over_100k: 'מעל 100 אלף',
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function cleanString(value, max = 200) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function formatILS(value) {
  if (!value && value !== 0) return '-';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

function htmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildLead(body, request) {
  const fullName = cleanString(body.fullName, 80);
  const phone = cleanString(body.phone, 30);
  const normalizedPhone = phone.replace(/[^\d+]/g, '');
  const debtRange = cleanString(body.debtRange, 20);
  const source = cleanString(body.source || 'unknown', 80);
  const page = cleanString(body.page || request.headers.get('referer') || '', 500);
  const calculation = body.calculation && typeof body.calculation === 'object' ? body.calculation : {};

  if (cleanString(body.company, 100)) {
    return { error: 'הבקשה לא התקבלה.', status: 400 };
  }
  if (fullName.length < 2) {
    return { error: 'צריך להזין שם מלא.', status: 400 };
  }
  if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
    return { error: 'צריך להזין מספר טלפון תקין.', status: 400 };
  }
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_RANGES, debtRange)) {
    return { error: 'צריך לבחור גובה חוב מוערך.', status: 400 };
  }

  return {
    lead: {
      fullName,
      phone,
      normalizedPhone,
      debtRange,
      debtRangeLabel: ALLOWED_RANGES[debtRange],
      source,
      page,
      submittedAt: new Date().toISOString(),
      ipCountry: cleanString(request.headers.get('cf-ipcountry') || '', 10),
      calculation: {
        principal: cleanNumber(calculation.principal),
        baseInterest: cleanNumber(calculation.baseInterest),
        penaltyTotal: cleanNumber(calculation.penaltyTotal),
        grandTotal: cleanNumber(calculation.grandTotal),
      },
    },
  };
}

function buildEmail(lead) {
  const rows = [
    ['שם מלא', lead.fullName],
    ['טלפון', lead.phone],
    ['גובה חוב מוערך', lead.debtRangeLabel],
    ['מקור הטופס', lead.source],
    ['עמוד', lead.page],
    ['תאריך שליחה', lead.submittedAt],
    ['קרן מהמחשבון', formatILS(lead.calculation.principal)],
    ['ריבית בסיס', formatILS(lead.calculation.baseInterest)],
    ['דמי פיגורים', formatILS(lead.calculation.penaltyTotal)],
    ['סה"כ משוער', formatILS(lead.calculation.grandTotal)],
  ];

  const htmlRows = rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #dbeafe;font-weight:700;background:#eff6ff;">${htmlEscape(label)}</td>
        <td style="padding:8px 10px;border:1px solid #dbeafe;">${htmlEscape(value)}</td>
      </tr>
    `)
    .join('');

  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <h1 style="font-size:22px;margin:0 0 12px;">ליד חדש מהמחשבון</h1>
      <p style="margin:0 0 16px;">הגיע ליד חדש לבדיקת היתכנות מול עורך דין מהרשת.</p>
      <table style="border-collapse:collapse;width:100%;max-width:680px;">${htmlRows}</table>
      <p style="font-size:12px;color:#6b7280;margin-top:16px;">
        הפרטים נשלחו מטופס באתר hotzaa-lapoal.info. יש לטפל במידע בהתאם למדיניות הפרטיות ולדיני הגנת הפרטיות.
      </p>
    </div>
  `;

  const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  return { html, text };
}

async function sendResendEmail(env, lead) {
  const apiKey = env.RESEND_API_KEY;
  const to = env.LEAD_NOTIFY_EMAIL;
  const from = env.LEAD_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    return { configured: false, ok: false };
  }

  const email = buildEmail(lead);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: to.split(',').map(item => item.trim()).filter(Boolean),
      subject: `ליד חדש מהמחשבון - ${lead.debtRangeLabel}`,
      html: email.html,
      text: email.text,
    }),
  });

  if (!response.ok) {
    return { configured: true, ok: false, status: response.status };
  }

  return { configured: true, ok: true };
}

async function sendWebhook(env, lead) {
  if (!env.LEAD_WEBHOOK_URL) {
    return { configured: false, ok: false };
  }

  const response = await fetch(env.LEAD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'lead.created', lead }),
  });

  return { configured: true, ok: response.ok, status: response.status };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'בקשה לא תקינה.' }, 400);
  }

  const built = buildLead(body || {}, request);
  if (built.error) {
    return json({ error: built.error }, built.status || 400);
  }

  const emailResult = await sendResendEmail(env, built.lead);
  const webhookResult = await sendWebhook(env, built.lead);

  if (emailResult.ok || webhookResult.ok) {
    return json({ ok: true });
  }

  if (!emailResult.configured && !webhookResult.configured) {
    return json({
      error: 'הטופס עדיין לא מחובר למערכת קליטת הלידים. נסה שוב מאוחר יותר.',
      code: 'LEAD_DELIVERY_NOT_CONFIGURED',
    }, 503);
  }

  return json({
    error: 'לא הצלחנו לשלוח את הפרטים כרגע. נסה שוב בעוד כמה דקות.',
    code: 'LEAD_DELIVERY_FAILED',
  }, 502);
}
