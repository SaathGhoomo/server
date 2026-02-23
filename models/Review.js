import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true // One review per booking
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5'
      }
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
reviewSchema.index({ partner: 1, createdAt: -1 });
reviewSchema.index({ user: 1 });
// booking index is already unique, no need for additional index

const Review = mongoose.model('Review', reviewSchema);

export default Review;
