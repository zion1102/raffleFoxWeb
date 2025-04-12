const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const stripeSecret = defineSecret('STRIPE_SECRET_KEY');
const stripeLib = require('stripe');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

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
          product_data: {
            name: `${amount} TTD Credit Top-Up`,
          },
          unit_amount: amount * 100,
        },
        quantity: 1,
      }],
      mode: 'payment',
      metadata: { userId, amount },
      success_url: `https://rafflefox.netlify.app/topup-success?amount=${amount}&userId=${userId}`,
      cancel_url: `https://rafflefox.netlify.app/topup`,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe session error:', error);
    res.status(500).json({ error: 'Failed to create Stripe Checkout Session' });
  }
});
