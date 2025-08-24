import express from "express";
import Notification from "../models/Notification.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Get user notifications
router.get("/", authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({
      recipient: req.user._id,
    })
      .populate("sender", "username email")
      .populate("data.projectId", "name")
      .populate("data.taskId", "title")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Notification.countDocuments({
      recipient: req.user._id,
    });

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark notification as read
router.put("/:id/read", authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.user._id,
      },
      {
        read: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark all notifications as read
router.put("/read-all", authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.user._id,
        read: false,
      },
      {
        read: true,
        readAt: new Date(),
      }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete notification
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
