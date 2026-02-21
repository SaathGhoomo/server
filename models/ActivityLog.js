import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false
    },
    ipAddress: {
      type: String,
      required: false
    }
  },
  {
    timestamps: true
  }
);

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
