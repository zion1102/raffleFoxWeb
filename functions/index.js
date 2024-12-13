const functions = require('firebase-functions');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Replace with your actual values
const TEAM_ID = 'Y5N3U7CU4N'; // Your Apple Developer Team ID
const KEY_ID = '3VG9HSG4ZZ'; // Your Key ID from Apple Developer Portal
const CLIENT_ID = 'com.example.raffle-Fox.service'; // Your Service ID

// Path to your private key file downloaded from Apple Developer
const PRIVATE_KEY_PATH = '/Users/zionhenry/dev_folder/raffleFoxWeb/AuthKey_3VG9HSG4ZZ.p8';

/**
 * Generates a client secret for Apple Sign-In using JWT.
 * @return {string} The signed client secret.
 */
function generateClientSecret() {
  try {
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

    const payload = {
      iss: TEAM_ID,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15777000, // 6 months validity
      aud: 'https://appleid.apple.com',
      sub: CLIENT_ID,
    };

    return jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      keyid: KEY_ID,
    });
  } catch (error) {
    console.error('Error generating client secret:', error);
    throw new Error('Failed to generate client secret.');
  }
}

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
    console.error('Missing authorization code in request body.');
    res.status(400).json({ error: 'Authorization code is required' });
    return;
  }

  try {
    const clientSecret = generateClientSecret();
    console.log('Generated client secret:', clientSecret);

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
      },
    );

    console.log('Response from Apple:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Error during token exchange:', {
      message: error.message,
      response: error.response ? error.response.data : 'No response data',
    });
    res.status(500).json({ error: 'Token exchange failed' });
  }
});
