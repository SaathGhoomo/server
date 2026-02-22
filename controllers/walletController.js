import Wallet from '../models/Wallet.js';
import User from '../models/User.js';

const formatWalletResponse = (wallet) => ({
  balance: wallet.balance,
  transactions: (wallet.transactions || []).map((t) => ({
    type: t.type,
    amount: t.amount,
    reason: t.reason || (t.type === 'credit' ? 'Credited' : 'Debited'),
    createdAt: t.createdAt
  })).reverse()
});

export const getWallet = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    const userId = req.user._id;

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 0, transactions: [] });
    }

    res.status(200).json({
      success: true,
      wallet: formatWalletResponse(wallet)
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching wallet',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

export const withdrawWallet = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    const userId = req.user._id;
    const { amount, bankDetails } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    if (!bankDetails?.accountNumber || !bankDetails?.ifsc || !bankDetails?.accountHolder) {
      return res.status(400).json({ success: false, message: 'Bank details required' });
    }

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) wallet = await Wallet.create({ userId, balance: 0, transactions: [] });
    if (wallet.balance < numAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    wallet.balance -= numAmount;
    wallet.transactions.push({
      type: 'debit',
      amount: numAmount,
      reason: 'Withdrawal to bank'
    });
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted',
      wallet: formatWalletResponse(wallet)
    });
  } catch (error) {
    console.error('Withdraw wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during withdrawal',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

export const transferWallet = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    const userId = req.user._id;
    const { amount, recipientEmail } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    if (!recipientEmail || !recipientEmail.trim()) {
      return res.status(400).json({ success: false, message: 'Recipient email required' });
    }

    const recipient = await User.findOne({ email: recipientEmail.trim().toLowerCase() });
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }
    if (recipient._id.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot transfer to yourself' });
    }

    let senderWallet = await Wallet.findOne({ userId });
    if (!senderWallet) senderWallet = await Wallet.create({ userId, balance: 0, transactions: [] });
    if (senderWallet.balance < numAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    let recipientWallet = await Wallet.findOne({ userId: recipient._id });
    if (!recipientWallet) recipientWallet = await Wallet.create({ userId: recipient._id, balance: 0, transactions: [] });

    senderWallet.balance -= numAmount;
    senderWallet.transactions.push({ type: 'debit', amount: numAmount, reason: `Transfer to ${recipientEmail}` });
    recipientWallet.balance += numAmount;
    recipientWallet.transactions.push({ type: 'credit', amount: numAmount, reason: `Transfer from ${req.user.email}` });
    await senderWallet.save();
    await recipientWallet.save();

    res.status(200).json({
      success: true,
      message: 'Transfer successful',
      wallet: formatWalletResponse(senderWallet)
    });
  } catch (error) {
    console.error('Transfer wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during transfer',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};
