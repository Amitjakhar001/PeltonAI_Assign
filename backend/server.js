import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Import routes
import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";
import notificationRoutes from "./routes/notifications.js";

// Import models
import User from "./models/User.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Store connected users
const connectedUsers = new Map();

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return next(new Error("User not found"));
    }

    socket.userId = user._id.toString();
    socket.username = user.username;
    socket.user = user;
    next();
  } catch (error) {
    console.error("Socket auth error:", error);
    next(new Error("Authentication error"));
  }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    message: "Server is running",
    timestamp: new Date().toISOString(),
    connectedUsers: connectedUsers.size,
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.username} (${socket.id})`);

  // Store connected user
  connectedUsers.set(socket.userId, {
    socketId: socket.id,
    username: socket.username,
    user: socket.user,
    joinedAt: new Date(),
  });

  // Join user to their personal room for notifications
  socket.join(`user_${socket.userId}`);

  // Handle joining project rooms
  socket.on("joinProject", (projectId) => {
    socket.join(`project_${projectId}`);
    console.log(`👥 User ${socket.username} joined project ${projectId}`);

    // Get online members for this project
    const projectRoom = io.sockets.adapter.rooms.get(`project_${projectId}`);
    if (projectRoom) {
      const onlineMembers = [];
      for (const socketId of projectRoom) {
        const userSocket = io.sockets.sockets.get(socketId);
        if (userSocket && userSocket.user) {
          onlineMembers.push({
            _id: userSocket.userId,
            username: userSocket.username,
            socketId: socketId,
          });
        }
      }

      // Send online members to all users in the project
      io.to(`project_${projectId}`).emit("onlineMembers", onlineMembers);
    }
  });

  // Handle leaving project rooms
  socket.on("leaveProject", (projectId) => {
    socket.leave(`project_${projectId}`);
    console.log(`👤 User ${socket.username} left project ${projectId}`);

    // Update online members for the project
    const projectRoom = io.sockets.adapter.rooms.get(`project_${projectId}`);
    const onlineMembers = [];
    if (projectRoom) {
      for (const socketId of projectRoom) {
        const userSocket = io.sockets.sockets.get(socketId);
        if (userSocket && userSocket.user) {
          onlineMembers.push({
            _id: userSocket.userId,
            username: userSocket.username,
            socketId: socketId,
          });
        }
      }
    }

    // Send updated online members
    io.to(`project_${projectId}`).emit("onlineMembers", onlineMembers);
  });

  // Handle user activity (typing, etc.)
  socket.on("userActivity", ({ projectId, activity }) => {
    socket.to(`project_${projectId}`).emit("userActivity", {
      user: {
        _id: socket.userId,
        username: socket.username,
      },
      activity,
    });
  });

  // Handle task events
  socket.on("taskCreated", ({ projectId, task }) => {
    socket.to(`project_${projectId}`).emit("taskCreated", task);
  });

  socket.on("taskUpdated", ({ projectId, task }) => {
    socket.to(`project_${projectId}`).emit("taskUpdated", task);
  });

  socket.on("taskDeleted", ({ projectId, taskId, taskTitle }) => {
    socket.to(`project_${projectId}`).emit("taskDeleted", {
      taskId,
      taskTitle,
      deletedBy: socket.userId,
    });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.username} (${socket.id})`);
    connectedUsers.delete(socket.userId);

    // Update online members for all projects this user was in
    socket.rooms.forEach((room) => {
      if (room.startsWith("project_")) {
        const projectId = room.replace("project_", "");
        const projectRoom = io.sockets.adapter.rooms.get(room);
        const onlineMembers = [];

        if (projectRoom) {
          for (const socketId of projectRoom) {
            const userSocket = io.sockets.sockets.get(socketId);
            if (userSocket && userSocket.user) {
              onlineMembers.push({
                _id: userSocket.userId,
                username: userSocket.username,
                socketId: socketId,
              });
            }
          }
        }

        socket.to(room).emit("onlineMembers", onlineMembers);
      }
    });
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("🗄️  Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("❌ Error:", error);
  res.status(error.status || 500).json({
    message: error.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Socket.io server ready`);
});
