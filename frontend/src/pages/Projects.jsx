import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Calendar,
  Users,
  ExternalLink,
  Search,
  Filter,
  FolderOpen,
  Crown,
  UserCheck,
  Clock,
  CheckCircle,
} from "lucide-react";
import { projectAPI } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import CreateProjectModal from "../components/CreateProjectModal";
import JoinProjectModal from "../components/JoinProjectModal";

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all"); // all, owned, joined
  const { user } = useAuth();

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

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterBy === "all"
        ? true
        : filterBy === "owned"
        ? project.owner._id === user?.id
        : filterBy === "joined"
        ? project.owner._id !== user?.id
        : true;

    return matchesSearch && matchesFilter;
  });

  const getProjectStats = () => {
    const owned = projects.filter((p) => p.owner._id === user?.id).length;
    const joined = projects.filter((p) => p.owner._id !== user?.id).length;
    const active = projects.filter(
      (p) => !p.deadline || new Date(p.deadline) > new Date()
    ).length;
    const completed = projects.filter(
      (p) => p.deadline && new Date(p.deadline) <= new Date()
    ).length;

    return { owned, joined, active, completed };
  };

  const stats = getProjectStats();

  const getProjectStatus = (project) => {
    if (!project.deadline) return "ongoing";
    const now = new Date();
    const deadline = new Date(project.deadline);
    const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return "overdue";
    if (daysLeft === 0) return "due-today";
    if (daysLeft <= 3) return "due-soon";
    return "ongoing";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "overdue":
        return "text-red-600 bg-red-50 border-red-200";
      case "due-today":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "due-soon":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-green-600 bg-green-50 border-green-200";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "overdue":
        return "Overdue";
      case "due-today":
        return "Due Today";
      case "due-soon":
        return "Due Soon";
      default:
        return "On Track";
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex justify-center items-center h-96">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading projects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Projects</h1>
          <p className="text-gray-600">
            Manage all your projects and collaborations in one place
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Owned</p>
              <p className="text-2xl font-bold text-gray-900">{stats.owned}</p>
            </div>
            <Crown size={24} className="text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Joined</p>
              <p className="text-2xl font-bold text-gray-900">{stats.joined}</p>
            </div>
            <UserCheck size={24} className="text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
            <Clock size={24} className="text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.completed}
              </p>
            </div>
            <CheckCircle size={24} className="text-purple-600" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Projects</option>
              <option value="owned">Owned by Me</option>
              <option value="joined">Joined Projects</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderOpen size={48} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {searchTerm || filterBy !== "all"
                ? "No projects found"
                : "No projects yet"}
            </h3>
            <p className="text-gray-500 leading-relaxed mb-8">
              {searchTerm || filterBy !== "all"
                ? "Try adjusting your search or filters to find what you're looking for."
                : "Get started by creating your first project or joining an existing team."}
            </p>
            {!searchTerm && filterBy === "all" && (
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
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const isOwner = project.owner._id === user?.id;
            const status = getProjectStatus(project);

            return (
              <Link
                key={project._id}
                to={`/project/${project._id}`}
                className="group block bg-white hover:shadow-lg rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 p-6"
              >
                <div className="space-y-4">
                  {/* Project Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-200">
                          <FolderOpen size={18} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                            {project.name}
                          </h3>
                          <div className="flex items-center mt-1">
                            {isOwner ? (
                              <div className="flex items-center text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                                <Crown size={12} className="mr-1" />
                                Owner
                              </div>
                            ) : (
                              <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                <UserCheck size={12} className="mr-1" />
                                Member
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {project.description && (
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-3">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Project Status */}
                  <div
                    className={`text-xs px-2 py-1 rounded-full border inline-flex items-center ${getStatusColor(
                      status
                    )}`}
                  >
                    <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
                    {getStatusText(status)}
                  </div>

                  {/* Project Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <Users size={16} className="mr-1" />
                      <span>
                        {project.members?.length || 0} member
                        {project.members?.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {project.deadline && (
                      <div className="flex items-center">
                        <Calendar size={16} className="mr-1" />
                        <span>
                          {new Date(project.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Project Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-400">
                      <span className="font-medium">Created by:</span>{" "}
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
            );
          })}
        </div>
      )}

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

export default Projects;
