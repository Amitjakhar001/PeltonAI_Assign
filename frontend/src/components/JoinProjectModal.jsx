import { useState } from "react";
import { X } from "lucide-react";
import { projectAPI } from "../services/api";

const JoinProjectModal = ({ onClose, onProjectJoined }) => {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await projectAPI.join(inviteCode);
      onProjectJoined(response.data.project);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to join project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Join Project</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invite Code *
            </label>
            <input
              type="text"
              required
              className="input-field"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter invite code"
              maxLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Ask your project owner for the 8-character invite code
            </p>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

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
              disabled={loading || !inviteCode}
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
