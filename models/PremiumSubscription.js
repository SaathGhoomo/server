import mongoose from 'mongoose';

const premiumSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    plan: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active'
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    razorpayPaymentId: {
      type: String
    },
    autoRenew: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const PremiumSubscription = mongoose.model('PremiumSubscription', premiumSubscriptionSchema);

export default PremiumSubscription;
