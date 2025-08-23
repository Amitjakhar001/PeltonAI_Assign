import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Filter,
  Copy,
  Trash2,
  Users,
  Calendar,
  Grid,
  List,
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

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [filters, setFilters] = useState({ assignee: "", status: "" });
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'kanban'
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProject();
    fetchTasks();
  }, [id]);

  useEffect(() => {
    if (socket) {
      socket.emit("joinProject", id);

      const handleTaskUpdated = (updatedTask) => {
        setTasks((prev) =>
          prev.map((task) =>
            task._id === updatedTask._id ? updatedTask : task
          )
        );
      };

      const handleCommentAdded = ({ taskId, comment }) => {
        setTasks((prev) =>
          prev.map((task) =>
            task._id === taskId
              ? { ...task, comments: [...task.comments, comment] }
              : task
          )
        );
      };

      socket.on("taskUpdated", handleTaskUpdated);
      socket.on("commentAdded", handleCommentAdded);

      return () => {
        socket.off("taskUpdated", handleTaskUpdated);
        socket.off("commentAdded", handleCommentAdded);
        socket.emit("leaveProject", id);
      };
    }
  }, [socket, id]);

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

  const handleTaskCreated = (newTask) => {
    setTasks([newTask, ...tasks]);
    setShowCreateTask(false);
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks((prev) =>
      prev.map((task) => (task._id === updatedTask._id ? updatedTask : task))
    );
  };

  const handleTaskDeleted = (taskId) => {
    setTasks((prev) => prev.filter((task) => task._id !== taskId));
  };

  const copyInviteCode = async () => {
    if (project?.inviteCode) {
      await navigator.clipboard.writeText(project.inviteCode);
      alert("Invite code copied to clipboard!");
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
        navigate("/dashboard");
      } catch (err) {
        alert("Failed to delete project");
      }
    }
  };

  const isOwner = project?.owner?._id === user?.id;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-600 py-8">{error}</div>;
  }

  return (
    <div className="space-y-6">
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
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyInviteCode}
              className="btn-secondary flex items-center gap-2"
              title="Copy invite code"
            >
              <Copy size={16} />
              Code: {project?.inviteCode}
            </button>

            {isOwner && (
              <button
                onClick={deleteProject}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete Project
              </button>
            )}
          </div>
        </div>
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
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Assignees</option>
            {project?.members?.map((member) => (
              <option key={member._id} value={member._id}>
                {member.username}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Status</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
        </div>

        <button
          onClick={() => setShowCreateTask(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {/* Tasks Display */}
      {viewMode === "list" ? (
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">
                <p className="text-lg mb-2">No tasks yet</p>
                <p className="text-sm">Create your first task to get started</p>
              </div>
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
