// Netlify serverless function — keeps MailerLite API key off the client
// Deploy this file at: netlify/functions/subscribe.js
// Set MAILERLITE_API_KEY in your Netlify site → Environment Variables

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { email, group, first_video } = body;
  if (!email || !email.includes('@')) {
    return { statusCode: 400, body: 'Invalid email' };
  }

  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'Server misconfiguration' };
  }

  // Grab IP from Netlify/CDN headers
  const ip = event.headers['x-forwarded-for']?.split(',')[0].trim()
           || event.headers['client-ip']
           || null;

  // Geo-lookup using free ip-api.com (no API key needed, 45 req/min limit)
  let city = null, country = null, timezone = null;
  if (ip) {
    try {
      const geo = await fetch(`http://ip-api.com/json/${ip}?fields=city,country,timezone,status`);
      const geoData = await geo.json();
      if (geoData.status === 'success') {
        city     = geoData.city     || null;
        country  = geoData.country  || null;
        timezone = geoData.timezone || null;
      }
    } catch {
      // geo lookup failed — continue without it
    }
  }

  const payload = {
    email,
    groups: [group || '185394129199433480'],
    fields: {
      ...(first_video && { first_video }),
      ...(ip          && { signup_ip: ip }),
      ...(city        && { city }),
      ...(country     && { country }),
    },
    ...(timezone && { timezone }),
    ip_address: ip || undefined
  };

  try {
    const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id: data?.data?.id })
    };
  } catch (err) {
    return { statusCode: 500, body: 'Subscription failed' };
  }
};
