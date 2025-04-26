const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const stripeLib = require('stripe');
require('dotenv').config(); // Local environment support

// --- Initialize Firebase Admin SDK ---
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// --- Initialize Stripe ---
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || functions.config().stripe.secret;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe.webhook_secret;
const stripe = stripeLib(STRIPE_SECRET_KEY);

// --- Setup Express app ---
const app = express();

// --- Raw body ONLY for Stripe Webhook ---
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripeWebhook') {
    next(); // Skip bodyParser
  } else {
    bodyParser.json()(req, res, next); // Parse JSON normally
  }
});

// --- Apple Sign-In Private Key Info (Optional if you use Apple Sign-In) ---
const TEAM_ID = 'Y5N3U7CU4N';
const KEY_ID = '3VG9HSG4ZZ';
const CLIENT_ID = 'com.example.raffle-Fox.service';
const privateKey = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgHdU4A3xoFSP/ajcx
6pjM3j3cR8fSRVy2bh1uxXQyZXmgCgYIKoZIzj0DAQehRANCAAQu9eSZIX+nFyjg
t6MaKwNMCWnsgSmiwm3SOKbtxWGpxX8cPGpMp1u6AF0REic88WtDZb3aaCpxR7QJ
zQvX5W1k
-----END PRIVATE KEY-----`;

function generateClientSecret() {
  return jwt.sign({
    iss: TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15777000,
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID,
  }, privateKey, {
    algorithm: 'ES256',
    keyid: KEY_ID,
  });
}

// --- Routes ---

// 🍎 Exchange Apple Token (Optional)
app.post('/api/exchangeAppleToken', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Authorization code is required' });

  try {
    const clientSecret = generateClientSecret();
    const response = await axios.post('https://appleid.apple.com/auth/token', null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    res.json(response.data);
  } catch (err) {
    console.error('Apple exchange error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

// 💳 Create Stripe Checkout Session for Custom Amounts
app.post('/api/createCheckoutSession', async (req, res) => {
  const { amount, userId } = req.body;
  if (!amount || !userId) return res.status(400).json({ error: 'Amount and userId are required' });

  try {
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
      success_url: `https://rafflefox.netlify.app/topup?success=true&amount=${amount}`,
      cancel_url: `https://rafflefox.netlify.app/topup?canceled=true`,
    });

    console.log('✅ Stripe checkout session created:', session.id);
    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('❌ Stripe session creation failed:', error.message);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// 🚀 Stripe Webhook to confirm payment success
app.post('/api/stripeWebhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    console.log('✅ Webhook verified:', event.id);
  } catch (err) {
    console.error('❌ Webhook verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const amount = parseFloat(session.metadata?.amount);

    if (!userId || !amount) {
      console.warn('❌ Missing metadata in session');
      return res.status(400).send('Missing metadata');
    }

    const coins = Math.floor(amount / 10);

    try {
      await db.collection('topups').add({
        userId,
        amount,
        coins,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await db.collection('users').doc(userId).update({
        credits: admin.firestore.FieldValue.increment(coins),
      });

      console.log(`✅ Added ${coins} coins to user ${userId}`);
      return res.status(200).send('Success');
    } catch (err) {
      console.error('❌ Firestore write failed:', err.message);
      return res.status(500).send('Firestore error');
    }
  }

  res.status(200).send('Unhandled event type');
});

// --- Export Express App as a Firebase HTTPS Function ---
exports.api = functions.https.onRequest(app);
