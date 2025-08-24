import express from "express";
import { body, validationResult } from "express-validator";
import multer from "multer";
import path from "path";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { authenticate } from "../middleware/auth.js";
import NotificationService from "../services/notificationService.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// Get tasks by project
router.get("/project/:projectId", authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { assignee, status, page = 1, limit = 50 } = req.query;

    // Check if user is project member
    const project = await Project.findById(projectId);
    if (!project || !project.members.includes(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Build query
    const query = { project: projectId };
    if (assignee) query.assignee = assignee;
    if (status) query.status = status;

    const tasks = await Task.find(query)
      .populate("assignee", "username email")
      .populate("creator", "username email")
      .populate("comments.author", "username email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json(tasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user's assigned tasks
router.get("/my-tasks", authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    // Build query for tasks assigned to current user
    const query = { assignee: req.user._id };
    if (status) query.status = status;

    const tasks = await Task.find(query)
      .populate("project", "name")
      .populate("creator", "username email")
      .populate("comments.author", "username email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get my tasks error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create task
router.post(
  "/",
  authenticate,
  upload.array("attachments", 5),
  [
    body("title")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Task title is required"),
    body("description").optional().trim(),
    body("project").isMongoId().withMessage("Valid project ID is required"),
    body("assignee")
      .optional()
      .isMongoId()
      .withMessage("Valid assignee ID is required"),
    body("dueDate")
      .optional()
      .isISO8601()
      .withMessage("Invalid due date format"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, project, assignee, dueDate } = req.body;

      // Check if user is project member
      const projectDoc = await Project.findById(project).populate(
        "members",
        "username email"
      );
      if (
        !projectDoc ||
        !projectDoc.members.some(
          (member) => member._id.toString() === req.user._id.toString()
        )
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate assignee is project member
      if (
        assignee &&
        !projectDoc.members.some((member) => member._id.toString() === assignee)
      ) {
        return res
          .status(400)
          .json({ message: "Assignee must be a project member" });
      }

      // Handle file attachments
      const attachments = req.files
        ? req.files.map((file) => ({
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          }))
        : [];

      const task = new Task({
        title,
        description,
        project,
        creator: req.user._id,
        assignee: assignee || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        attachments,
      });

      await task.save();
      await task.populate("assignee", "username email");
      await task.populate("creator", "username email");

      // Create notification for assigned user
      if (assignee) {
        await NotificationService.createTaskAssignedNotification({
          task,
          assignedBy: req.user._id,
          io: req.io,
        });
      }

      // Emit real-time update
      req.io.to(`project_${project}`).emit("taskCreated", task);

      res.status(201).json(task);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Update task
router.put(
  "/:id",
  authenticate,
  [
    body("title")
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage("Task title cannot be empty"),
    body("description").optional().trim(),
    body("status")
      .optional()
      .isIn(["To Do", "In Progress", "Done"])
      .withMessage("Invalid status"),
    body("assignee")
      .optional()
      .isMongoId()
      .withMessage("Valid assignee ID is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const task = await Task.findById(req.params.id).populate("project");
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const project = await Project.findById(task.project._id).populate(
        "members",
        "username email"
      );

      // Check permissions
      const isOwner = project.owner.toString() === req.user._id.toString();
      const isAssignee =
        task.assignee && task.assignee.toString() === req.user._id.toString();
      const isCreator = task.creator.toString() === req.user._id.toString();

      if (!isOwner && !isAssignee && !isCreator) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate new assignee is project member
      if (
        req.body.assignee &&
        !project.members.some(
          (member) => member._id.toString() === req.body.assignee
        )
      ) {
        return res
          .status(400)
          .json({ message: "Assignee must be a project member" });
      }

      // Track changes for notifications
      const oldAssignee = task.assignee?.toString();
      const newAssignee = req.body.assignee;
      const oldStatus = task.status;
      const newStatus = req.body.status;

      // Update task
      Object.assign(task, req.body);
      await task.save();
      await task.populate("assignee", "username email");
      await task.populate("creator", "username email");

      // Create notifications for task updates
      if (newStatus && newStatus !== oldStatus) {
        await NotificationService.createTaskUpdatedNotification({
          task,
          updatedBy: req.user._id,
          changes: { status: { from: oldStatus, to: newStatus } },
          io: req.io,
        });

        // Create completion notification
        if (newStatus === "Done") {
          await NotificationService.createTaskCompletedNotification({
            task,
            completedBy: req.user._id,
            io: req.io,
          });
        }
      }

      // Create notification for new assignee
      if (newAssignee && newAssignee !== oldAssignee) {
        await NotificationService.createTaskAssignedNotification({
          task,
          assignedBy: req.user._id,
          io: req.io,
        });
      }

      // Emit real-time update
      req.io.to(`project_${task.project._id}`).emit("taskUpdated", task);

      res.json(task);
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Add comment to task
router.post(
  "/:id/comments",
  authenticate,
  [
    body("text")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Comment text is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const task = await Task.findById(req.params.id).populate("project");
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check if user is project member
      const project = await Project.findById(task.project._id);
      if (!project.members.includes(req.user._id)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const comment = {
        text: req.body.text,
        author: req.user._id,
        createdAt: new Date(),
      };

      task.comments.push(comment);
      await task.save();
      await task.populate("comments.author", "username email");

      const newComment = task.comments[task.comments.length - 1];

      // Create notification for comment
      await NotificationService.createCommentNotification({
        task,
        comment: newComment,
        commentedBy: req.user._id,
        io: req.io,
      });

      // Emit real-time update
      req.io.to(`project_${task.project._id}`).emit("commentAdded", {
        taskId: task._id,
        comment: newComment,
        task: { title: task.title },
      });

      res.json(newComment);
    } catch (error) {
      console.error("Add comment error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Delete task
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user is project owner or task creator
    const isOwner = task.project.owner.toString() === req.user._id.toString();
    const isCreator = task.creator.toString() === req.user._id.toString();

    if (!isOwner && !isCreator) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Emit real-time update before deletion
    req.io.to(`project_${task.project._id}`).emit("taskDeleted", {
      taskId: task._id,
      taskTitle: task.title,
      deletedBy: req.user._id,
    });

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
