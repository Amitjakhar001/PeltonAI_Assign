import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  User,
  MessageCircle,
  Calendar,
  FolderOpen,
  UserPlus,
  Activity,
  Target,
  Filter,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { notificationAPI } from "../services/api";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, unread, read
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const socket = useSocket();

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  useEffect(() => {
    if (socket && socket.connected) {
      socket.on("newNotification", handleNewNotification);

      return () => {
        socket.off("newNotification", handleNewNotification);
      };
    }
  }, [socket]);

  const handleNewNotification = useCallback((notification) => {
    console.log("🔔 New notification received:", notification);
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);

    // Show browser notification if permission granted
    if (Notification.permission === "granted") {
      new Notification(notification.title, {
        body: notification.message,
        icon: "/favicon.ico",
        tag: notification._id,
      });
    }
  }, []);

  const fetchNotifications = async (pageNum = 1, reset = true) => {
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "20",
      });

      if (filter === "unread") params.append("read", "false");
      if (filter === "read") params.append("read", "true");

      const response = await notificationAPI.getAll(params.toString());
      const {
        notifications: newNotifications,
        pagination,
        unreadCount: count,
      } = response.data;

      if (reset) {
        setNotifications(newNotifications);
      } else {
        setNotifications((prev) => [...prev, ...newNotifications]);
      }

      setUnreadCount(count);
      setHasMore(pageNum < pagination.pages);
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId
            ? { ...notification, read: true, readAt: new Date() }
            : notification
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read: true,
          readAt: new Date(),
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationAPI.delete(notificationId);
      setNotifications((prev) =>
        prev.filter((notification) => notification._id !== notificationId)
      );
      // If it was unread, decrease count
      const notification = notifications.find((n) => n._id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "task_assigned":
        return <User size={20} className="text-blue-600" />;
      case "task_updated":
        return <Activity size={20} className="text-green-600" />;
      case "task_completed":
        return <Target size={20} className="text-purple-600" />;
      case "task_commented":
        return <MessageCircle size={20} className="text-orange-600" />;
      case "project_joined":
        return <UserPlus size={20} className="text-indigo-600" />;
      case "project_updated":
        return <FolderOpen size={20} className="text-teal-600" />;
      default:
        return <Bell size={20} className="text-gray-600" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "task_assigned":
        return "bg-blue-50 border-blue-200";
      case "task_updated":
        return "bg-green-50 border-green-200";
      case "task_completed":
        return "bg-purple-50 border-purple-200";
      case "task_commented":
        return "bg-orange-50 border-orange-200";
      case "project_joined":
        return "bg-indigo-50 border-indigo-200";
      case "project_updated":
        return "bg-teal-50 border-teal-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getNotificationLink = (notification) => {
    if (notification.data?.taskId) {
      return `/project/${notification.data.projectId}`;
    }
    if (notification.data?.projectId) {
      return `/project/${notification.data.projectId}`;
    }
    return "#";
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchNotifications(page + 1, false);
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "unread") return !notification.read;
    if (filter === "read") return notification.read;
    return true;
  });

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Notifications
          </h1>
          <p className="text-gray-600">
            Stay updated with your projects and tasks
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchNotifications(1, true)}
            className="btn-secondary flex items-center gap-2"
            title="Refresh notifications"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn-primary flex items-center gap-2"
            >
              <CheckCheck size={16} />
              Mark All Read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Stats and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-6">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{notifications.length}</span> total
              notifications
            </div>
            {unreadCount > 0 && (
              <div className="text-sm text-blue-600 font-medium">
                <span>{unreadCount}</span> unread
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell size={48} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === "unread"
                ? "No unread notifications"
                : filter === "read"
                ? "No read notifications"
                : "No notifications yet"}
            </h3>
            <p className="text-gray-500">
              {filter === "unread"
                ? "You're all caught up!"
                : filter === "read"
                ? "No read notifications to show"
                : "We'll notify you when there's activity on your projects"}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const link = getNotificationLink(notification);
            const NotificationContent = (
              <div
                className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                  notification.read
                    ? "bg-white border-gray-200"
                    : `${getNotificationColor(notification.type)} border-l-4`
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4
                          className={`text-sm font-medium ${
                            notification.read
                              ? "text-gray-700"
                              : "text-gray-900"
                          }`}
                        >
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>

                      <p
                        className={`text-sm ${
                          notification.read ? "text-gray-500" : "text-gray-700"
                        }`}
                      >
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>From: {notification.sender?.username}</span>
                        <span>
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                        {notification.data?.projectId && (
                          <span>
                            Project: {notification.data.projectId.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          markAsRead(notification._id);
                        }}
                        className="text-gray-400 hover:text-blue-600 p-1"
                        title="Mark as read"
                      >
                        <Check size={16} />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        deleteNotification(notification._id);
                      }}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="Delete notification"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );

            return link !== "#" ? (
              <Link
                key={notification._id}
                to={link}
                onClick={() =>
                  !notification.read && markAsRead(notification._id)
                }
                className="block"
              >
                {NotificationContent}
              </Link>
            ) : (
              <div key={notification._id}>{NotificationContent}</div>
            );
          })
        )}
      </div>

      {/* Load More */}
      {hasMore && filteredNotifications.length > 0 && (
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

export default Notifications;
