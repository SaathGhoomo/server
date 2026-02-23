import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String, default: '' },
  refId: { type: mongoose.Schema.Types.ObjectId, refPath: 'transactionRefModel' },
  transactionRefModel: { type: String, enum: ['Booking', 'WithdrawalRequest', 'Wallet'], default: 'Wallet' }
}, { timestamps: true });

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  balance: { type: Number, default: 0, min: 0 },
  transactions: [transactionSchema]
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
