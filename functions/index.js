const { onRequest } = require('firebase-functions/v2/https');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Apple Sign-In Configuration
const TEAM_ID = 'Y5N3U7CU4N';
const KEY_ID = '3VG9HSG4ZZ';
const CLIENT_ID = 'com.example.raffle-Fox.service';

const privateKey = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgHdU4A3xoFSP/ajcx
6pjM3j3cR8fSRVy2bh1uxXQyZXmgCgYIKoZIzj0DAQehRANCAAQu9eSZIX+nFyjg
t6MaKwNMCWnsgSmiwm3SOKbtxWGpxX8cPGpMp1u6AF0REic88WtDZb3aaCpxR7QJ
zQvX5W1k
-----END PRIVATE KEY-----`;

// Apple: Generate Client Secret
function generateClientSecret() {
  const payload = {
    iss: TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15777000, // ~6 months
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID,
  };

  return jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    keyid: KEY_ID,
  });
}

// Apple Token Exchange Function
exports.exchangeAppleToken = onRequest({ region: 'us-central1' }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  try {
    const clientSecret = generateClientSecret();

    const response = await axios.post(
      'https://appleid.apple.com/auth/token',
      null,
      {
        params: {
          client_id: CLIENT_ID,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Apple exchange error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Token exchange failed',
      details: error.response?.data || 'Unknown error',
    });
  }
});

// ✅ Import Stripe handler from stripe.js
exports.createCheckoutSession = require('./stripe').createCheckoutSession;
