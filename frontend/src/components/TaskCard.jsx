import { useState } from "react";
import {
  Calendar,
  User,
  MessageCircle,
  Paperclip,
  Edit2,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { taskAPI } from "../services/api";
import { useAuth } from "../hooks/useAuth";

const TaskCard = ({ task, project, onTaskUpdated, onTaskDeleted }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editData, setEditData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || "To Do",
    assignee: task?.assignee?._id || "",
  });

  // Safe property access with fallbacks
  const isOwner = project?.owner?._id === user?.id;
  const isAssignee = task?.assignee?._id === user?.id;
  const canEdit = isOwner || isAssignee;

  // Don't render if required props are missing
  if (!task || !project) {
    console.warn("TaskCard: Missing required props", {
      task: !!task,
      project: !!project,
    });
    return null;
  }

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

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await taskAPI.update(task._id, { status: newStatus });
      onTaskUpdated?.(response.data);
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const response = await taskAPI.update(task._id, editData);
      onTaskUpdated?.(response.data);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await taskAPI.delete(task._id);
        onTaskDeleted?.(task._id);
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await taskAPI.addComment(task._id, newComment);
      setNewComment("");
      // The comment will be updated via socket
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  return (
    <div className="card">
      <div className="space-y-4">
        {/* Task Header */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) =>
                  setEditData({ ...editData, title: e.target.value })
                }
                className="input-field text-lg font-semibold w-full"
              />
            ) : (
              <h3 className="text-lg font-semibold text-gray-900">
                {task.title}
              </h3>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            {canEdit && (
              <>
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="text-green-600 hover:text-green-700 p-1"
                      title="Save"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-gray-600 hover:text-gray-700 p-1"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-gray-600 hover:text-gray-700 p-1"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </>
            )}

            {(isOwner || task?.creator?._id === user?.id) && (
              <button
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 p-1"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Task Description */}
        {(task.description || isEditing) && (
          <div>
            {isEditing ? (
              <textarea
                value={editData.description}
                onChange={(e) =>
                  setEditData({ ...editData, description: e.target.value })
                }
                className="input-field resize-none w-full"
                rows={3}
                placeholder="Task description"
              />
            ) : task.description ? (
              <p className="text-gray-600">{task.description}</p>
            ) : null}
          </div>
        )}

        {/* Task Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Status:</span>
          {isEditing ? (
            <select
              value={editData.status}
              onChange={(e) =>
                setEditData({ ...editData, status: e.target.value })
              }
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          ) : (
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={!canEdit}
              className={`text-sm px-2 py-1 rounded-full ${getStatusColor(
                task.status
              )} ${canEdit ? "cursor-pointer" : "cursor-not-allowed"}`}
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          )}
        </div>

        {/* Task Meta Info */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          {/* Assignee */}
          <div className="flex items-center gap-2">
            <User size={16} />
            {isEditing ? (
              <select
                value={editData.assignee}
                onChange={(e) =>
                  setEditData({ ...editData, assignee: e.target.value })
                }
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="">Unassigned</option>
                {project?.members?.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.username}
                  </option>
                ))}
              </select>
            ) : (
              <span>{task?.assignee?.username || "Unassigned"}</span>
            )}
          </div>

          {/* Due Date */}
          {task.dueDate && (
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}

          {/* Attachments */}
          {task?.attachments?.length > 0 && (
            <div className="flex items-center gap-2">
              <Paperclip size={16} />
              <span>
                {task.attachments.length} file
                {task.attachments.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="border-t pt-4">
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <MessageCircle size={16} />
            <span>
              {task?.comments?.length || 0} comment
              {task?.comments?.length !== 1 ? "s" : ""}
            </span>
          </button>

          {showComments && (
            <div className="mt-4 space-y-4">
              {/* Existing Comments */}
              {task?.comments?.map((comment, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm text-gray-900">
                      {comment?.author?.username || "Unknown"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {comment?.createdAt
                        ? new Date(comment.createdAt).toLocaleString()
                        : ""}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{comment?.text}</p>
                </div>
              ))}

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
