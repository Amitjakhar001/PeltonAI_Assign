import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Copy,
  Trash2,
  Users,
  Calendar,
  Grid,
  List,
  Activity,
  Bell,
  X,
} from "lucide-react";
import { projectAPI, taskAPI } from "../services/api";
import { useAuth } from "../hooks/useAuth.jsx";
import { useSocket } from "../hooks/useSocket.jsx";
import CreateTaskModal from "../components/CreateTaskModal.jsx";
import TaskCard from "../components/TaskCard.jsx";
import KanbanBoard from "../components/KanbanBoard.jsx";

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const hasJoinedRoom = useRef(false);

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [filters, setFilters] = useState({ assignee: "", status: "" });
  const [viewMode, setViewMode] = useState("list");
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [onlineMembers, setOnlineMembers] = useState([]);

  useEffect(() => {
    fetchProject();
    fetchTasks();
  }, [id]);

  // Socket event handlers (for receiving updates from other users)
  const handleTaskUpdatedFromSocket = useCallback(
    (updatedTask) => {
      console.log("📝 Task updated via socket:", updatedTask.title);
      setTasks((prev) =>
        prev.map((task) => (task._id === updatedTask._id ? updatedTask : task))
      );

      if (updatedTask.updatedBy && updatedTask.updatedBy !== user?.id) {
        showNotification(`Task "${updatedTask.title}" was updated`, "update");
      }
    },
    [user?.id]
  );

  const handleTaskCreatedFromSocket = useCallback(
    (newTask) => {
      console.log("➕ New task created via socket:", newTask.title);
      setTasks((prev) => [newTask, ...prev]);

      if (newTask.creator?._id !== user?.id) {
        showNotification(`New task "${newTask.title}" was created`, "create");
      }
    },
    [user?.id]
  );

  const handleTaskDeletedFromSocket = useCallback(
    ({ taskId, taskTitle, deletedBy }) => {
      console.log("🗑️ Task deleted via socket:", taskTitle);
      setTasks((prev) => prev.filter((task) => task._id !== taskId));

      if (deletedBy !== user?.id) {
        showNotification(`Task "${taskTitle}" was deleted`, "delete");
      }
    },
    [user?.id]
  );

  const handleCommentAdded = useCallback(
    ({ taskId, comment, task }) => {
      console.log("💬 Comment added via socket:", comment.text);
      setTasks((prev) =>
        prev.map((t) =>
          t._id === taskId
            ? { ...t, comments: [...(t.comments || []), comment] }
            : t
        )
      );

      if (comment.author?._id !== user?.id) {
        showNotification(`New comment on "${task.title}"`, "comment");
      }
    },
    [user?.id]
  );

  const handleProjectUpdated = useCallback((updatedProject) => {
    console.log("📋 Project updated via socket:", updatedProject.name);
    setProject(updatedProject);
    showNotification("Project details updated", "update");
  }, []);

  const handleMemberJoined = useCallback(
    ({ member, project: updatedProject }) => {
      console.log("👥 Member joined via socket:", member.username);
      setProject(updatedProject);
      showNotification(`${member.username} joined the project`, "member");
    },
    []
  );

  const handleMemberLeft = useCallback(
    ({ member, project: updatedProject }) => {
      console.log("👥 Member left via socket:", member.username);
      setProject(updatedProject);
      showNotification(`${member.username} left the project`, "member");
    },
    []
  );

  const handleOnlineMembers = useCallback((members) => {
    console.log("👥 Online members updated:", members.length);
    setOnlineMembers(members);
  }, []);

  const handleUserActivity = useCallback(({ user: activeUser, activity }) => {
    console.log("👤 User activity:", activeUser.username, activity);
  }, []);

  // Socket connection effect
  useEffect(() => {
    if (socket && socket.connected && project && id && !hasJoinedRoom.current) {
      console.log(`🔌 Joining project room: ${id}`);
      hasJoinedRoom.current = true;

      // Join project room
      socket.emit("joinProject", id);

      // Set up event listeners
      socket.on("taskUpdated", handleTaskUpdatedFromSocket);
      socket.on("taskCreated", handleTaskCreatedFromSocket);
      socket.on("taskDeleted", handleTaskDeletedFromSocket);
      socket.on("commentAdded", handleCommentAdded);
      socket.on("projectUpdated", handleProjectUpdated);
      socket.on("memberJoined", handleMemberJoined);
      socket.on("memberLeft", handleMemberLeft);
      socket.on("onlineMembers", handleOnlineMembers);
      socket.on("userActivity", handleUserActivity);

      return () => {
        console.log(`🔌 Leaving project room: ${id}`);
        hasJoinedRoom.current = false;

        socket.off("taskUpdated", handleTaskUpdatedFromSocket);
        socket.off("taskCreated", handleTaskCreatedFromSocket);
        socket.off("taskDeleted", handleTaskDeletedFromSocket);
        socket.off("commentAdded", handleCommentAdded);
        socket.off("projectUpdated", handleProjectUpdated);
        socket.off("memberJoined", handleMemberJoined);
        socket.off("memberLeft", handleMemberLeft);
        socket.off("onlineMembers", handleOnlineMembers);
        socket.off("userActivity", handleUserActivity);

        socket.emit("leaveProject", id);
      };
    }
  }, [
    socket,
    id,
    project,
    handleTaskUpdatedFromSocket,
    handleTaskCreatedFromSocket,
    handleTaskDeletedFromSocket,
    handleCommentAdded,
    handleProjectUpdated,
    handleMemberJoined,
    handleMemberLeft,
    handleOnlineMembers,
    handleUserActivity,
  ]);

  // Reset room join status when socket reconnects
  useEffect(() => {
    if (socket && socket.connected) {
      hasJoinedRoom.current = false;
    }
  }, [socket?.connected]);

  const showNotification = useCallback((message, type) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date(),
    };

    setNotifications((prev) => [notification, ...prev.slice(0, 4)]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, 5000);
  }, []);

  const dismissNotification = useCallback((notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  const fetchProject = async () => {
    try {
      const response = await projectAPI.getById(id);
      setProject(response.data);
    } catch (err) {
      setError("Failed to load project");
      navigate("/dashboard");
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await taskAPI.getByProject(id, filters);
      setTasks(response.data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  // Local event handlers (for user actions)
  const handleTaskCreated = (newTask) => {
    setTasks([newTask, ...tasks]);
    setShowCreateTask(false);

    // Emit to socket for real-time updates
    if (socket && socket.connected) {
      socket.emit("taskCreated", { projectId: id, task: newTask });
    }
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks((prev) =>
      prev.map((task) => (task._id === updatedTask._id ? updatedTask : task))
    );

    // Emit to socket for real-time updates
    if (socket && socket.connected) {
      socket.emit("taskUpdated", { projectId: id, task: updatedTask });
    }
  };

  const handleTaskDeleted = (taskId) => {
    const task = tasks.find((t) => t._id === taskId);
    setTasks((prev) => prev.filter((task) => task._id !== taskId));

    // Emit to socket for real-time updates
    if (socket && socket.connected && task) {
      socket.emit("taskDeleted", {
        projectId: id,
        taskId,
        taskTitle: task.title,
      });
    }
  };

  const copyInviteCode = async () => {
    if (project?.inviteCode) {
      try {
        await navigator.clipboard.writeText(project.inviteCode);
        showNotification("Invite code copied to clipboard!", "success");
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = project.inviteCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        showNotification("Invite code copied to clipboard!", "success");
      }
    }
  };

  const deleteProject = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      try {
        await projectAPI.delete(id);
        showNotification("Project deleted successfully", "success");
        navigate("/dashboard");
      } catch (err) {
        showNotification("Failed to delete project", "error");
      }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "create":
        return <Plus size={16} className="text-green-600" />;
      case "update":
        return <Activity size={16} className="text-blue-600" />;
      case "delete":
        return <Trash2 size={16} className="text-red-600" />;
      case "comment":
        return <Bell size={16} className="text-purple-600" />;
      case "member":
        return <Users size={16} className="text-indigo-600" />;
      default:
        return <Bell size={16} className="text-blue-600" />;
    }
  };

  const isOwner = project?.owner?._id === user?.id;

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading project details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 relative">
      {/* Real-time Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm animate-slide-in-right"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  {getNotificationIcon(notification.type)}
                  <div className="ml-2 flex-1">
                    <p className="text-sm text-gray-800 font-medium">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {notification.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="text-gray-400 hover:text-gray-600 ml-2"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Header */}
      <div className="card">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {project?.name}
            </h1>
            {project?.description && (
              <p className="text-gray-600 mb-4">{project.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>{project?.members?.length || 0} members</span>
                {onlineMembers.length > 0 && (
                  <span className="text-green-600">
                    ({onlineMembers.length} online)
                  </span>
                )}
              </div>
              {project?.deadline && (
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>
                    Due: {new Date(project.deadline).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div>
                <span>Owner: {project?.owner?.username}</span>
              </div>
              {socket?.connected && (
                <div className="flex items-center gap-2 text-green-600">
                  <Activity size={16} />
                  <span>Live Updates Active</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyInviteCode}
              className="btn-secondary flex items-center gap-2"
              title="Copy invite code"
            >
              <Copy size={16} />
              <span className="hidden sm:inline">Code:</span>{" "}
              {project?.inviteCode}
            </button>

            {isOwner && (
              <button
                onClick={deleteProject}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Delete Project</span>
              </button>
            )}
          </div>
        </div>

        {/* Online Members Display */}
        {onlineMembers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Online Now:
            </h3>
            <div className="flex flex-wrap gap-2">
              {onlineMembers.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs"
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  {member.username}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task Management Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <List size={16} className="inline mr-1" />
              List
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === "kanban"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Grid size={16} className="inline mr-1" />
              Kanban
            </button>
          </div>

          {/* Filters */}
          <select
            value={filters.assignee}
            onChange={(e) =>
              setFilters({ ...filters, assignee: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Assignees</option>
            {project?.members?.map((member) => (
              <option key={member._id} value={member._id}>
                {member.username}
                {onlineMembers.find((m) => m._id === member._id) && " (online)"}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
        </div>

        <button
          onClick={() => setShowCreateTask(true)}
          className="btn-primary flex items-center gap-2 hover-scale"
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">To Do</p>
              <p className="text-2xl font-bold text-gray-900">
                {tasks.filter((t) => t.status === "To Do").length}
              </p>
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
              <List size={16} className="text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-900">
                {tasks.filter((t) => t.status === "In Progress").length}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center">
              <Activity size={16} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Done</p>
              <p className="text-2xl font-bold text-green-900">
                {tasks.filter((t) => t.status === "Done").length}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-200 rounded-lg flex items-center justify-center">
              <Calendar size={16} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Display */}
      {viewMode === "list" ? (
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus size={48} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No tasks yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first task to get started with this project
              </p>
              <button
                onClick={() => setShowCreateTask(true)}
                className="btn-primary hover-scale"
              >
                <Plus size={16} className="inline mr-2" />
                Create First Task
              </button>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                project={project}
                onTaskUpdated={handleTaskUpdated}
                onTaskDeleted={handleTaskDeleted}
              />
            ))
          )}
        </div>
      ) : (
        <KanbanBoard
          tasks={tasks}
          project={project}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          project={project}
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
