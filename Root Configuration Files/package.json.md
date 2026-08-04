{
  "name": "forge",
  "version": "0.1.0",
  "private": true,
  "description": "AI-native development workspace — a second brain, IDE, documentation system, and AI assistant in one coherent workspace",
  "license": "MIT",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=apps/desktop",
    "build": "npm run build --workspaces --if-present",
    "build:desktop": "npm run build --workspace=apps/desktop",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf apps/*/dist apps/*/out packages/*/dist"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
