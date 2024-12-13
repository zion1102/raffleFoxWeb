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
    const response = await axios.post('https://appleid.apple.com/auth/token', null, {
      params: {
        client_id: 'com.example.raffle-Fox', // Replace with your Service ID
        client_secret: 'YOUR_GENERATED_APPLE_SECRET', // Replace with your generated client secret
        code: code,
        grant_type: 'authorization_code',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    res.json(response.data); // Send the response back to the frontend
  } catch (error) {
    console.error(
      'Error during token exchange:',
      error.response ? error.response.data : error.message,
    );
    res.status(500).json({ error: 'Token exchange failed' });
  }
});
