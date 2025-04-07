const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const jwt = require('jsonwebtoken');

admin.initializeApp();

// Apple Sign-In Config
const TEAM_ID = 'Y5N3U7CU4N'; // Apple Developer Team ID
const KEY_ID = '3VG9HSG4ZZ'; // Apple Key ID
const CLIENT_ID = 'com.example.raffle-Fox.service'; // Apple Service ID (Client ID)

const privateKey = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgHdU4A3xoFSP/ajcx
6pjM3j3cR8fSRVy2bh1uxXQyZXmgCgYIKoZIzj0DAQehRANCAAQu9eSZIX+nFyjg
t6MaKwNMCWnsgSmiwm3SOKbtxWGpxX8cPGpMp1u6AF0REic88WtDZb3aaCpxR7QJ
zQvX5W1k
-----END PRIVATE KEY-----`;

// Generate JWT for Apple token exchange
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

// Exchange Apple auth code for tokens
exports.exchangeAppleToken = functions.https.onRequest(async (req, res) => {
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
    const clientSecret = generateClientSecret();

    const response = await axios.post(
      'https://appleid.apple.com/auth/token',
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { id_token } = response.data;

    if (!id_token) {
      res.status(500).json({ error: 'No ID token returned from Apple' });
      return;
    }

    res.json({ id_token });
  } catch (error) {
    console.error('Error exchanging Apple token:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Token exchange failed',
      details: error.response?.data || error.message,
    });
  }
});

// Firebase Custom Token Generation
exports.getCustomToken = functions.https.onCall(async (data, context) => {
  const { uid } = data;

  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'User ID (uid) is required');
  }

  try {
    const customToken = await admin.auth().createCustomToken(uid);
    return { token: customToken };
  } catch (err) {
    console.error('Error creating custom token:', err);
    throw new functions.https.HttpsError('internal', 'Custom token generation failed');
  }
});
