import express from "express";
import { body, validationResult } from "express-validator";
import multer from "multer";
import path from "path";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only specific file types are allowed"));
    }
  },
});

// Get tasks for a project
router.get("/project/:projectId", authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { assignee, status } = req.query;

    // Check if user is project member
    const project = await Project.findById(projectId);
    if (!project || !project.members.includes(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    let filter = { project: projectId };
    if (assignee) filter.assignee = assignee;
    if (status) filter.status = status;

    const tasks = await Task.find(filter)
      .populate("assignee", "username email")
      .populate("creator", "username email")
      .populate("comments.author", "username email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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
      const projectDoc = await Project.findById(project);
      if (!projectDoc || !projectDoc.members.includes(req.user._id)) {
        return res.status(403).json({ message: "Access denied" });
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

      // Check permissions
      const isOwner = task.project.owner.toString() === req.user._id.toString();
      const isAssignee =
        task.assignee && task.assignee.toString() === req.user._id.toString();

      if (!isOwner && !isAssignee) {
        return res.status(403).json({ message: "Access denied" });
      }

      Object.assign(task, req.body);
      await task.save();

      await task.populate("assignee", "username email");
      await task.populate("creator", "username email");

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

      task.comments.push({
        text: req.body.text,
        author: req.user._id,
      });

      await task.save();
      await task.populate("comments.author", "username email");

      // Emit real-time update
      req.io.to(`project_${task.project._id}`).emit("commentAdded", {
        taskId: task._id,
        comment: task.comments[task.comments.length - 1],
      });

      res.json(task.comments[task.comments.length - 1]);
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

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
