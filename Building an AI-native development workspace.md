Let me start scaffolding the entire monorepo. I’ll create the root config files first, then build out each package.

mkdir -p forge && cd forge && mkdir -p apps/desktop/src/{main/preload,renderer/src/{components/{editor,explorer,git,dashboard,common,graph},hooks,stores,styles,types,utils}} apps/desktop/resources packages/{ipc,workspace,git,storage,ai,search,memory,plugin-sdk}/src && echo "Directory structure created"



