import { createContext, useContext, useState, useEffect } from "react";

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

            // Skip token verification to avoid rate limiting
            // The token will be validated when the user makes API requests
            console.log("✅ User session restored from localStorage");
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
