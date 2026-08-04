create the stub packages for AI, search, memory, and plugin SDK — these define the interfaces that future phases will implement:

cd forge && for pkg in ai search memory plugin-sdk; do
  cat > "packages/$pkg/package.json" << 'EOF'
{
  "name": "@forge/PKGNAME",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {}
}
EOF
  sed -i "s/PKGNAME/$pkg/" "packages/$pkg/package.json"
  
  cat > "packages/$pkg/tsconfig.json" << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF
done && echo "Created package.json + tsconfig for ai, search, memory, plugin-sdk"

Created package.json + tsconfig for ai, search, memory, plugin-sdk