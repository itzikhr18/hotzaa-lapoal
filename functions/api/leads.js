/**
 * Lead collection is intentionally disabled.
 *
 * The endpoint does not read or retain the request body and does not forward
 * data to email, automation services, CRMs, lawyers, or any other third party.
 * A future lead flow must be implemented with an explicit opt-in, an approved
 * privacy notice, a written partner agreement, and abuse protection.
 */

function disabledResponse() {
  return new Response(JSON.stringify({
    error: 'טופס הפנייה אינו פעיל כרגע.',
    code: 'LEADS_DISABLED',
  }), {
    status: 503,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Allow': 'POST, OPTIONS',
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { 'Allow': 'POST, OPTIONS' },
  });
}

export async function onRequestPost() {
  return disabledResponse();
}

export async function onRequest() {
  return disabledResponse();
}
