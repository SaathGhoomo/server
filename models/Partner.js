import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    bio: {
      type: String,
      required: true,
      trim: true,
      minlength: 20
    },
    hourlyRate: {
      type: Number,
      required: true,
      min: 100
    },
    interests: {
      type: [String],
      default: []
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    experience: {
      type: String,
      required: false,
      trim: true
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    documents: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const Partner = mongoose.model('Partner', partnerSchema);

export default Partner;
