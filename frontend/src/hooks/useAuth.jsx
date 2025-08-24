import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth data on mount
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        console.log("🔍 Checking stored auth data...");
        console.log("Token exists:", !!storedToken);
        console.log("User data exists:", !!storedUser);

        if (storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            console.log("📦 Restoring user session for:", parsedUser.username);

            // Set the auth state immediately
            setToken(storedToken);
            setUser(parsedUser);

            // Verify token is still valid (optional - comment out if causing issues)
            try {
              const response = await authAPI.getProfile();
              console.log("✅ Token verification successful");
              // Update user data if API returns newer info
              if (response.data) {
                setUser(response.data);
                localStorage.setItem("user", JSON.stringify(response.data));
              }
            } catch (error) {
              console.log(
                "❌ Token verification failed:",
                error.response?.status
              );
              if (error.response?.status === 401) {
                console.log("🔄 Token expired, clearing auth data");
                logout();
              }
              // If it's a network error, keep the user logged in
            }
          } catch (parseError) {
            console.error("❌ Error parsing stored user data:", parseError);
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
        } else {
          console.log("📝 No stored auth data found");
        }
      } catch (error) {
        console.error("❌ Error initializing auth:", error);
      } finally {
        setLoading(false);
        console.log("✅ Auth initialization complete");
      }
    };

    initializeAuth();
  }, []);

  const login = (userData, authToken) => {
    console.log("🔐 User logged in:", userData.username);
    console.log("💾 Storing auth data in localStorage");

    setUser(userData);
    setToken(authToken);

    // Store in localStorage
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(userData));

    console.log("✅ Login complete and data stored");
  };

  const logout = () => {
    console.log("🚪 User logged out");
    console.log("🗑️ Clearing auth data from localStorage");

    setUser(null);
    setToken(null);

    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    console.log("✅ Logout complete and data cleared");
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
  };

  // Don't render children until auth is initialized
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
