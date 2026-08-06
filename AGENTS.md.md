# FORGE Agent Architecture

The AI is not the owner of the workspace and is not the primary application interface.

The AI is one subsystem inside the FORGE operating environment. Its role is to reason over bounded project context, explain the workspace, propose changes, and invoke explicitly granted tools.

The project folder remains the source of truth. Files, Git history, documentation, conversations, goals, tasks, and durable memory belong to the workspace—not to the model.

The model may change. The workspace intelligence layer must remain stable.