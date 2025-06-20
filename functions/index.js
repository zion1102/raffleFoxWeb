const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const stripeLib = require('stripe');
require('dotenv').config(); // Local environment support
const cors = require('cors');

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
const corsOptions = { origin: true };

// Apply CORS to all routes
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Allow preflight for all routes

// --- Raw body ONLY for Stripe Webhook ---
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripeWebhook') {
    next(); // Skip bodyParser for Stripe raw body
  } else {
    bodyParser.json()(req, res, next); // Use JSON parser for other routes
  }
});

// --- Apple Sign-In Config ---
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

// 🍎 Exchange Apple Token (Fixed CORS)
app.options('/exchangeAppleToken', cors(corsOptions)); // Preflight
app.post('/exchangeAppleToken', cors(corsOptions), async (req, res) => {
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

// 💳 Create Stripe Checkout Session
app.options('/createCheckoutSession', cors(corsOptions));
app.post('/createCheckoutSession', cors(corsOptions), async (req, res) => {
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

// 🚀 Stripe Webhook to confirm payment
app.post('/stripeWebhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
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


// 🤖 Chatbot Route
// 🤖 Chatbot Route (Smart + Logging)
app.options('/chatbot', cors(corsOptions));
app.post('/chatbot', cors(corsOptions), async (req, res) => {
  const { message, context } = req.body;

  if (!message) return res.status(400).json({ error: 'Message is required.' });

  const systemPrompt = `
You are RaffleBot, a helpful AI assistant built into the Raffle Fox app.

📌 Features you can help with:
- Viewing raffles and how to join them
- How to submit guesses
- Coin system (1 guess = coins, coins are bought with real money)
- Top-Up system (TTD payments via Stripe)
- Liked raffles
- Viewing past guesses or results
- What happens when a user wins
- Differences for guest vs logged-in users

🔥 Rules:
- A raffle has a game image where users guess a missing spot.
- The closest guess (within 10px) to the hidden item wins.
- Users can top up coins, view their profile, and edit account info.
- Guests can browse but must log in to play.

Current user status:
- Logged In: ${context?.isLoggedIn ? "Yes" : "No"}
- UID: ${context?.uid || "N/A"}
- Coins: ${context?.coinBalance ?? "Unknown"}

Answer naturally, helpfully, and in a way that’s easy for all users to understand.
`;

  try {
    const openaiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = openaiRes.data.choices[0].message.content;

    // Optionally store chat logs
    await db.collection('chatLogs').add({
      uid: context?.uid || 'guest',
      message,
      reply,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json(reply);
  } catch (error) {
    console.error('❌ OpenAI error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error generating response.' });
  }
});



// --- Export the app as Firebase Function ---
exports.api = functions.https.onRequest(app);
