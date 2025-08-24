import { useState } from "react";
import { X, Users } from "lucide-react";
import { projectAPI } from "../services/api";

const JoinProjectModal = ({ onClose, onProjectJoined }) => {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError("Please enter an invite code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await projectAPI.join(inviteCode.trim());
      onProjectJoined(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to join project");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); // Only allow alphanumeric
    setInviteCode(value);
    if (error) setError("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <Users size={20} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Join Project
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 text-sm">
            Enter the invite code shared by the project owner to join their team
            and start collaborating.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invite Code *
            </label>
            <input
              type="text"
              required
              className="input-field text-center text-lg font-mono tracking-wider"
              value={inviteCode}
              onChange={handleChange}
              placeholder="Enter invite code (e.g., ABC12345)"
              maxLength={20} // Allow up to 20 characters
              style={{ textTransform: "uppercase" }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Codes are typically 6-8 characters long
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              className="btn-primary flex-1"
            >
              {loading ? "Joining..." : "Join Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinProjectModal;
