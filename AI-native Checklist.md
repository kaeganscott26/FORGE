1. Scaffold monorepo structure {
(apps/desktop, packages/*)
};

2. Set up Electron + React + TypeScript + Vite build config

3. Build typed IPC contract layer {
(packages/ipc)
};

4.  Implement Filesystem:
 Workspace service {
(packages/workspace)
};

5. Implement Git Integration service {
(packages/workspaces)
};

6. Implement SQLite metadata storage {
(packages/storage)
};

7. Build renderer UI: {
layout shell, file explorer, Monaco editor, markdown preview
};
 8. Build Git panel {
 (status, branch, diff, commit)
 };
9. Build project dashboard shell

10. Create stub interface for AI/memory/search/plugin/package

11. Wire everything together and verify build

12. After a successfull build, commit the projects first commit at the canonical github repo:
git remote add origin https://github.com/kaeganscott26/FORGE.git
git branch -M main
git push -u origin main


