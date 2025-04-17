const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Apple Sign-In Config
const TEAM_ID = 'Y5N3U7CU4N';
const KEY_ID = '3VG9HSG4ZZ';
const CLIENT_ID = 'com.example.raffle-Fox.service';
const privateKey = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgHdU4A3xoFSP/ajcx
6pjM3j3cR8fSRVy2bh1uxXQyZXmgCgYIKoZIzj0DAQehRANCAAQu9eSZIX+nFyjg
t6MaKwNMCWnsgSmiwm3SOKbtxWGpxX8cPGpMp1u6AF0REic88WtDZb3aaCpxR7QJ
zQvX5W1k
-----END PRIVATE KEY-----`;

// 🔐 Generate Apple Client Secret
function generateClientSecret() {
  const payload = {
    iss: TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15777000,
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID,
  };

  return jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    keyid: KEY_ID,
  });
}

// 🍎 Apple Token Exchange
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

// 💳 Stripe Checkout Session Creation
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'YOUR_STRIPE_SECRET_KEY');

exports.createCheckoutSession = onRequest({ cors: true }, async (req, res) => {
  const { amount, userId } = req.body;

  if (!amount || !userId) {
    return res.status(400).json({ error: 'Amount and userId are required' });
  }

  try {
    // ✅ Create Firebase custom token for the user
    const token = await admin.auth().createCustomToken(userId);

    const successUrl = `https://rafflefox.netlify.app/topup-success?amount=${amount}&userId=${userId}&token=${token}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'ttd',
          product_data: { name: `${amount} TTD Gold Coin Top-Up` },
          unit_amount: amount * 100,
        },
        quantity: 1,
      }],
      mode: 'payment',
      metadata: { userId, amount },
      success_url: successUrl,
      cancel_url: `https://rafflefox.netlify.app/topup`,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe session error:', error);
    res.status(500).json({ error: 'Failed to create Stripe Checkout Session' });
  }
});

// ✅ Finalize Top-Up After Successful Payment
exports.topupSuccessHandler = onRequest({ cors: true }, async (req, res) => {
  const { amount, userId } = req.body;

  if (!amount || !userId) {
    return res.status(400).json({ error: 'Missing amount or userId' });
  }

  try {
    const coins = Math.floor(amount / 10); // 10 TTD = 1 coin

    await db.collection('topups').add({
      userId,
      amount,
      coins,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection('users').doc(userId).update({
      credits: admin.firestore.FieldValue.increment(coins),
    });

    res.status(200).json({ success: true, coins });
  } catch (err) {
    console.error('Top-up DB write error:', err);
    res.status(500).json({ error: 'Failed to update Firestore' });
  }
});
