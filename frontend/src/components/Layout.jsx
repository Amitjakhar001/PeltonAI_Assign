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
    console.log("🔍 Layout socket effect triggered:", {
      hasSocket: !!socket,
      isConnected: socket?.connected,
      socketType: typeof socket,
    });

    if (socket && socket.connected && typeof socket.on === "function") {
      console.log("🔌 Setting up newNotification listener in Layout");

      const handleNewNotification = () => {
        console.log("📬 Layout: New notification received, incrementing count");
        setUnreadCount((prev) => prev + 1);
      };

      socket.on("newNotification", handleNewNotification);

      return () => {
        console.log("🧹 Layout: Cleaning up newNotification listener");
        if (socket && typeof socket.off === "function") {
          socket.off("newNotification", handleNewNotification);
        }
      };
    }
  }, [socket, socket?.connected]);

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

  // In Layout.jsx, update the return statement:
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
        }`}
      >
        {/* Sidebar content */}
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between h-16 px-6 bg-blue-600">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FolderOpen className="h-8 w-8 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-white">TaskFlow</h1>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-md text-blue-200 hover:text-white hover:bg-blue-700 lg:hidden"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Connection status */}
          <div className="px-6 py-3 border-b border-gray-200">
            <div className="flex items-center text-sm">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500 mr-2" />
                  <span className="text-red-600">Disconnected</span>
                </>
              )}
            </div>
          </div>

          {/* Navigation - with flex-1 and overflow-y-auto */}
          <nav className="flex-1 overflow-y-auto mt-6 px-3">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      item.current
                        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon
                      className={`mr-3 h-5 w-5 ${
                        item.current ? "text-blue-500" : "text-gray-400"
                      }`}
                    />
                    {item.name}
                    {item.badge && (
                      <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User profile - fixed at bottom */}
          <div className="flex-shrink-0 p-6 border-t border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700">
                  {user?.username}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-3 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">TaskFlow</h1>
            <div className="w-10" /> {/* Spacer */}
          </div>
        </div>

        {/* Page content - with proper overflow */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
