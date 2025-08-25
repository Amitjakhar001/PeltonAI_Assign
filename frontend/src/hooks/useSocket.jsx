import {
  useContext,
  createContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./useAuth";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context; // Can be null if not connected
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const connectionAttempts = useRef(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      console.log("🧹 Cleaning up socket connection");
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocket(null);
    setIsConnected(false);
    connectionAttempts.current = 0;
  }, []);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (!user || !token) {
      console.log("❌ Cannot initialize socket: missing user or token");
      return;
    }

    // Clean up existing connection
    cleanup();

    console.log("🔌 Initializing socket connection for:", user.username);
    console.log("🔑 Using token:", token.substring(0, 20) + "...");

    const newSocket = io("http://localhost:5000", {
      auth: {
        token: token,
        userId: user.id,
        username: user.username,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
      autoConnect: true,
      forceNew: false,
    });

    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      console.log("✅ Socket connected with ID:", newSocket.id);
      setSocket(newSocket);
      setIsConnected(true);
      connectionAttempts.current = 0;

      // Test the connection
      newSocket.emit("testNotification", {
        message: "Connection test",
        userId: user.id,
        username: user.username,
      });
    });

    newSocket.on("connected", (data) => {
      console.log("🎉 Server confirmed connection:", data);
    });

    newSocket.on("testNotificationResponse", (data) => {
      console.log("🧪 Test notification response:", data);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);
      connectionAttempts.current++;

      if (reason !== "io client disconnect") {
        console.log(
          "🔄 Will attempt to reconnect... (attempt",
          connectionAttempts.current,
          ")"
        );
      } else {
        setSocket(null);
      }
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      setIsConnected(false);
      connectionAttempts.current++;

      // If authentication error, don't keep trying
      if (error.message.includes("Authentication")) {
        console.error("🚫 Authentication error - stopping connection attempts");
        cleanup();
        return;
      }
    });

    newSocket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
      setSocket(newSocket);
      setIsConnected(true);
      connectionAttempts.current = 0;
    });

    newSocket.on("reconnect_error", (error) => {
      console.error("❌ Socket reconnection failed:", error.message);
    });

    newSocket.on("reconnect_failed", () => {
      console.error("❌ Socket reconnection failed permanently");
      setSocket(null);
      setIsConnected(false);
    });

    // Global socket event listeners
    newSocket.on("notification", (data) => {
      console.log("🔔 Notification received:", data);
    });

    newSocket.on("newNotification", (notification) => {
      console.log("🔔 New notification received:", notification);
    });

    newSocket.on("error", (error) => {
      console.error("❌ Socket error:", error);
    });
  }, [user, token, cleanup]);

  // Effect to handle socket initialization
  useEffect(() => {
    if (user && token) {
      // Initialize socket immediately instead of using timer
      console.log("🚀 Initializing socket immediately");
      initializeSocket();
    } else {
      // User logged out, cleanup immediately
      console.log("🧹 No user/token, cleaning up");
      cleanup();
    }
  }, [user, token, initializeSocket, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Enhanced socket object with connection status
  const socketWithStatus = socket
    ? {
        ...socket,
        connected: isConnected,
      }
    : null;

  // Debug info
  useEffect(() => {
    const interval = setInterval(() => {
      if (socket) {
        console.log("🔍 Socket status:", {
          connected: isConnected,
          id: socket.id,
          userId: user?.id,
          username: user?.username,
        });
      }
    }, 30000); // Log every 30 seconds instead of 10

    return () => clearInterval(interval);
  }, [socket, isConnected, user]);

  return (
    <SocketContext.Provider value={socketWithStatus}>
      {children}
    </SocketContext.Provider>
  );
};
