import { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  FolderOpen,
  User,
  Wifi,
  WifiOff,
  Bell,
  CheckSquare,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { notificationAPI } from "../services/api";

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (socket && socket.connected) {
      socket.on("newNotification", () => {
        setUnreadCount((prev) => prev + 1);
      });

      return () => {
        socket.off("newNotification");
      };
    }
  }, [socket]);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getAll();
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      current: location.pathname === "/dashboard",
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderOpen,
      current:
        location.pathname === "/projects" ||
        location.pathname.startsWith("/project"),
    },
    {
      name: "My Tasks",
      href: "/my-tasks",
      icon: CheckSquare,
      current: location.pathname === "/my-tasks",
    },
    {
      name: "Notifications",
      href: "/notifications",
      icon: Bell,
      current: location.pathname === "/notifications",
      badge: unreadCount > 0 ? unreadCount : null,
    },
  ];

  const isConnected = socket && socket.connected;

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">ProjectHub</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Connection Status */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div
            className={`flex items-center text-xs font-medium ${
              isConnected ? "text-green-600" : "text-red-600"
            }`}
          >
            {isConnected ? (
              <>
                <Wifi size={14} className="mr-2" />
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  <span>Connected • Real-time updates active</span>
                </div>
              </>
            ) : (
              <>
                <WifiOff size={14} className="mr-2" />
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                  <span>Disconnected • Updates on refresh only</span>
                </div>
              </>
            )}
          </div>
          {socket && !socket.connected && (
            <p className="text-xs text-gray-500 mt-1">
              Attempting to reconnect...
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  item.current
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className="flex items-center">
                  <Icon
                    size={20}
                    className={`mr-3 ${
                      item.current ? "text-blue-700" : "text-gray-400"
                    }`}
                  />
                  {item.name}
                </div>
                {item.badge && (
                  <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center">
                    {item.badge > 99 ? "99+" : item.badge}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center p-3 rounded-lg bg-gray-50">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mr-3">
              <User size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.username}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mr-4"
              >
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {location.pathname === "/dashboard"
                    ? "Dashboard"
                    : location.pathname === "/projects"
                    ? "Projects"
                    : location.pathname === "/my-tasks"
                    ? "My Tasks"
                    : location.pathname === "/notifications"
                    ? "Notifications"
                    : location.pathname.startsWith("/project")
                    ? "Project Details"
                    : "ProjectHub"}
                </h2>
                <p className="text-sm text-gray-600">
                  {location.pathname === "/dashboard"
                    ? "Manage your projects and tasks"
                    : location.pathname === "/projects"
                    ? "View and manage all your projects"
                    : location.pathname === "/my-tasks"
                    ? "Tasks assigned to you"
                    : location.pathname === "/notifications"
                    ? "Stay updated with your work"
                    : "Collaborate with your team"}
                </p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${
                      isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
                    }`}
                  ></div>
                  <span>{isConnected ? "Online" : "Offline"}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
