import { useState } from "react";
import { Plus } from "lucide-react";
import TaskCard from "./TaskCard";

const KanbanBoard = ({ tasks, project, onTaskUpdated, onTaskDeleted }) => {
  const [draggedTask, setDraggedTask] = useState(null);

  const columns = [
    {
      id: "To Do",
      title: "To Do",
      bgColor: "bg-gray-100",
      borderColor: "border-gray-300",
    },
    {
      id: "In Progress",
      title: "In Progress",
      bgColor: "bg-blue-100",
      borderColor: "border-blue-300",
    },
    {
      id: "Done",
      title: "Done",
      bgColor: "bg-green-100",
      borderColor: "border-green-300",
    },
  ];

  const getTasksByStatus = (status) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      const updatedTask = { ...draggedTask, status: newStatus };
      onTaskUpdated(updatedTask);
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-6">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.id);

        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-80 ${column.bgColor} rounded-lg border-2 ${column.borderColor} p-4`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="font-semibold text-gray-800">{column.title}</h3>
                <span className="ml-2 bg-white bg-opacity-60 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
                  {columnTasks.length}
                </span>
              </div>
            </div>

            {/* Tasks */}
            <div className="space-y-3 min-h-[200px]">
              {columnTasks.map((task) => (
                <div
                  key={task._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                  className={`cursor-move transition-opacity ${
                    draggedTask && draggedTask._id === task._id
                      ? "opacity-50"
                      : ""
                  }`}
                >
                  <TaskCard
                    task={task}
                    project={project}
                    onTaskUpdated={onTaskUpdated}
                    onTaskDeleted={onTaskDeleted}
                  />
                </div>
              ))}

              {/* Empty state */}
              {columnTasks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="w-16 h-16 bg-white bg-opacity-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Plus size={24} className="text-gray-400" />
                  </div>
                  <p className="text-sm">
                    No tasks in {column.title.toLowerCase()}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
