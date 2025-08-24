import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Calendar,
  Users,
  ExternalLink,
  Clock,
  TrendingUp,
  BarChart3,
  FolderOpen,
  Target,
  Activity,
} from "lucide-react";
import { projectAPI } from "../services/api";
import CreateProjectModal from "../components/CreateProjectModal";
import JoinProjectModal from "../components/JoinProjectModal";

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = (newProject) => {
    setProjects([newProject, ...projects]);
    setShowCreateModal(false);
  };

  const handleProjectJoined = (project) => {
    setProjects([project, ...projects]);
    setShowJoinModal(false);
  };

  const getProjectStats = () => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(
      (p) => new Date(p.deadline) > new Date() || !p.deadline
    ).length;
    const completedProjects = projects.filter(
      (p) => p.deadline && new Date(p.deadline) <= new Date()
    ).length;
    const totalMembers = new Set(
      projects.flatMap((p) => p.members?.map((m) => m._id) || [])
    ).size;

    return { totalProjects, activeProjects, completedProjects, totalMembers };
  };

  const stats = getProjectStats();

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex justify-center items-center h-96">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl text-white p-8 shadow-xl">
        <div className="max-w-4xl">
          <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
          <p className="text-blue-100 text-lg">
            Here's an overview of your projects and team collaboration
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Total Projects
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalProjects}
              </p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <BarChart3 size={24} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Active Projects
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeProjects}
              </p>
              <p className="text-xs text-green-600 mt-1">In progress</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Activity size={24} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Team Members
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalMembers}
              </p>
              <p className="text-xs text-blue-600 mt-1">Collaborating</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Users size={24} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Completed
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.completedProjects}
              </p>
              <p className="text-xs text-orange-600 mt-1">Finished</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Target size={24} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Your Projects
            </h2>
            <p className="text-gray-600">
              Manage and track all your project progress in one place
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <button
              onClick={() => setShowJoinModal(true)}
              className="bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors border border-gray-200 flex items-center justify-center"
            >
              <ExternalLink size={18} className="mr-2" />
              Join Project
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-lg shadow-blue-600/25 flex items-center justify-center"
            >
              <Plus size={18} className="mr-2" />
              New Project
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <FolderOpen size={48} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                No projects yet
              </h3>
              <p className="text-gray-500 leading-relaxed mb-8">
                Get started by creating your first project or joining an
                existing team. Collaborate, organize, and achieve your goals
                together.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-lg shadow-blue-600/25 flex items-center justify-center"
                >
                  <Plus size={20} className="mr-2" />
                  Create Your First Project
                </button>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors border border-gray-200 flex items-center justify-center"
                >
                  <ExternalLink size={20} className="mr-2" />
                  Join a Team
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project._id}
                to={`/project/${project._id}`}
                className="group block bg-gray-50 hover:bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 p-5"
              >
                <div className="space-y-4">
                  {/* Project Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-200">
                          <FolderOpen size={18} className="text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                          {project.name}
                        </h3>
                      </div>
                      {project.description && (
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Project Stats */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <Users size={16} className="mr-2" />
                      <span>
                        {project.members?.length || 0} member
                        {project.members?.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {project.deadline && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar size={16} className="mr-2" />
                        <span>
                          {new Date(project.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Project Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-400">
                      <span className="font-medium">Owner:</span>{" "}
                      {project.owner?.username}
                    </div>
                    <div className="flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700 transition-colors">
                      <span>Open</span>
                      <ExternalLink
                        size={14}
                        className="ml-1 group-hover:translate-x-1 transition-transform"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onProjectCreated={handleProjectCreated}
        />
      )}

      {showJoinModal && (
        <JoinProjectModal
          onClose={() => setShowJoinModal(false)}
          onProjectJoined={handleProjectJoined}
        />
      )}
    </div>
  );
};

export default Dashboard;
