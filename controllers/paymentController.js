const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Create a payment intent
// @route   POST /api/payment/create-payment-intent
// @access  Private
const createPaymentIntent = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ message: 'Amount is required' });
    }

    // Stripe expects amount in the smallest currency unit (e.g., paisa for INR)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'inr',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ message: error.message || 'Payment intent creation failed' });
  }
};

module.exports = {
  createPaymentIntent,
};
