import mongoose from 'mongoose';

const withdrawalRequestSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid'],
      default: 'pending'
    },
    adminNotes: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);

export default WithdrawalRequest;
