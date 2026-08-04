[[FORGE]]

Namespace {          

workspace.*  {
("open, info, close, recent")
};

file.*  {
("read, write, list, create, delete, rename, move, watch)
};

markdown.* {
(parse, links, backlinks)
};

git.* {
("status, branches, diff, commit, push, pull,  checkout, branch.create, log,stage, unstage, commit, uncommit")
};

meta.* {
("project.get, project.update, goal.create, goal.update, task.list, task.create, task.update")
};

ai.* {
("query, assembleContext, provider.confg("phase 2+"))
};

search.* {
("semantic, keyword('Phase 2+')")
};
