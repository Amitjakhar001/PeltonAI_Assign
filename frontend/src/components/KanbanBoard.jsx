import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { taskAPI } from "../services/api";
import TaskCard from "./TaskCard";

const KanbanBoard = ({ tasks, project, onTaskUpdated, onTaskDeleted }) => {
  const columns = [
    { id: "To Do", title: "To Do" },
    { id: "In Progress", title: "In Progress" },
    { id: "Done", title: "Done" },
  ];

  const getTasksByStatus = (status) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    try {
      const response = await taskAPI.update(draggableId, {
        status: destination.droppableId,
      });
      onTaskUpdated(response.data);
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div key={column.id} className="bg-gray-100 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">
              {column.title} ({getTasksByStatus(column.id).length})
            </h3>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[200px] space-y-3 ${
                    snapshot.isDraggingOver ? "bg-blue-50" : ""
                  } transition-colors rounded-lg p-2`}
                >
                  {getTasksByStatus(column.id).map((task, index) => (
                    <Draggable
                      key={task._id}
                      draggableId={task._id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`${
                            snapshot.isDragging ? "rotate-2 shadow-lg" : ""
                          } transition-all`}
                        >
                          <TaskCard
                            task={task}
                            project={project}
                            onTaskUpdated={onTaskUpdated}
                            onTaskDeleted={onTaskDeleted}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;











