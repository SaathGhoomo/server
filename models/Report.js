import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: false
    },
    reason: {
      type: String,
      required: true,
      minlength: 10
    },
    description: {
      type: String,
      required: false
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'rejected'],
      default: 'pending'
    },
    adminNotes: {
      type: String,
      required: false
    },
    resolvedAt: {
      type: Date,
      required: false
    }
  },
  {
    timestamps: true
  }
);

const Report = mongoose.model('Report', reportSchema);

export default Report;
