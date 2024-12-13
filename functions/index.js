const functions = require('firebase-functions');
const axios = require('axios');

exports.exchangeAppleToken = functions.https.onRequest(async (req, res) => {
  // Allow CORS requests from your frontend
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: 'Authorization code is required' });
    return;
  }

  try {
    const clientSecret =
      'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Iks3UURGMzNVQTUifQ.' +
      'eyJpc3MiOiJZNU4zVTdDVTROIiwiaWF0IjoxNzM0MTE1NDQxLCJleHAiOjE3MzQyMDE4NDEsIm' +
      'F1ZCI6Imh0dHBzOi8vYXBwbGVpZC5hcHBsZS5jb20iLCJzdWIiOiJjb20uZXhhbXBsZS5yYWZm' +
      'bGUtZm94LnNlcnZpY2UifQ.dLO_Bb5XhyykuBuhtWvB02XQmtrCCRla94K0_S-L3psFvWFQ5Zk' +
      'IvKaNjPQ8emZ8suguCAuJWfVGDmOB2jCP-Q';

    const response = await axios.post('https://appleid.apple.com/auth/token', null, {
      params: {
        client_id: 'com.example.raffle-Fox.service', 
        client_secret: clientSecret, 
        code: code,
        grant_type: 'authorization_code',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error(
      'Error during token exchange:',
      error.response ? error.response.data : error.message,
    );
    res.status(500).json({ error: 'Token exchange failed' });
  }
});
