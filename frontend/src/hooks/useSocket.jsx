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
  }, []);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (!user || !token || !mountedRef.current) return;

    // Clean up existing connection
    cleanup();

    console.log("🔌 Initializing socket connection for:", user.username);

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
      reconnectionAttempts: 3,
      timeout: 10000,
      autoConnect: true,
      forceNew: false, // Don't force new connection unless necessary
    });

    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      if (!mountedRef.current) return;
      console.log("✅ Socket connected with ID:", newSocket.id);
      setSocket(newSocket);
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      if (!mountedRef.current) return;

      setIsConnected(false);

      // Only set socket to null if component is still mounted
      if (reason !== "io client disconnect") {
        // Server-side disconnect, keep socket reference for reconnection
        console.log("🔄 Will attempt to reconnect...");
      } else {
        // Client-side disconnect, clear socket
        setSocket(null);
      }
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      if (mountedRef.current) {
        setIsConnected(false);
        // Don't set socket to null immediately, let reconnection handle it
      }
    });

    newSocket.on("reconnect", (attemptNumber) => {
      if (!mountedRef.current) return;
      console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
      setSocket(newSocket);
      setIsConnected(true);
    });

    newSocket.on("reconnect_error", (error) => {
      console.error("❌ Socket reconnection failed:", error.message);
    });

    newSocket.on("reconnect_failed", () => {
      console.error("❌ Socket reconnection failed permanently");
      if (mountedRef.current) {
        setSocket(null);
        setIsConnected(false);
      }
    });

    // Global socket event listeners
    newSocket.on("notification", (data) => {
      console.log("🔔 Notification received:", data);
    });

    newSocket.on("error", (error) => {
      console.error("❌ Socket error:", error);
    });
  }, [user, token, cleanup]);

  // Effect to handle socket initialization
  useEffect(() => {
    if (user && token) {
      // Delay socket connection slightly to ensure auth is stable
      const timer = setTimeout(() => {
        initializeSocket();
      }, 500);

      return () => {
        clearTimeout(timer);
      };
    } else {
      // User logged out, cleanup immediately
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

  return (
    <SocketContext.Provider value={socketWithStatus}>
      {children}
    </SocketContext.Provider>
  );
};
