const { onRequest } = require('firebase-functions/v2/https');
const { onRequest: onExpressRequest } = require('firebase-functions/v1/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const stripeLib = require('stripe');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const stripeSecret = defineSecret('STRIPE_SECRET_KEY');

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// 🧾 Apple Sign-In Config
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

// 🍎 Apple Sign-In Token Exchange
exports.exchangeAppleToken = onRequest({ region: 'us-central1' }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST');
  if (req.method === 'OPTIONS') return res.status(204).send();

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
    res.status(500).json({ error: 'Token exchange failed', details: err.response?.data || 'Unknown error' });
  }
});

// 💳 Create Stripe Checkout Session
exports.createCheckoutSession = onRequest({ cors: true, secrets: [stripeSecret] }, async (req, res) => {
  const stripe = stripeLib(stripeSecret.value());
  const { amount, userId } = req.body;

  if (!amount || !userId) {
    return res.status(400).json({ error: 'Amount and userId are required' });
  }

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
      success_url: `https://rafflefox.netlify.app/topup`,
      cancel_url: `https://rafflefox.netlify.app/topup`,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe session error:', error);
    res.status(500).json({ error: 'Failed to create Stripe Checkout Session' });
  }
});

// ✅ Stripe Webhook
const webhookApp = express();
webhookApp.use(bodyParser.raw({ type: 'application/json' }));

webhookApp.post('/stripe-webhook', async (req, res) => {
  const stripe = stripeLib(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('✅ Stripe webhook verified');
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const amount = parseFloat(session.metadata?.amount);

    if (!userId || !amount) {
      console.warn('Missing metadata in Stripe session');
      return res.status(400).send('Missing metadata');
    }

    const coins = Math.floor(amount / 10);
    try {
      // Add to topups
      await db.collection('topups').add({
        userId,
        amount,
        coins,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update user credits
      await db.collection('users').doc(userId).update({
        credits: admin.firestore.FieldValue.increment(coins),
      });

      console.log(`✅ ${coins} coins added to user ${userId}`);
    } catch (err) {
      console.error('❌ Firestore update failed:', err.message);
      return res.status(500).send('Firestore error');
    }
  }

  res.status(200).send('Webhook received');
});

exports.stripeWebhook = onExpressRequest(webhookApp);
