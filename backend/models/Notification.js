import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "task_assigned",
        "task_updated",
        "task_completed",
        "task_commented",
        "project_invited",
        "project_joined",
        "project_updated",
        "mention",
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
      },
      taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
      commentId: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

export default mongoose.model("Notification", notificationSchema);
