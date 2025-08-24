import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FolderOpen,
  Filter,
  Search,
  Activity,
  Target,
  RefreshCw,
} from "lucide-react";
import { taskAPI } from "../services/api";
import { useAuth } from "../hooks/useAuth";

const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, to-do, in-progress, done
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchMyTasks();
  }, [filter]);

  const fetchMyTasks = async (pageNum = 1, reset = true) => {
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "20",
      });

      if (filter !== "all") {
        const statusMap = {
          "to-do": "To Do",
          "in-progress": "In Progress",
          done: "Done",
        };
        params.append("status", statusMap[filter]);
      }

      const response = await taskAPI.getMyTasks(params.toString());
      const { tasks: newTasks, pagination } = response.data;

      if (reset) {
        setTasks(newTasks);
      } else {
        setTasks((prev) => [...prev, ...newTasks]);
      }

      setHasMore(pageNum < pagination.pages);
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching my tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "To Do":
        return "bg-gray-100 text-gray-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Done":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "To Do":
        return <Clock size={16} className="text-gray-600" />;
      case "In Progress":
        return <Activity size={16} className="text-blue-600" />;
      case "Done":
        return <CheckCircle size={16} className="text-green-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getPriorityColor = (task) => {
    if (!task.dueDate) return "";

    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return "border-l-4 border-red-500"; // Overdue
    if (daysLeft === 0) return "border-l-4 border-orange-500"; // Due today
    if (daysLeft <= 3) return "border-l-4 border-yellow-500"; // Due soon
    return "";
  };

  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.project?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTaskStats = () => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === "To Do").length;
    const inProgress = tasks.filter((t) => t.status === "In Progress").length;
    const done = tasks.filter((t) => t.status === "Done").length;

    // Calculate overdue tasks
    const overdue = tasks.filter((t) => {
      if (!t.dueDate || t.status === "Done") return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    return { total, todo, inProgress, done, overdue };
  };

  const stats = getTaskStats();

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchMyTasks(page + 1, false);
    }
  };

  if (loading && page === 1) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Tasks</h1>
          <p className="text-gray-600">
            Tasks assigned to you across all projects
          </p>
        </div>

        <button
          onClick={() => fetchMyTasks(1, true)}
          className="btn-secondary flex items-center gap-2"
          title="Refresh tasks"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <User size={24} className="text-gray-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">To Do</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todo}</p>
            </div>
            <Clock size={24} className="text-gray-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-900">
                {stats.inProgress}
              </p>
            </div>
            <Activity size={24} className="text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Done</p>
              <p className="text-2xl font-bold text-green-900">{stats.done}</p>
            </div>
            <CheckCircle size={24} className="text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Overdue</p>
              <p className="text-2xl font-bold text-red-900">{stats.overdue}</p>
            </div>
            <AlertCircle size={24} className="text-red-600" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Tasks</option>
              <option value="to-do">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Target size={48} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? "No tasks found" : "No assigned tasks"}
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? "Try adjusting your search terms"
                : "You don't have any assigned tasks at the moment"}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <Link
              key={task._id}
              to={`/project/${task.project._id}`}
              className={`block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 p-6 ${getPriorityColor(
                task
              )}`}
            >
              <div className="space-y-4">
                {/* Task Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div className="ml-4">
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        task.status
                      )}`}
                    >
                      {getStatusIcon(task.status)}
                      {task.status}
                    </div>
                  </div>
                </div>

                {/* Task Details */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={16} />
                    <span>Project: {task.project?.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User size={16} />
                    <span>Created by: {task.creator?.username}</span>
                  </div>

                  {task.dueDate && (
                    <div
                      className={`flex items-center gap-2 ${
                        new Date(task.dueDate) < new Date() &&
                        task.status !== "Done"
                          ? "text-red-600 font-medium"
                          : ""
                      }`}
                    >
                      <Calendar size={16} />
                      <span>
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                        {new Date(task.dueDate) < new Date() &&
                          task.status !== "Done" &&
                          " (Overdue)"}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>
                      Created: {new Date(task.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Progress Indicator for Overdue Tasks */}
                {new Date(task.dueDate) < new Date() &&
                  task.status !== "Done" && (
                    <div className="flex items-center gap-2 text-red-600 text-sm font-medium bg-red-50 px-3 py-2 rounded-lg">
                      <AlertCircle size={16} />
                      <span>This task is overdue</span>
                    </div>
                  )}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && filteredTasks.length > 0 && (
        <div className="text-center py-6">
          <button
            onClick={loadMore}
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
};

export default MyTasks;
