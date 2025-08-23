import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Calendar, Users, ExternalLink } from "lucide-react";
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <ExternalLink size={16} />
            Join Project
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Create Project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <Users size={48} className="mx-auto mb-4" />
            <p className="text-lg">No projects yet</p>
            <p className="text-sm">
              Create a new project or join an existing one to get started
            </p>
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create Your First Project
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="btn-secondary"
            >
              Join a Project
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project._id}
              to={`/project/${project._id}`}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span>{project.members?.length || 0} members</span>
                  </div>
                  {project.deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>
                        {new Date(project.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400">
                  Owner: {project.owner?.username}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

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
