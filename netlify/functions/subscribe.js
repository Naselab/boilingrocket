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

  const { email, group } = body;
  if (!email || !email.includes('@')) {
    return { statusCode: 400, body: 'Invalid email' };
  }

  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'Server misconfiguration' };
  }

  try {
    const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        email,
        groups: [group || '185394129199433480']
      })
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
