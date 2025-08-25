import Notification from "../models/Notification.js";

class NotificationService {
  static async createNotification({
    recipient,
    sender,
    type,
    title,
    message,
    data = {},
    io,
  }) {
    try {
      // Don't send notification to yourself
      if (recipient.toString() === sender.toString()) {
        return;
      }

      console.log(`📬 Creating notification for user: ${recipient}`);

      const notification = new Notification({
        recipient,
        sender,
        type,
        title,
        message,
        data,
      });

      await notification.save();
      await notification.populate("sender", "username email");
      await notification.populate("data.projectId", "name");
      await notification.populate("data.taskId", "title");

      console.log(`📤 Sending real-time notification to user_${recipient}`);

      // Send real-time notification via socket
      if (io) {
        io.to(`user_${recipient}`).emit("newNotification", notification);
        console.log(`✅ Notification sent via socket to user_${recipient}`);
      } else {
        console.warn("⚠️ No socket.io instance provided");
      }

      return notification;
    } catch (error) {
      console.error("❌ Error creating notification:", error);
    }
  }

  static async createTaskAssignedNotification({ task, assignedBy, io }) {
    if (!task.assignee) return;

    console.log(
      `📋 Creating task assigned notification for task: ${task.title}`
    );

    return this.createNotification({
      recipient: task.assignee._id || task.assignee,
      sender: assignedBy,
      type: "task_assigned",
      title: "New Task Assigned",
      message: `You have been assigned to task: "${task.title}"`,
      data: {
        projectId: task.project._id || task.project,
        taskId: task._id,
      },
      io,
    });
  }

  static async createTaskUpdatedNotification({ task, updatedBy, changes, io }) {
    const recipients = new Set();

    // Notify assignee if task is assigned
    if (task.assignee && task.assignee._id) {
      recipients.add(task.assignee._id.toString());
    }

    // Notify creator if different from updater
    if (task.creator && task.creator._id) {
      recipients.add(task.creator._id.toString());
    }

    console.log(
      `📝 Creating task updated notifications for ${recipients.size} recipients`
    );

    const promises = Array.from(recipients).map((recipientId) =>
      this.createNotification({
        recipient: recipientId,
        sender: updatedBy,
        type: "task_updated",
        title: "Task Updated",
        message: `Task "${task.title}" has been updated`,
        data: {
          projectId: task.project._id || task.project,
          taskId: task._id,
          changes,
        },
        io,
      })
    );

    return Promise.all(promises);
  }

  static async createTaskCompletedNotification({ task, completedBy, io }) {
    const recipients = new Set();

    // Notify creator if different from completer
    if (task.creator && task.creator._id) {
      recipients.add(task.creator._id.toString());
    }

    // Notify all project members except the completer
    if (task.project && task.project.members) {
      task.project.members.forEach((member) => {
        if (member.toString() !== completedBy.toString()) {
          recipients.add(member.toString());
        }
      });
    }

    console.log(
      `✅ Creating task completed notifications for ${recipients.size} recipients`
    );

    const promises = Array.from(recipients).map((recipientId) =>
      this.createNotification({
        recipient: recipientId,
        sender: completedBy,
        type: "task_completed",
        title: "Task Completed",
        message: `Task "${task.title}" has been completed`,
        data: {
          projectId: task.project._id || task.project,
          taskId: task._id,
        },
        io,
      })
    );

    return Promise.all(promises);
  }

  static async createCommentNotification({ task, comment, commentedBy, io }) {
    const recipients = new Set();

    // Notify assignee
    if (task.assignee && task.assignee._id) {
      recipients.add(task.assignee._id.toString());
    }

    // Notify creator
    if (task.creator && task.creator._id) {
      recipients.add(task.creator._id.toString());
    }

    console.log(
      `💬 Creating comment notifications for ${recipients.size} recipients`
    );

    const promises = Array.from(recipients).map((recipientId) =>
      this.createNotification({
        recipient: recipientId,
        sender: commentedBy,
        type: "task_commented",
        title: "New Comment",
        message: `New comment on task: "${task.title}"`,
        data: {
          projectId: task.project._id || task.project,
          taskId: task._id,
          commentId: comment._id,
        },
        io,
      })
    );

    return Promise.all(promises);
  }

  static async createProjectJoinedNotification({ project, newMember, io }) {
    console.log(
      `👥 Creating project joined notification for project: ${project.name}`
    );

    return this.createNotification({
      recipient: project.owner,
      sender: newMember._id,
      type: "project_joined",
      title: "New Team Member",
      message: `${newMember.username} joined your project: "${project.name}"`,
      data: {
        projectId: project._id,
      },
      io,
    });
  }
}

export default NotificationService;
