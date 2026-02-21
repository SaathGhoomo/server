import mongoose from 'mongoose';

const partnerEarningsSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      required: true
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    availableBalance: {
      type: Number,
      default: 0
    },
    totalWithdrawn: {
      type: Number,
      default: 0
    },
    pendingWithdrawals: {
      type: Number,
      default: 0
    },
    lastWithdrawalAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const PartnerEarnings = mongoose.model('PartnerEarnings', partnerEarningsSchema);

export default PartnerEarnings;
