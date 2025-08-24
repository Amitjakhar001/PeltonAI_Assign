import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth.jsx";
import { SocketProvider } from "./hooks/useSocket.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Projects from "./pages/Projects.jsx";
import ProjectDetail from "./pages/ProjectDetail.jsx";
import MyTasks from "./pages/MyTasks.jsx";
import Notifications from "./pages/Notifications.jsx";

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="projects" element={<Projects />} />
                <Route path="project/:id" element={<ProjectDetail />} />
                <Route path="my-tasks" element={<MyTasks />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
