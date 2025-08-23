import express from "express";
import { body, validationResult } from "express-validator";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Generate unique invite code
const generateInviteCode = () => {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
};

// Get user's projects
router.get("/", authenticate, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    })
      .populate("owner", "username email")
      .populate("members", "username email");

    res.json(projects);
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create project
router.post(
  "/",
  authenticate,
  [
    body("name")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Project name is required"),
    body("description").optional().trim(),
    body("deadline")
      .optional()
      .isISO8601()
      .withMessage("Invalid deadline format"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, deadline } = req.body;

      let inviteCode;
      do {
        inviteCode = generateInviteCode();
      } while (await Project.findOne({ inviteCode }));

      const project = new Project({
        name,
        description,
        deadline: deadline ? new Date(deadline) : undefined,
        owner: req.user._id,
        members: [req.user._id],
        inviteCode,
      });

      await project.save();
      await project.populate("owner", "username email");
      await project.populate("members", "username email");

      res.status(201).json(project);
    } catch (error) {
      console.error("Create project error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Join project by invite code
router.post(
  "/join",
  authenticate,
  [
    body("inviteCode")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Invite code is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { inviteCode } = req.body;

      const project = await Project.findOne({ inviteCode });
      if (!project) {
        return res.status(404).json({ message: "Invalid invite code" });
      }

      if (project.members.includes(req.user._id)) {
        return res
          .status(400)
          .json({ message: "You are already a member of this project" });
      }

      project.members.push(req.user._id);
      await project.save();

      await project.populate("owner", "username email");
      await project.populate("members", "username email");

      res.json({ message: "Successfully joined project", project });
    } catch (error) {
      console.error("Join project error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Get project details
router.get("/:id", authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("owner", "username email")
      .populate("members", "username email");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user is a member
    const isMember = project.members.some(
      (member) => member._id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(project);
  } catch (error) {
    console.error("Get project details error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete project (owner only)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only project owner can delete the project" });
    }

    // Delete all tasks in the project
    await Task.deleteMany({ project: project._id });

    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
