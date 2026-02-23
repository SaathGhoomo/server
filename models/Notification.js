import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        'booking_created',
        'booking_accepted', 
        'booking_rejected',
        'payment_completed',
        'new_message',
        'partner_application',
        'partner_approved',
        'partner_rejected',
        'review_received',
        'wallet_updated',
        'system'
      ]
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    link: {
      type: String,
      trim: true,
      maxlength: 200
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
