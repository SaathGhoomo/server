import mongoose from 'mongoose';

// Define allowed status transitions
const allowedTransitions = {
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['completed', 'cancelled'],
  'completed': [],
  'cancelled': []
};

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    totalAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending'
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid'
    },
    razorpayOrderId: {
      type: String,
      required: false
    },
    razorpayPaymentId: {
      type: String
    },
    platformCommission: {
      type: Number,
      required: false
    },
    partnerEarning: {
      type: Number,
      required: false
    }
  },
  {
    timestamps: true
  }
);

// Add pre-save middleware to validate status transitions
bookingSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const currentStatus = this._originalStatus || this.status;
    const newStatus = this.status;
    
    // If this is not a new document, check transition validity
    if (!this.isNew && currentStatus !== newStatus) {
      const allowedNewStatuses = allowedTransitions[currentStatus];
      
      if (!allowedNewStatuses.includes(newStatus)) {
        const error = new Error(`Invalid status transition: ${currentStatus} → ${newStatus}. Allowed transitions: ${allowedNewStatuses.join(', ')}`);
        error.name = 'ValidationError';
        return next(error);
      }
    }
  }
  next();
});

// Store original status before modification
bookingSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this._originalStatus = this.getChanges().status[0];
  }
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
