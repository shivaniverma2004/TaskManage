const state = {
  token: localStorage.getItem("token"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  users: [],
  teams: [],
  projects: [],
  tasks: [],
  dashboard: null,
  activeView: "dashboard",
  selectedProjectId: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

function isAdmin() {
  return state.user?.role === "ADMIN";
}

function isProjectLeader(project) {
  return Boolean(project?.team?.leader?.id && state.user?.id === project.team.leader.id);
}

function canManageProjectTasks(project) {
  return isAdmin() || isProjectLeader(project);
}

function canManageTask(task) {
  return canManageProjectTasks(task.project);
}

function canOpenPrimaryAction() {
  if (state.activeView === "tasks") {
    return isAdmin() || state.projects.some(isProjectLeader);
  }
  return isAdmin();
}

function persistAuth(auth) {
  state.token = auth.token;
  state.user = auth.user;
  localStorage.setItem("token", auth.token);
  localStorage.setItem("user", JSON.stringify(auth.user));
}

function clearAuth() {
  state.token = null;
  state.user = null;
  state.users = [];
  state.teams = [];
  state.projects = [];
  state.tasks = [];
  state.dashboard = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function toggleAuth(mode) {
  $("#loginTab").classList.toggle("active", mode === "login");
  $("#signupTab").classList.toggle("active", mode === "signup");
  $("#loginForm").classList.toggle("hidden", mode !== "login");
  $("#signupForm").classList.toggle("hidden", mode !== "signup");
  $("#loginForm").reset();
  $("#signupForm").reset();
}

function setView(view) {
  state.activeView = view;
  $$(".view").forEach((el) => el.classList.add("hidden"));
  $(`#${view}View`).classList.remove("hidden");
  $$(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  const titles = {
    dashboard: ["Dashboard", "Overview"],
    projects: ["Projects", "Project details"],
    tasks: ["Tasks", "Task board"],
    team: ["Teams", "Team management"]
  };
  $("#viewEyebrow").textContent = titles[view][0];
  $("#viewTitle").textContent = titles[view][1];
  $("#primaryAction").classList.toggle("hidden", !canOpenPrimaryAction());
  $("#primaryAction").textContent = view === "tasks" ? "New task" : view === "team" ? "New team" : "New project";
}

function renderShell() {
  const loggedIn = Boolean(state.token && state.user);
  $("#authView").classList.toggle("hidden", loggedIn);
  $("#appView").classList.toggle("hidden", !loggedIn);
  if (!loggedIn) return;

  $("#welcomeTitle").textContent = state.user.name;
  $("#rolePill").textContent = state.user.role;
  $("#projectAccess").textContent = isAdmin() ? "Select a project to edit info, team, or tasks" : "Projects where you are a member";
  $("#taskAccess").textContent = isAdmin() ? "All workspace tasks" : "Tasks assigned to you";
  setView(state.activeView);
}

function projectTasks(projectId) {
  return state.tasks.filter((task) => task.project?.id === projectId);
}

function projectProgress(projectId) {
  const tasks = projectTasks(projectId);
  if (!tasks.length) return { total: 0, done: 0, percent: 0 };
  const done = tasks.filter((task) => task.status === "DONE").length;
  return { total: tasks.length, done, percent: Math.round((done / tasks.length) * 100) };
}

function renderStats() {
  const dashboard = state.dashboard || { projects: 0, tasks: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 };
  const items = [
    ["Projects", dashboard.projects],
    ["Tasks", dashboard.tasks],
    ["To do", dashboard.todo],
    ["In progress", dashboard.inProgress],
    ["Done", dashboard.done],
    ["Overdue", dashboard.overdue]
  ];
  $("#stats").innerHTML = items.map(([label, value]) => `
    <article class="stat">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
}

function renderProgress() {
  const totalTasks = state.tasks.length;
  const doneTasks = state.tasks.filter((task) => task.status === "DONE").length;
  const overall = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  $("#overallProgressLabel").textContent = `${overall}% complete`;
  $("#overallProgressBar").style.width = `${overall}%`;

  $("#progressList").innerHTML = state.projects.length ? state.projects.map((project) => {
    const progress = projectProgress(project.id);
    return `
      <button class="project-row" data-project-id="${project.id}" type="button">
        <span>
          <strong>${escapeHtml(project.name)}</strong>
          <small>${progress.done}/${progress.total} tasks complete</small>
        </span>
        <span class="progress-mini"><i style="width:${progress.percent}%"></i></span>
        <b>${progress.percent}%</b>
      </button>
    `;
  }).join("") : emptyState("No projects yet", "Create a project and add tasks to see progress.");
}

function renderDashboardTasks() {
  const sorted = [...state.tasks].sort((a, b) => (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31")).slice(0, 6);
  $("#dashboardTaskList").innerHTML = sorted.length ? sorted.map(taskCard).join("") : emptyState("No tasks to track", "Assigned tasks and overdue work will appear here.");
}

function renderUsersAndProjects() {
  const members = state.users;
  $("#projectMembers").innerHTML = members.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`).join("");
  $("#projectTeam").innerHTML = `<option value="">No team</option>` + state.teams.map((team) => `<option value="${team.id}">${escapeHtml(team.name)}</option>`).join("");
  $("#teamLeader").innerHTML = `<option value="">No leader</option>` + members.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`).join("");
  $("#teamMembers").innerHTML = members.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`).join("");
  $("#taskProject").innerHTML = state.projects.length ? state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("") : `<option value="">Create a project first</option>`;
  updateTaskAssigneeOptions();
}

function renderTeam() {
  $("#teamList").innerHTML = state.teams.length ? state.teams.map((team) => `
    <article class="team-card">
      <div>
        <strong>${escapeHtml(team.name)}</strong>
        <span>${escapeHtml(team.description || "No description added")}</span>
        <span>Leader: ${escapeHtml(team.leader?.name || "Not assigned")}</span>
        <span>${(team.members || []).length} members</span>
      </div>
      ${isAdmin() ? `<span class="actions"><button class="ghost small" data-edit-team="${team.id}" type="button">Edit</button><button class="danger small" data-delete-team="${team.id}" type="button">Delete</button></span>` : ""}
    </article>
  `).join("") : emptyState("No teams yet", isAdmin() ? "Create teams, choose members, and assign a leader." : "You have not been added to a team yet.");

  $("#userList").innerHTML = state.users.length ? state.users.map((user) => `
    <article class="team-card">
      <div>
        <strong>${escapeHtml(user.name)}</strong>
        <span>${escapeHtml(user.email)}</span>
      </div>
      <span class="actions">
        <span class="badge">${user.role}</span>
        ${isAdmin() && state.user?.id !== user.id ? `<button class="danger small" data-delete-user="${user.id}" type="button">Delete</button>` : ""}
      </span>
    </article>
  `).join("") : emptyState("No users yet", "Members can signup from the auth screen.");
}

function renderProjects() {
  if (!state.selectedProjectId && state.projects.length) {
    state.selectedProjectId = state.projects[0].id;
  }
  if (state.selectedProjectId && !state.projects.some((project) => project.id === state.selectedProjectId)) {
    state.selectedProjectId = state.projects[0]?.id || null;
  }

  $("#projectList").innerHTML = state.projects.length ? state.projects.map((project) => {
    const progress = projectProgress(project.id);
    return `
      <button class="project-card ${project.id === state.selectedProjectId ? "selected" : ""}" data-project-id="${project.id}" type="button">
        <span>
          <strong>${escapeHtml(project.name)}</strong>
          <small>${escapeHtml(project.team?.name || "No team")} · ${(project.members || []).length} members · ${progress.total} tasks</small>
        </span>
        <span class="progress-track"><i style="width:${progress.percent}%"></i></span>
      </button>
    `;
  }).join("") : emptyState("No projects yet", isAdmin() ? "Use New project to create one." : "You have not been added to a project yet.");

  renderProjectDetail();
}

function renderProjectDetail() {
  const project = state.projects.find((item) => item.id === state.selectedProjectId);
  if (!project) {
    $("#projectDetail").innerHTML = emptyState("Select a project", "Project info, members, tasks, and completion will show here.");
    return;
  }
  const progress = projectProgress(project.id);
  const tasks = projectTasks(project.id);
  $("#projectDetail").innerHTML = `
    <div class="detail-head">
      <div>
        <h3>${escapeHtml(project.name)}</h3>
        <p>${escapeHtml(project.description || "No description added")}</p>
        <p class="meta">Team: ${escapeHtml(project.team?.name || "No team assigned")}${project.team?.leader ? ` · Leader: ${escapeHtml(project.team.leader.name)}` : ""}</p>
      </div>
      ${isAdmin() ? `<div class="actions"><button class="ghost" data-edit-project="${project.id}" type="button">Edit</button><button class="danger" data-delete-project="${project.id}" type="button">Delete</button></div>` : ""}
    </div>
    <div class="completion">
      <div class="row"><strong>Completion</strong><span>${progress.done}/${progress.total} tasks done · ${progress.percent}%</span></div>
      <div class="progress-track"><i style="width:${progress.percent}%"></i></div>
    </div>
    <div class="section-title">Members</div>
    <div class="chip-row">${(project.members || []).map((member) => `<span class="chip">${escapeHtml(member.name)}</span>`).join("") || `<span class="meta">No members</span>`}</div>
    <div class="section-title">Project tasks</div>
    <div class="list">${tasks.length ? tasks.map(taskCard).join("") : emptyState("No tasks for this project", isAdmin() ? "Create a task and assign it to a member." : "No assigned work yet.")}</div>
  `;
}

function renderTasks() {
  $("#taskList").innerHTML = state.tasks.length ? state.tasks.map(taskCard).join("") : emptyState("No tasks yet", isAdmin() ? "Use New task to create and assign work." : "Tasks assigned to you will appear here.");
}

function taskCard(task) {
  const overdue = task.deadline && task.deadline < new Date().toISOString().slice(0, 10) && task.status !== "DONE";
  const statusClass = task.status === "DONE" ? "done" : overdue ? "warn" : "";
  const canManage = canManageTask(task);
  return `
    <article class="task-card">
      <div class="task-card-top">
        <div class="task-card-main">
          <strong>${escapeHtml(task.title)}</strong>
          <p>${escapeHtml(task.description || "No description added")}</p>
        </div>
        <span class="badge ${statusClass}">${task.status.replace("_", " ")}</span>
      </div>
      <div class="task-card-footer">
        <div class="task-meta">
          <span>${escapeHtml(task.project?.name || "No project")}</span>
          <span>${escapeHtml(task.project?.team?.name || "No team")}</span>
          <span>${escapeHtml(task.assignedTo?.name || "Unassigned")}</span>
          <span>Due ${task.deadline || "not set"}</span>
        </div>
        <div class="task-actions">
          <select class="status-select" data-task-id="${task.id}">
            ${["TODO", "IN_PROGRESS", "DONE"].map((status) => `<option value="${status}" ${task.status === status ? "selected" : ""}>${status.replace("_", " ")}</option>`).join("")}
          </select>
          ${canManage ? `<button class="ghost small" data-edit-task="${task.id}" type="button">Edit</button><button class="danger small" data-delete-task="${task.id}" type="button">Delete</button>` : ""}
        </div>
      </div>
    </article>
  `;
}

function emptyState(title, message) {
  return `<div class="empty-state"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span></div>`;
}

function renderAll() {
  renderShell();
  if (!state.token) return;
  renderStats();
  renderProgress();
  renderDashboardTasks();
  renderUsersAndProjects();
  renderTeam();
  renderProjects();
  renderTasks();
}

async function refresh() {
  if (!state.token) {
    renderAll();
    return;
  }
  try {
    const [dashboard, users, teams, projects, tasks] = await Promise.all([
      api("/api/dashboard"),
      api("/api/auth/users"),
      api("/api/teams"),
      api("/api/projects"),
      api("/api/tasks")
    ]);
    state.dashboard = dashboard;
    state.users = users;
    state.teams = teams;
    state.projects = projects;
    state.tasks = tasks;
    renderAll();
  } catch (error) {
    clearAuth();
    renderAll();
    showToast("Please log in again.");
  }
}

function formJson(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function openProjectDialog(project = null) {
  if (!isAdmin()) return;
  $("#projectForm").reset();
  $("#projectFormTitle").textContent = project ? "Edit project" : "Create project";
  $("#projectForm").elements.id.value = project?.id || "";
  $("#projectForm").elements.name.value = project?.name || "";
  $("#projectForm").elements.description.value = project?.description || "";
  $("#projectForm").elements.teamId.value = project?.team?.id || "";
  const memberIds = new Set((project?.members || []).map((member) => String(member.id)));
  Array.from($("#projectMembers").options).forEach((option) => {
    option.selected = memberIds.has(option.value);
  });
  $("#projectDialog").classList.remove("hidden");
}

function openTeamDialog(team = null) {
  if (!isAdmin()) return;
  $("#teamForm").reset();
  $("#teamFormTitle").textContent = team ? "Edit team" : "Create team";
  $("#teamForm").elements.id.value = team?.id || "";
  $("#teamForm").elements.name.value = team?.name || "";
  $("#teamForm").elements.description.value = team?.description || "";
  $("#teamForm").elements.leaderId.value = team?.leader?.id || "";
  const memberIds = new Set((team?.members || []).map((member) => String(member.id)));
  Array.from($("#teamMembers").options).forEach((option) => {
    option.selected = memberIds.has(option.value);
  });
  $("#teamDialog").classList.remove("hidden");
}

function openTaskDialog(task = null) {
  const manageableProjects = state.projects.filter(canManageProjectTasks);
  if (!manageableProjects.length) {
    showToast("Create a project before adding tasks.");
    return;
  }
  const taskProject = task?.project || manageableProjects.find((project) => project.id === state.selectedProjectId) || manageableProjects[0];
  $("#taskForm").reset();
  $("#taskFormTitle").textContent = task ? "Edit task" : "Create task";
  $("#taskProject").innerHTML = manageableProjects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("");
  $("#taskForm").elements.id.value = task?.id || "";
  $("#taskForm").elements.title.value = task?.title || "";
  $("#taskForm").elements.description.value = task?.description || "";
  $("#taskForm").elements.projectId.value = taskProject.id;
  updateTaskAssigneeOptions(taskProject.id, task?.assignedTo?.id || "");
  $("#taskForm").elements.deadline.value = task?.deadline || "";
  $("#taskDialog").classList.remove("hidden");
}

function closeDialogs() {
  $$(".dialog").forEach((dialog) => dialog.classList.add("hidden"));
}

function updateTaskAssigneeOptions(projectId = $("#taskProject")?.value, selectedId = $("#taskAssignee")?.value) {
  const project = state.projects.find((item) => String(item.id) === String(projectId));
  const members = project?.members?.length ? project.members : state.users;
  $("#taskAssignee").innerHTML = `<option value="">Unassigned</option>` + members.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`).join("");
  $("#taskAssignee").value = selectedId && members.some((user) => String(user.id) === String(selectedId)) ? String(selectedId) : "";
}

$("#loginTab").addEventListener("click", () => toggleAuth("login"));
$("#signupTab").addEventListener("click", () => toggleAuth("signup"));

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const auth = await api("/api/auth/login", { method: "POST", body: JSON.stringify(formJson(event.target)) });
    persistAuth(auth);
    event.target.reset();
    await refresh();
  } catch (error) {
    showToast("Login failed. Check your email and password.");
  }
});

$("#signupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = formJson(event.target);
    payload.role = "MEMBER";
    const auth = await api("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) });
    persistAuth(auth);
    event.target.reset();
    await refresh();
  } catch (error) {
    showToast("Signup failed. Email may already be registered.");
  }
});

$("#logoutButton").addEventListener("click", () => {
  clearAuth();
  $("#loginForm").reset();
  $("#signupForm").reset();
  renderAll();
});

$$(".nav-button").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

$("#primaryAction").addEventListener("click", () => {
  if (state.activeView === "tasks") {
    openTaskDialog();
  } else if (state.activeView === "team") {
    openTeamDialog();
  } else {
    openProjectDialog();
  }
});

$$(".dialog-close").forEach((button) => button.addEventListener("click", closeDialogs));

$("#projectForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const payload = {
    name: form.elements.name.value,
    description: form.elements.description.value,
    teamId: form.elements.teamId.value ? Number(form.elements.teamId.value) : null,
    memberIds: Array.from($("#projectMembers").selectedOptions).map((option) => Number(option.value))
  };
  const id = form.elements.id.value;
  try {
    const saved = await api(id ? `/api/projects/${id}` : "/api/projects", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    state.selectedProjectId = saved.id;
    closeDialogs();
    await refresh();
    showToast(id ? "Project updated." : "Project created.");
  } catch (error) {
    showToast("Could not save project.");
  }
});

$("#projectTeam").addEventListener("change", (event) => {
  const team = state.teams.find((item) => String(item.id) === event.target.value);
  const memberIds = new Set((team?.members || []).map((member) => String(member.id)));
  Array.from($("#projectMembers").options).forEach((option) => {
    option.selected = memberIds.has(option.value);
  });
});

$("#taskProject").addEventListener("change", (event) => updateTaskAssigneeOptions(event.target.value, ""));

$("#teamForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const leaderId = form.elements.leaderId.value ? Number(form.elements.leaderId.value) : null;
  const memberIds = Array.from($("#teamMembers").selectedOptions).map((option) => Number(option.value));
  if (leaderId && !memberIds.includes(leaderId)) {
    memberIds.push(leaderId);
  }
  const payload = {
    name: form.elements.name.value,
    description: form.elements.description.value,
    leaderId,
    memberIds
  };
  const id = form.elements.id.value;
  try {
    await api(id ? `/api/teams/${id}` : "/api/teams", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    closeDialogs();
    await refresh();
    showToast(id ? "Team updated." : "Team created.");
  } catch (error) {
    showToast("Could not save team.");
  }
});

$("#taskForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const payload = {
    title: form.elements.title.value,
    description: form.elements.description.value,
    projectId: Number(form.elements.projectId.value),
    assignedToId: form.elements.assignedToId.value ? Number(form.elements.assignedToId.value) : null,
    deadline: form.elements.deadline.value || null,
    status: "TODO"
  };
  const id = form.elements.id.value;
  const oldTask = state.tasks.find((task) => String(task.id) === id);
  if (oldTask) payload.status = oldTask.status;
  try {
    await api(id ? `/api/tasks/${id}` : "/api/tasks", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    closeDialogs();
    await refresh();
    showToast(id ? "Task updated." : "Task created.");
  } catch (error) {
    showToast("Could not save task.");
  }
});

document.addEventListener("click", async (event) => {
  const projectButton = event.target.closest("[data-project-id]");
  if (projectButton) {
    state.selectedProjectId = Number(projectButton.dataset.projectId);
    setView("projects");
    renderProjects();
    return;
  }

  const editProject = event.target.closest("[data-edit-project]");
  if (editProject) {
    openProjectDialog(state.projects.find((project) => project.id === Number(editProject.dataset.editProject)));
    return;
  }

  const deleteProject = event.target.closest("[data-delete-project]");
  if (deleteProject && confirm("Delete this project and all of its tasks?")) {
    await api(`/api/projects/${deleteProject.dataset.deleteProject}`, { method: "DELETE" });
    state.selectedProjectId = null;
    await refresh();
    showToast("Project deleted.");
    return;
  }

  const editTask = event.target.closest("[data-edit-task]");
  if (editTask) {
    openTaskDialog(state.tasks.find((task) => task.id === Number(editTask.dataset.editTask)));
    return;
  }

  const deleteTask = event.target.closest("[data-delete-task]");
  if (deleteTask && confirm("Delete this task?")) {
    await api(`/api/tasks/${deleteTask.dataset.deleteTask}`, { method: "DELETE" });
    await refresh();
    showToast("Task deleted.");
    return;
  }

  const editTeam = event.target.closest("[data-edit-team]");
  if (editTeam) {
    openTeamDialog(state.teams.find((team) => team.id === Number(editTeam.dataset.editTeam)));
    return;
  }

  const deleteTeam = event.target.closest("[data-delete-team]");
  if (deleteTeam && confirm("Delete this team? Projects will keep their members but lose the team link.")) {
    await api(`/api/teams/${deleteTeam.dataset.deleteTeam}`, { method: "DELETE" });
    await refresh();
    showToast("Team deleted.");
  }

  const deleteUser = event.target.closest("[data-delete-user]");
  if (deleteUser && confirm("Delete this user? They will be removed from teams/projects and their tasks will be unassigned.")) {
    try {
      await api(`/api/users/${deleteUser.dataset.deleteUser}`, { method: "DELETE" });
      await refresh();
      showToast("User deleted.");
    } catch (error) {
      showToast("Could not delete user.");
    }
  }
});

document.addEventListener("change", async (event) => {
  if (!event.target.matches(".status-select")) return;
  try {
    await api(`/api/tasks/${event.target.dataset.taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: event.target.value })
    });
    await refresh();
    showToast("Task status updated.");
  } catch (error) {
    showToast("You cannot update this task.");
    await refresh();
  }
});

renderAll();
refresh();
