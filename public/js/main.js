// App State
const appState = {
	// Settings
	activeSemesterId: null,
	theme: "system",
	// Dashboard
	semesters: [],
	modules: [],
	assignments: [],
	semesterById: new Map(),
	moduleById: new Map(),
	assignmentById: new Map(),
	// Assignment
	assignment: null,
	module: null,
	tasks: [],
	taskById: new Map()
};

// Variables
const MODULE_COLOUR_PRESETS = [
  "#3B82F6",
  "#22C55E",
  "#F97316",
  "#A855F7",
  "#EF4444",
  "#14B8A6",
  "#EAB308",
  "#6366F1",
  "#EC4899",
  "#84CC16",
];

let showCompletedAssignments = false;

// Request Helpers
async function requestJson(method, url, data) {
	const options = {
		method,
		headers: { "Accept": "application/json" },
		credentials: "same-origin",
	};

	if (data !== undefined) {
		options.headers["Content-Type"] = "application/json";
		options.body = JSON.stringify(data);
	}

	const res = await fetch(url, options);

	let payload = null;
	try { payload = await res.json(); } catch (_) {}

	if (!res.ok) {
		const msg = payload?.message || `Request failed (${res.status})`;
		const err = new Error(msg);
		err.status = res.status;
		err.payload = payload;
		throw err;
	}

	return payload;
}

const getJson = (url) => requestJson("GET", url);
const postJson = (url, data) => requestJson("POST", url, data);
const patchJson = (url, data) => requestJson("PATCH", url, data);
const deleteJson = (url) => requestJson("DELETE", url);

// App State Functions
async function loadSettings() {
	try {
		const payload = await getJson("/api/settings");
		const settings = payload.settings;

		appState.activeSemesterId = settings.activeSemesterId;
		appState.theme = settings.theme;

		applyTheme(appState.theme);

		return settings;
	} catch (err) {
		if (err.status === 401) return null;
		throw err;
	}
}

function applyTheme(theme) {
	if (theme === "system") {
    	document.documentElement.removeAttribute("data-theme");
  	} else {
    	document.documentElement.setAttribute("data-theme", theme);
  	}
}

function getRouteName() {
	return document.querySelector("main.page")?.dataset.page ?? null;
}

function getRouteContext(name) {
	const main = document.querySelector("main.page");

	if (name === "dashboard") return { scope: "dashboard" };
	if (name === "assignment") return { scope: "assignment", assignmentId: Number(main.dataset.assignmentId) };

	return { scope: "settings" };
}

async function loadAppState({ scope, assignmentId } = {}) {
	const settings = await loadSettings();
	if (!settings) return null;

	if (scope === "dashboard") {
		await loadDashboardData(settings.activeSemesterId);
		return settings;
	}

	if (scope === "assignment") {
		await loadAssignmentData(assignmentId);
		return settings;
	}

	return settings;
}

async function loadDashboardData(activeSemesterId) {
	const semestersPayload = await getJson("/api/semesters");
	const semesters = semestersPayload.semesters;

	semesters.sort((a, b) => a.name.localeCompare(b.name));
	appState.semesters = semesters;
	appState.semesterById = new Map(semesters.map(s => [s.id, s]));

	if (!activeSemesterId) {
		appState.modules = [];
		appState.assignments = [];
		appState.moduleById = new Map();
		return;
	}

	const [modulesPayload, assignmentsPayload] = await Promise.all([
		getJson(`/api/semesters/${activeSemesterId}/modules`),
		getJson(`/api/semesters/${activeSemesterId}/assignments`)
	]);

	const modules = modulesPayload.modules;
	const assignments = assignmentsPayload.assignments;

	modules.sort((a, b) => a.name.localeCompare(b.name));
	assignments.sort((a, b) => {
		const aTime = a.deadline ? new Date(a.deadline).getTime() : Infinity;
		const bTime = b.deadline ? new Date(b.deadline).getTime() : Infinity;
		return aTime - bTime;
	});

	appState.modules = modules;
	appState.assignments = assignments;
	appState.moduleById = new Map(modules.map(m => [m.id, m]));
	appState.assignmentById = new Map(assignments.map(a => [a.id, a]));

	appState.assignment = null;
	appState.module = null;
	appState.tasks = null;
	appState.taskById = new Map();
}

async function loadAssignmentData(assignmentId) {
	const assignmentPayload = await getJson(`/api/assignments/${assignmentId}`);
	const assignment = assignmentPayload.assignment;

	const [tasksPayload, modulePayload] = await Promise.all([
		getJson(`/api/assignments/${assignment.id}/tasks`),
		getJson(`/api/modules/${assignment.moduleId}`)
	]);

	const tasks = tasksPayload.tasks;
	const module = modulePayload.module;

	tasks.sort((a, b) => {
		const aTime = a.deadline ? new Date(a.deadline).getTime() : Infinity;
		const bTime = b.deadline ? new Date(b.deadline).getTime() : Infinity;
		return aTime - bTime;
	});

	appState.assignment = assignment;
	appState.module = module;
	appState.tasks = tasks;
	appState.taskById = new Map(tasks.map(t => [t.id, t]));

	appState.semesters = [];
	appState.modules = [];
	appState.assignments = [];
	appState.semesterById = new Map();
	appState.moduleById = new Map();
	appState.assignmentById = new Map();
}

// Global Helpers
function setAlert(alertEl, message) {
	if (message) {
		alertEl.textContent = message;
		alertEl.style.display = "block";
	} else {
		alertEl.textContent = "";
		alertEl.style.display = "none";
	}
}

function showToast(message, { type = "success", duration = 3000 } = {}) {
	const container = document.getElementById("toast-container");

	const toast = document.createElement("div");
	toast.className = `toast toast-${type}`;
	toast.textContent = message;

	container.appendChild(toast);

	requestAnimationFrame(() => {
		toast.classList.add("is-visible");
	});

	setTimeout(() => {
		toast.classList.remove("is-visible");

		setTimeout(() => {
			toast.remove();
		}, 160);
	}, duration);
}

function formatDueDate(iso) {
	if (!iso) return "No deadline";

	const due = new Date(iso);
	const now = new Date();

	const msPerDay = 86400000;
	const diffDays = Math.floor((due - now) / msPerDay);

	const time = new Intl.DateTimeFormat(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false
	}).format(due);

	const weekday = new Intl.DateTimeFormat(undefined, {
		weekday: "long"
	}).format(due);

	const shortWeekday = new Intl.DateTimeFormat(undefined, {
		weekday: "short"
	}).format(due);

	const day = new Intl.DateTimeFormat(undefined, {
		day: "numeric"
	}).format(due);

	const monthShort = new Intl.DateTimeFormat(undefined, {
		month: "short"
	}).format(due);

	const year = due.getFullYear();

	if (diffDays === 0) return `Today, ${time}`;
	if (diffDays === 1) return `Tomorrow, ${time}`;
	if (diffDays > 1 && diffDays <= 6) return `${weekday}, ${time}`;

	const sameMonth = due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear();
	const sameYear = due.getFullYear() === now.getFullYear();

	if (sameMonth) return `${shortWeekday} ${day}, ${time}`;
	if (sameYear) return `${day} ${monthShort}, ${time}`;

	return `${day} ${monthShort} ${year}, ${time}`;
}

function toUtcIso(datetimeLocal) {
	if (!datetimeLocal) return null;

	const date = new Date(datetimeLocal);
	return date.toISOString();
}

function toDatetimeLocal(isoString) {
  if (!isoString) return "";

  const date = new Date(isoString);

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

function formatMinutes(minutes) {
	if (minutes == null) return "";

	const h = Math.floor(minutes / 60);
	const m = minutes % 60;

	if (h && m) return `${h}h ${m}m`;
	if (h) return `${h}h`;
	return `${m}m`;
}

function renderEmptyListState(listEl, message) {
	listEl.innerHTML = "";

	const li = document.createElement("li");
	li.className = "ui-empty-list";

	li.textContent = message;

	listEl.appendChild(li);
}

function isOverdue(deadline) {
	if (!deadline) return false;
	const due = new Date(deadline);
	return due.getTime() < Date.now();
}

function pickRandomPresetModuleColour() {
	const used = new Set(appState.modules.map(m => m.colour));

	const available = MODULE_COLOUR_PRESETS.filter(c => !used.has(c));
	const pool = available.length ? available : MODULE_COLOUR_PRESETS;

	return pool[Math.floor(Math.random() * pool.length)];
}

// Modals
function initModals() {
	function openModal(modal) {
		modal.classList.add("is-open");
		document.body.classList.add("modal-open");

		const firstFocusable = modal.querySelector(
			'input:not([type="hidden"]), select, textarea, button'
		);
		if (firstFocusable) firstFocusable.focus();

		modal.dispatchEvent(new CustomEvent("modal:open"));
	}

	function closeModal(modal) {
		modal.classList.remove("is-open");
		document.body.classList.remove("modal-open");

		const form = modal.querySelector("form");
		if (form) form.reset();

		modal.querySelectorAll(".alert").forEach((alert) => {
			alert.style.display = "none";
			alert.textContent = "";
		});

		const dialog = modal.querySelector(".modal-dialog");
		if (dialog) dialog.classList.remove("is-invalid");
	}

	document.addEventListener("click", (e) => {
		const openBtn = e.target.closest("[data-modal-open]");
		if (openBtn) {
			const modalId = openBtn.dataset.modalOpen;
			const modal = document.getElementById(modalId);
			if (!modal) return;

			openModal(modal);
			return;
		}

		const closeBtn = e.target.closest("[data-modal-close]");
		if (closeBtn) {
			const modal = closeBtn.closest(".modal");
			if (!modal) return;

			closeModal(modal);
			return;
		}
	});

	document.addEventListener("keydown", (e) => {
		if (e.key !== "Escape") return;

		const modal = document.querySelector(".modal.is-open");
		if (!modal) return;

		closeModal(modal);
	});
}

// Dashboard
async function initDashboard() {
	if (getRouteName() !== "dashboard") return;

	const dateEl = document.querySelector(".dash-date");
	const timeEl = document.querySelector(".ui-time");
	const semesterNameEl = document.getElementById("active-semester-name");
	const modulesListEl = document.querySelector('[data-list="modules"]');
	const assignmentsListEl = document.querySelector('[data-list="assignments"]');
	const todayListEl = document.querySelector('[data-list="today"]');
	const newModuleBtnEl = document.querySelector('[data-modal-open="new-module-modal"]');
	const newAssignmentBtnEl = document.querySelector('[data-modal-open="new-assignment-modal"]');
	const moduleSelectEl = document.getElementById("na-module");
	const toggleCompletedBtnEl = document.getElementById("toggle-completed-btn");

	document.addEventListener("activeSemester:changed", async () => {
		await loadSettings();
		await refreshDashboard();
	});
	document.addEventListener("semester:created", refreshDashboard);
	document.addEventListener("semester:updated", refreshDashboard);
	document.addEventListener("semester:deleted", async () => {
		await loadSettings();
		await refreshDashboard();
	});
	document.addEventListener("module:created", refreshDashboard);
	document.addEventListener("module:updated", refreshDashboard);
	document.addEventListener("module:deleted", refreshDashboard);
	document.addEventListener("assignment:created", refreshDashboard);

	modulesListEl.addEventListener("click", (e) => {
		const btn = e.target.closest("button[data-module-id][data-action]");
		if (!btn) return;

		const moduleId = Number(btn.dataset.moduleId);

		if (btn.dataset.action === "edit") {
			openEditModuleModal(moduleId);
		} else if (btn.dataset.action === "delete") {
			openDeleteModuleModal(moduleId);
		}
	});
	toggleCompletedBtnEl.addEventListener("click", (e) => {
		e.preventDefault();

		showCompletedAssignments = !showCompletedAssignments;

		renderAssignmentsList(assignmentsListEl, {
			showCompleted: showCompletedAssignments
		});

		toggleCompletedBtnEl.textContent = showCompletedAssignments ? "Hide Completed" : "Show Completed";
	});
	toggleCompletedBtnEl.textContent = showCompletedAssignments ? "Hide Completed" : "Show Completed";

	setInterval(refreshDashboardClock, 1000);

	refreshDashboardClock();
	await refreshDashboard();

	async function refreshDashboard() {
		await loadDashboardData(appState.activeSemesterId);

		renderModulesList();
		renderAssignmentsList();
		renderTodayList();

		renderSemesterNameAndUpdateButtons();
		
		populateModuleSelect();
	}
	
	function refreshDashboardClock() {
		const now = new Date();

		const dateStr = now.toLocaleDateString(undefined, {
			weekday: "long",
			day: "numeric",
			month: "long"
		});

		const timeStr = now.toLocaleTimeString(undefined, {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false
		});

		dateEl.textContent = dateStr;
		timeEl.textContent = timeStr;
	}

	function renderModulesList() {
		if (!appState.modules.length) {
			renderEmptyListState(modulesListEl, "No modules yet. Create one to get started.");
			return;
		}

		modulesListEl.innerHTML = "";

		for (const m of appState.modules) {
			const li = document.createElement("li");
			li.className = "ui-item";

			const inner = document.createElement("div");
			inner.className = "ui-item-inner";

			const row = document.createElement("div");
			row.className = "ui-item-row";

			const dot = document.createElement("span");
			dot.className = "ui-dot";
			dot.style.backgroundColor = m.colour;

			const title = document.createElement("div");
			title.className = "ui-item-main";
			title.textContent = m.name;

			row.appendChild(dot);
			row.appendChild(title);

			const actions = document.createElement("div");
			actions.className = "ui-item-actions";

			const editBtn = document.createElement("button");
			editBtn.className = "icon-btn";
			editBtn.type = "button";
			editBtn.textContent = "✎";
			editBtn.dataset.moduleId = m.id;
			editBtn.dataset.action = "edit";

			const deleteBtn = document.createElement("button");
			deleteBtn.className = "icon-btn icon-btn-danger";
			deleteBtn.type = "button";
			deleteBtn.textContent = "✖";
			deleteBtn.dataset.moduleId = m.id;
			deleteBtn.dataset.action = "delete";

			actions.appendChild(editBtn);
			actions.appendChild(deleteBtn);

			inner.appendChild(row);
			inner.appendChild(actions);
			li.appendChild(inner);
			modulesListEl.appendChild(li);
		}
	}

	function renderAssignmentsList() {
		const assignments = showCompletedAssignments
			? appState.assignments 
			: appState.assignments.filter(a => a.status === "active");

		if (!assignments.length) {
			renderEmptyListState(assignmentsListEl, "No assignments yet. Create one to get started.");
			return;
		}

		assignmentsListEl.innerHTML = "";

		for (const a of assignments) {
			const mod = appState.moduleById.get(a.moduleId);
			const moduleName = mod?.name ?? "Unknown module";
			const moduleColour = mod?.colour ?? "#4f7cff";

			const overdue = a.status === "active" && isOverdue(a.deadline);
			const completed = a.status === "completed";

			const li = document.createElement("li");
			li.className = "ui-item";
			if (completed) li.classList.add("ui-item--completed");
			if (overdue) li.classList.add("ui-item--overdue");

			const link = document.createElement("a");
			link.className = "ui-item-link ui-item-inner";
			link.href = `/assignments/${a.id}`;

			const row = document.createElement("div");
			row.className = "ui-item-row";

			const dot = document.createElement("span");
			dot.className = "ui-dot";
			dot.style.backgroundColor = moduleColour;

			const title = document.createElement("div");
			title.className = "ui-item-main";
			title.textContent = a.name;

			row.appendChild(dot);
			row.appendChild(title);

			if (completed || overdue) {
				const badge = document.createElement("span");
				badge.className = "ui-item-status";
				badge.textContent = completed ? "Completed" : "Overdue";
				link.classList.add("ui-item-inner--has-badge");
				link.appendChild(badge);
			}

			const content = document.createElement("div");
			content.className = "ui-item-content";

			const meta1 = document.createElement("div");
			meta1.className = "ui-item-meta";
			meta1.textContent = moduleName;

			const meta2 = document.createElement("div");
			meta2.className = "ui-item-meta";
			meta2.textContent = `Due: ${formatDueDate(a.deadline)}`;

			content.appendChild(meta1);
			content.appendChild(meta2);

			link.appendChild(row);
			link.appendChild(content);

			li.appendChild(link);
			assignmentsListEl.appendChild(li);
		}
	}

	function renderTodayList() {
		if (true) {
			renderEmptyListState(todayListEl, "Nothing is scheduled today! 🥳");
			return;
		}
	}

	function renderSemesterNameAndUpdateButtons() {
		const hasActiveSemesterId = !!appState.activeSemesterId;
		const hasModules = appState.modules && appState.modules.length > 0;

		if (!hasActiveSemesterId) {
			semesterNameEl.textContent = "No semester selected";
			semesterNameEl.classList.add("warning-text");
		} else {
			const semester = appState.semesterById.get(appState.activeSemesterId);
			semesterNameEl.textContent = semester?.name ?? "";
			semesterNameEl.classList.remove("warning-text");
		}

		if (newModuleBtnEl) {
			newModuleBtnEl.disabled = !hasActiveSemesterId;
		}

		if (newAssignmentBtnEl) {
			newAssignmentBtnEl.disabled = !hasActiveSemesterId || !hasModules;
		}
	}

	function populateModuleSelect() {
		const placeholder = moduleSelectEl.querySelector('option[value=""]');
		moduleSelectEl.innerHTML = "";
		if (placeholder) moduleSelectEl.appendChild(placeholder);
		else {
			const opt = document.createElement("option");
			opt.value = "";
			opt.disabled = true;
			opt.selected = true;
			opt.textContent = "Select a module…";
			moduleSelectEl.appendChild(opt);
		}

		for (const m of appState.modules) {
			const opt = document.createElement("option");
			opt.value = String(m.id);
			opt.textContent = m.name;
			moduleSelectEl.appendChild(opt);
		}

		moduleSelectEl.value = "";
	}

	function openEditModuleModal(moduleId) {
		const m = appState.moduleById.get(moduleId);
		if (!m) return;

		const form = document.getElementById("edit-module-form");
		const modal = document.getElementById("edit-module-modal");
		if (!form || !modal) return;

		const errorEl = document.getElementById("em-error");
		setAlert(errorEl, "");

		form.querySelector("#em-id").value = m.id;
		form.querySelector("#em-name").value = m.name ?? "";
		form.querySelector("#em-credits").value = m.credits ?? "";
		form.querySelector("#em-colour").value = m.colour ?? "#3b82f6";
		form.querySelector("#em-colour-hex").value = (m.colour ?? "#3b82f6").toUpperCase();

		modal.classList.add("is-open");
		document.body.classList.add("modal-open");
	}

	async function openDeleteModuleModal(moduleId) {
		const modal = document.getElementById("delete-module-modal");
		const form = document.getElementById("delete-module-form");

		const errorEl = document.getElementById("dm-error");
		const msgEl = document.getElementById("dm-message");
		const countsEl = document.getElementById("dm-counts");

		setAlert(errorEl, "");
		countsEl.textContent = "";
		msgEl.textContent = "Are you sure you want to delete this module?";

		form.querySelector("#dm-id").value = moduleId;

		modal.classList.add("is-open");
		document.body.classList.add("modal-open");

		const m = appState.moduleById.get(Number(moduleId));
		const moduleName = m?.name || "this module";

		const aCount = (appState.assignments || []).reduce((acc, a) => {
			const aModuleId = a.moduleId ?? a.module_id;
			return acc + (Number(aModuleId) === Number(moduleId) ? 1 : 0);
		}, 0);

		msgEl.textContent = `Are you sure you want to delete “${moduleName}”?`;

		if (aCount > 0) {
			countsEl.textContent = `${aCount} assignment${aCount === 1 ? "" : "s"} will be deleted.`;
		} else {
			countsEl.textContent = "This module has no assignments.";
		}
	}
}

function initSemesterModal() {
	const modalEl = document.getElementById("semester-modal");
	if (!modalEl) return;

	const activeSelect = modalEl.querySelector("#sm-active");
	const semestersListEl = document.querySelector('[data-list="semesters"]');
	const listErrorEl = modalEl.querySelector("#sm-error");
	const formErrorEl = modalEl.querySelector("#sm-form-error");
	const newBtn = modalEl.querySelector("#sm-new-btn");
	const saveBtn = modalEl.querySelector("#sm-save-btn");
	const setActiveBtn = modalEl.querySelector("#sm-set-active-btn");
	const cancelFormBtn = modalEl.querySelector("#sm-cancel-form-btn");
	const formEl = modalEl.querySelector("#semester-form");
	const titleEl = modalEl.querySelector("#semester-modal-title");
	const screenList = modalEl.querySelector("#semester-screen-list");
	const screenForm = modalEl.querySelector("#semester-screen-form");
	const footerList = modalEl.querySelector("#semester-footer-list");
	const footerForm = modalEl.querySelector("#semester-footer-form");
	const idEl = modalEl.querySelector("#sm-id");
	const nameEl = modalEl.querySelector("#sm-name");
	const startEl = modalEl.querySelector("#sm-start");
	const endEl = modalEl.querySelector("#sm-end");

	document.addEventListener("click", async (e) => {
		const openBtn = e.target.closest('[data-modal-open="semester-modal"]');
		if (!openBtn) return;

		refreshModal();
		semesterModalShowListView();
	});
	semestersListEl.addEventListener("click", async (e) => {
		const btn = e.target.closest("button[data-semester-id][data-action]");
		if (!btn) return;

		const action = btn.dataset.action;
		const semesterId = btn.dataset.semesterId;

		if (action === "edit") {
			const semester = appState.semesters.find(s => String(s.id) === semesterId);
			if (!semester) return;

			semesterModalShowFormView("edit", semester);
			return;
		}
		if (action === "delete") {
			openDeleteSemesterModal(semesterId);
		}
	});
	setActiveBtn.addEventListener("click", async () => {
		const picked = activeSelect.value;
		if (!picked) return;

		try {
			await patchJson("/api/settings", { activeSemesterId: Number(picked) });

			document.dispatchEvent(new CustomEvent("activeSemester:changed"));

			await loadDashboardData(appState.activeSemesterId);
			refreshModal();
			setAlert(listErrorEl, "");

			showToast("Active semester changed.");
		} catch (err) {
			setAlert(listErrorEl, err.message);
			const dialog = formEl.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
	newBtn.addEventListener("click", () => {
		semesterModalShowFormView("new", null);
	});
	formEl.addEventListener("submit", async (e) => {
		e.preventDefault();

		setAlert(formErrorEl, "");

		const id = idEl.value;
		const name = nameEl.value;
		const startDate = startEl.value;
		const endDate = endEl.value;

		try {
			if (!id) {
				const res = await postJson("/api/semesters", { name, startDate, endDate });
				showToast(res.message);
				document.dispatchEvent(new CustomEvent("semester:created"));
			} else {
				const res = await patchJson(`/api/semesters/${Number(id)}`, { name, startDate, endDate });
				document.dispatchEvent(new CustomEvent("semester:updated"));
				showToast(res.message);
			}

			await loadDashboardData(appState.activeSemesterId);
			refreshModal();
			semesterModalShowListView();
		} catch (err) {
			setAlert(formErrorEl, err.message);
			const dialog = formEl.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
	cancelFormBtn.addEventListener("click", () => {
		refreshModal();
		semesterModalShowListView();
	});

	function refreshModal() {
		populateActiveSemesterSelect();
		renderSemestersList();
	}
	window.refreshModal = refreshModal;

	function renderSemestersList() {
		if (!appState.semesters.length) {
			renderEmptyListState(semestersListEl, "No semesters yet. Create one to get started.");
			return;
		}

		semestersListEl.innerHTML = "";

		for (const s of appState.semesters) {
			const li = document.createElement("li");
			li.className = "ui-item";

			const inner = document.createElement("div");
			inner.className = "ui-item-inner";

			const row = document.createElement("div");
			row.className = "ui-item-row";

			const title = document.createElement("div");
			title.className = "ui-item-main";
			title.textContent = s.name;

			row.appendChild(title);

			const actions = document.createElement("div");
			actions.className = "ui-item-actions";

			const editBtn = document.createElement("button");
			editBtn.className = "icon-btn";
			editBtn.type = "button";
			editBtn.textContent = "✎";
			editBtn.dataset.semesterId = s.id;
			editBtn.dataset.action = "edit";

			const deleteBtn = document.createElement("button");
			deleteBtn.className = "icon-btn icon-btn-danger";
			deleteBtn.type = "button";
			deleteBtn.textContent = "✖";
			deleteBtn.dataset.semesterId = s.id;
			deleteBtn.dataset.action = "delete";

			actions.appendChild(editBtn);
			actions.appendChild(deleteBtn);

			inner.appendChild(row);
			inner.appendChild(actions);

			li.appendChild(inner);
			semestersListEl.appendChild(li);
		}
	}

	function populateActiveSemesterSelect() {
		const placeholder = activeSelect.querySelector('option[value=""]');
		activeSelect.innerHTML = "";
		if (placeholder) activeSelect.appendChild(placeholder);
		else {
			const opt = document.createElement("option");
			opt.value = "";
			opt.disabled = true;
			opt.selected = true;
			opt.textContent = "Select a semester…";
			activeSelect.appendChild(opt);
		}

		for (const s of appState.semesters) {
			const opt = document.createElement("option");
			opt.value = String(s.id);
			opt.textContent = s.name;
			activeSelect.appendChild(opt);
		}

		if (appState.activeSemesterId != null) {
			activeSelect.value = String(appState.activeSemesterId);
		} else {
			activeSelect.value = "";
		}
	}

	function semesterModalShowListView() {
		screenList.style.display = "";
		screenForm.style.display = "none";
		footerList.style.display = "";
		footerForm.style.display = "none";

		titleEl.textContent = "Semesters";

		setAlert(formErrorEl, "");
	}

	function semesterModalShowFormView(mode, semester) {
		screenList.style.display = "none";
		screenForm.style.display = "";
		footerList.style.display = "none";
		footerForm.style.display = "";

		if (mode === "new") {
			titleEl.textContent = "New Semester";
			saveBtn.textContent = "Create";
			fillSemesterForm(null);
		} else {
			titleEl.textContent = "Edit Semester";
			saveBtn.textContent = "Save";
			fillSemesterForm(semester);
		}

		setAlert(formErrorEl, "");
	}

	function fillSemesterForm(semester) {
		idEl.value = semester ? String(semester.id) : "";
		nameEl.value = semester ? (semester.name) : "";
		const start = semester ? semester.startDate : null;
		const end = semester ? semester.endDate : null;
		startEl.value = semester ? start : "";
		endEl.value = semester ? end : "";
	}

	function openDeleteSemesterModal(semesterId) {
		const modal = document.getElementById("delete-semester-modal");
		const form = document.getElementById("delete-semester-form");
		const errorEl = document.getElementById("ds-error");
		const msgEl = document.getElementById("ds-message");
		const countsEl = document.getElementById("ds-counts");

		setAlert(errorEl, "");
		countsEl.textContent = "";

		const s = appState.semesters.find(x => String(x.id) === semesterId);
		const name = s?.name ?? "this semester";

		form.querySelector("#ds-id").value = String(semesterId);
		msgEl.textContent = `Are you sure you want to delete “${name}”?`;

		countsEl.textContent = "All modules and their associated assignments will be deleted.";

		if (appState.activeSemesterId && String(appState.activeSemesterId) === semesterId) {
			countsEl.textContent += " This is your active semester. Your active semester will be cleared.";
		}

		modal.classList.add("is-open");
		document.body.classList.add("modal-open");
	}
}

function initDeleteSemesterForm() {
	const form = document.getElementById("delete-semester-form");
	if (!form) return;

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const errorEl = document.getElementById("ds-error");
		setAlert(errorEl, "");

		const id = Number(new FormData(form).get("id"));

		try {
			await deleteJson(`/api/semesters/${id}`);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();

			document.dispatchEvent(new CustomEvent("semester:deleted"));

			const semesterModal = document.getElementById("semester-modal");
			if (semesterModal.classList.contains("is-open")) {
				await loadDashboardData(appState.activeSemesterId);
				window.refreshModal();
			}

			showToast("Semester deleted successfully.");
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

function initNewModuleForm() {
	const form = document.getElementById("new-module-form");
	if (!form) return;

	const colourPickerEl = form.querySelector("#nm-colour");
	const colourHexEl = form.querySelector("#nm-colour-hex");
	const errorEl = document.getElementById("nm-error");

	function normalizeHex(val) {
		if (!val) return "";
		let v = String(val).trim();
		if (!v.startsWith("#")) v = `#${v}`;
		return v.toUpperCase();
	};

	function isValidHex(val) {
		/^#[0-9A-F]{6}$/i.test(val);
	}

	function syncColourFromPicker() {
		colourHexEl.value = normalizeHex(colourPickerEl.value);
	};

	function syncColourFromHex() {
		const v = normalizeHex(colourHexEl.value);

		if (isValidHex(v)) {
			colourPickerEl.value = v;
			colourHexEl.value = v;
		}
	};

	function setRandomDefaultColour() {
		const picked = pickRandomPresetModuleColour(appState.modules);
		colourPickerEl.value = picked;
		colourHexEl.value = normalizeHex(picked);
	};

	colourPickerEl.addEventListener("input", syncColourFromPicker);
	colourHexEl.addEventListener("input", syncColourFromHex);
	colourHexEl.addEventListener("blur", () => {
		const v = normalizeHex(colourHexEl.value);
		if (isValidHex(v)) {
			colourPickerEl.value = v;
			colourHexEl.value = v;
		} else {
			syncColourFromPicker();
		}
	});

	document.addEventListener("click", (e) => {
		const opener = e.target.closest('[data-modal-open="new-module-modal"]');
		if (!opener) return;
		setRandomDefaultColour();
	});

	setRandomDefaultColour();

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		setAlert(errorEl, "");

		const formData = new FormData(form);

		const creditsVal = Number(formData.get("credits"));

		const payload = {
			name: formData.get("name"),
			credits: creditsVal === 0 ? null : creditsVal,
			colour: normalizeHex(formData.get("colour"))
		};

		try {
			const res = await postJson(`/api/semesters/${appState.activeSemesterId}/modules`, payload);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();
			setRandomDefaultColour();

			document.dispatchEvent(new CustomEvent("module:created"));

			showToast(res.message);
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

function initEditModuleForm() {
	const form = document.getElementById("edit-module-form");
	if (!form) return;

	const picker = form.querySelector("#em-colour");
	const hex = form.querySelector("#em-colour-hex");

	function normalizeHex(val) {
		if (!val) return "";
		let v = String(val).trim();
		if (!v.startsWith("#")) v = `#${v}`;
		return v.toUpperCase();
	};

	function isValidHex(val) {
		/^#[0-9A-F]{6}$/i.test(val);
	}

	function syncColour() {
		if (!picker || !hex) return;
		hex.value = normalizeHex(picker.value);
	};

	picker.addEventListener("input", syncColour);

	hex.addEventListener("input", () => {
		const v = normalizeHex(hex.value);
		if (isValidHex(v)) {
			picker.value = v;
			hex.value = v;
		}
	});

	hex.addEventListener("blur", () => {
		const v = normalizeHex(hex.value);
		if (isValidHex(v)) {
			picker.value = v;
			hex.value = v;
		} else {
			syncColour();
		}
	});

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const errorEl = document.getElementById("em-error");
		setAlert(errorEl, "");

		const formData = new FormData(form);

		const id = Number(formData.get("id"));

		const creditsVal = Number(formData.get("credits"));

		const payload = { 
			name: formData.get("name"),
			credits: creditsVal === 0 ? null : creditsVal,
			colour: normalizeHex(formData.get("colour"))
		};

		try {
			const res = await patchJson(`/api/modules/${id}`, payload);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();

			document.dispatchEvent(new CustomEvent("module:updated"));

			showToast(res.message);
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

function initDeleteModuleForm() {
	const form = document.getElementById("delete-module-form");
	if (!form) return;

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const errorEl = document.getElementById("dm-error");
		setAlert(errorEl, "");

		const formData = new FormData(form);
		const id = Number(formData.get("id"));

		try {
			await deleteJson(`/api/modules/${id}`);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();

			document.dispatchEvent(new CustomEvent("module:deleted"));
			showToast("Module deleted successfully.");
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

function initNewAssignmentForm() {
	const form = document.getElementById("new-assignment-form");
	if (!form) return;

	const weightEl = form.querySelector("#na-weight");
	const weightValEl = form.querySelector("#na-weight-val");
	const confEl = form.querySelector("#na-confidence");
	const confValEl = form.querySelector("#na-confidence-val");

	function syncRanges() {
		if (weightEl && weightValEl) weightValEl.textContent = weightEl.value;
		if (confEl && confValEl) confValEl.textContent = confEl.value;
	};

	weightEl.addEventListener("input", syncRanges);
	confEl.addEventListener("input", syncRanges);

	syncRanges();

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const errorEl = document.getElementById("na-error");
		setAlert(errorEl, "");

		const formData = new FormData(form);
		const moduleId = formData.get("moduleId");

		const weightVal = Number(formData.get("weight"));
		const confidenceVal = Number(formData.get("confidence"));

		const payload = {
			name: formData.get("name"),
			description: formData.get("description") || null,
			weight: weightVal === 0 ? null : weightVal,
			confidence: confidenceVal === 0 ? null : confidenceVal,
			deadline: toUtcIso(formData.get("deadline"))
		};

		try {
			const res = await postJson(`/api/modules/${moduleId}/assignments`, payload);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();

			document.dispatchEvent(new CustomEvent("assignment:created"));

			showToast(res.message);
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

// Assignment View
async function initAssignment() {
	if (getRouteName() !== "assignment") return;

	const assignmentId = Number(getRouteContext("assignment").assignmentId);

	const main = document.querySelector('[data-page="assignment"]');
	const assignmentNameEl = document.querySelector(".assignment-name");
	const moduleNameEl = document.querySelector(".assignment-module-name");
	const dueDateEl = document.querySelector(".assignment-due-date");
	const editModal = document.getElementById("edit-assignment-modal");
	const editForm = document.getElementById("edit-assignment-form");
	const completeBtn = document.querySelector('[data-action="toggle-assignment-status"]');
	const editBtn = document.querySelector('[data-modal-open="edit-assignment-modal"]');
	const newTaskBtn = document.querySelector('[data-modal-open="new-task-modal"]');
	const todoListEl = document.querySelector('[data-list="todo"]');
	const doingListEl = document.querySelector('[data-list="doing"]');
	const doneListEl = document.querySelector('[data-list="done"]');

	document.addEventListener("assignment:updated", refreshAssignment);
	document.addEventListener("task:created", refreshAssignment);
	document.addEventListener("task:updated", refreshAssignment);
	document.addEventListener("task:deleted", refreshAssignment);
	editModal.addEventListener("modal:open", populateEditAssignmentForm);
	main.addEventListener("click", handleAssignmentActions);

	const handleTaskActions = (e) => {
		const btn = e.target.closest('button[data-task-id][data-action]');
		if (!btn) return;

		const taskId = Number(btn.dataset.taskId);

		if (btn.dataset.action === "edit") {
			openEditTaskModal(taskId);
		} else if (btn.dataset.action === "delete") {
			openDeleteTaskModal(taskId);
		}
	};
	todoListEl.addEventListener("click", handleTaskActions);
	doingListEl.addEventListener("click", handleTaskActions);
	doneListEl.addEventListener("click", handleTaskActions);
	
	await refreshAssignment();

	async function refreshAssignment() {
		await loadAssignmentData(assignmentId);

		renderDetailsAndUpdateButtons();
		renderTaskBoard();
	}
	

	function renderTaskBoard() {
		todoListEl.innerHTML = "";
		doingListEl.innerHTML = "";
		doneListEl.innerHTML = "";

		if (!appState.tasks.length) {
			renderEmptyListState(todoListEl, "Create a task to get started.");
			return;
		}

		for (const t of appState.tasks) {
			const overdue = t.status !== "done" && isOverdue(t.deadline);

			const li = document.createElement("li");
			li.className = "ui-item";
			li.dataset.taskId = t.id;
			if (overdue) li.classList.add("ui-item--overdue");
			if (appState.assignment.status !== "completed") {
				li.classList.add("ui-item--draggable");
			}

			const inner = document.createElement("div");
			inner.className = "ui-item-inner";

			const row = document.createElement("div");
			row.className = "ui-item-row";

			const dot = document.createElement("span");
			dot.className = "ui-dot";
			dot.style.backgroundColor = appState.module.colour;

			const title = document.createElement("div");
			title.className = "ui-item-main";
			title.textContent = t.name;

			row.appendChild(dot);
			row.appendChild(title);

			if (overdue) {
				const badge = document.createElement("span");
				badge.className = "ui-item-status";
				badge.textContent = "Overdue";
				inner.classList.add("ui-item-inner--has-badge");
				inner.appendChild(badge);
			}

			const content = document.createElement("div");
			content.className = "ui-item-content";

			const meta1 = document.createElement("div");
			meta1.className = "ui-item-meta";
			meta1.textContent = `Due: ${formatDueDate(t.deadline)}`;
			content.appendChild(meta1);

			const meta2 = document.createElement("div");
			meta2.className = "ui-item-meta";

			const parts = [];

			if (t.etcMinutes != null) {
				parts.push(`ETC ${formatMinutes(t.etcMinutes)}`);
			}

			if (t.atcMinutes != null) {
				parts.push(`ATC ${formatMinutes(t.atcMinutes)}`);
			}

			if (parts.length) {
				meta2.textContent = parts.join(" • ");
				content.appendChild(meta2);
			}

			const actions = document.createElement("div");
			actions.className = "ui-item-actions";

			const editBtn = document.createElement("button");
			editBtn.className = "icon-btn";
			editBtn.type = "button";
			editBtn.textContent = "✎";
			editBtn.dataset.taskId = t.id;
			editBtn.dataset.action = "edit";

			const deleteBtn = document.createElement("button");
			deleteBtn.className = "icon-btn icon-btn-danger";
			deleteBtn.type = "button";
			deleteBtn.textContent = "✖";
			deleteBtn.dataset.taskId = t.id;
			deleteBtn.dataset.action = "delete";

			if (appState.assignment.status === "completed") {
				editBtn.disabled = true;
				deleteBtn.disabled = true;
			}

			actions.appendChild(editBtn);
			actions.appendChild(deleteBtn);

			inner.appendChild(row);
			inner.appendChild(content);
			inner.appendChild(actions);
			li.appendChild(inner);

			if (t.status === "todo") todoListEl.appendChild(li);
			else if (t.status === "doing") doingListEl.appendChild(li);
			else if (t.status === "done") doneListEl.appendChild(li);
		}
	}

	function renderDetailsAndUpdateButtons() {
		const a = appState.assignment;

		assignmentNameEl.textContent = appState.assignment.name;
		moduleNameEl.textContent = appState.module.name;
		dueDateEl.textContent = formatDueDate(appState.assignment.deadline);

		const isCompleted = a.status === "completed";
		const isOverdueAssignment = !isCompleted && isOverdue(a.deadline);
		
		assignmentNameEl.classList.toggle("assignment-name--completed", isCompleted);
		dueDateEl.classList.toggle("muted-text", isCompleted);
		dueDateEl.classList.toggle("danger-text", isOverdueAssignment);

		const badgeEl = document.querySelector(".assignment-status");
		if (isCompleted) {
			badgeEl.textContent = "Completed";
			badgeEl.style.display = "";
		} else if (isOverdueAssignment) {
			badgeEl.textContent = "Overdue";
			badgeEl.style.display = "";
		} else {
			badgeEl.style.display = "none";
		}

		const hasIncompleteTasks = appState.tasks.some(
			t => t.status !== "done"
		);

		completeBtn.textContent = isCompleted ? "Mark Active" : "Complete";
		completeBtn.disabled = !isCompleted && hasIncompleteTasks;
		editBtn.disabled = isCompleted;
		newTaskBtn.disabled = isCompleted;
	}

	function handleAssignmentActions(e) {
		const btn = e.target.closest("[data-action]");
		if (!btn) return;

		if (btn.dataset.action === "toggle-assignment-status") {
			toggleAssignmentStatus();
		}
	}

	async function toggleAssignmentStatus() {
		const a = appState.assignment;
		if (!a) return;

		const newStatus = a.status === "completed" ? "active" : "completed";

		try {
			await patchJson(`/api/assignments/${a.id}`, { status: newStatus });
			await refreshAssignment();

		} catch (err) {
			console.error(err);
		}
	}

	function populateEditAssignmentForm() {
		const a = appState.assignment;
		if (!a) return;

		const errorEl = document.getElementById("ea-error");
		setAlert(errorEl, "");

		editForm.querySelector("#ea-name").value = a.name ?? "";
		editForm.querySelector("#ea-deadline").value = a.deadline ? toDatetimeLocal(a.deadline) : "";
		editForm.querySelector("#ea-description").value = a.description ?? "";

		const weight = a.weight ?? 0;
		editForm.querySelector("#ea-weight").value = weight;
		document.getElementById("ea-weight-val").textContent = weight;

		const conf = a.confidence ?? 0;
		editForm.querySelector("#ea-confidence").value = conf;
		document.getElementById("ea-confidence-val").textContent = conf;
	}

	function setTaskAtcVisibility(status) {
		const atcRow = document.getElementById("et-atc-row");
		const atcInput = document.getElementById("et-atc");
		if (!atcRow || !atcInput) return;

		const show = status === "done";
		atcRow.style.display = show ? "" : "none";

		if (!show) {
			atcInput.value = "";
		}
	}

	function openEditTaskModal(taskId) {
		const t = appState.taskById.get(taskId);
		if (!t) return;

		const form = document.getElementById("edit-task-form");
		const modal = document.getElementById("edit-task-modal");

		const errorEl = document.getElementById("et-error");
		setAlert(errorEl, "");

		form.querySelector("#et-id").value = t.id;
		form.querySelector("#et-name").value = t.name ?? "";
		form.querySelector("#et-description").value = t.description ?? "";

		form.querySelector("#et-deadline").value = t.deadline ? toDatetimeLocal(t.deadline) : "";

		const statusSelect = form.querySelector("#et-status");
		statusSelect.value = t.status ?? "todo";

		form.querySelector("#et-etc").value = t.etcMinutes ?? "";

		const atcInput = form.querySelector("#et-atc");
		atcInput.value = t.atcMinutes ?? "";
		setTaskAtcVisibility(statusSelect.value);

		statusSelect.onchange = () => setTaskAtcVisibility(statusSelect.value);

		modal.classList.add("is-open");
		document.body.classList.add("modal-open");
	}

	async function openDeleteTaskModal(taskId) {
		const modal = document.getElementById("delete-task-modal");
		const form = document.getElementById("delete-task-form");

		const errorEl = document.getElementById("dt-error");
		const msgEl = document.getElementById("dt-message");

		setAlert(errorEl, "");
		msgEl.textContent = "Are you sure you want to delete this task?";

		form.querySelector("#dt-id").value = taskId;

		modal.classList.add("is-open");
		document.body.classList.add("modal-open");

		const t = appState.taskById.get(Number(taskId));
		const taskName = t?.name || "this task";

		msgEl.textContent = `Are you sure you want to delete “${taskName}”?`;
	}
}

function initEditAssignmentForm() {
	const form = document.getElementById("edit-assignment-form");
	if (!form) return;

	const weightEl = form.querySelector("#ea-weight");
	const weightValEl = form.querySelector("#ea-weight-val");
	const confEl = form.querySelector("#ea-confidence");
	const confValEl = form.querySelector("#ea-confidence-val");

	function syncRanges() {
		if (weightEl && weightValEl) weightValEl.textContent = weightEl.value;
		if (confEl && confValEl) confValEl.textContent = confEl.value;
	};

	weightEl.addEventListener("input", syncRanges);
	confEl.addEventListener("input", syncRanges);

	syncRanges();

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const errorEl = document.getElementById("ea-error");
		setAlert(errorEl, "");

		const formData = new FormData(form);

		const weightVal = Number(formData.get("weight"));
		const confidenceVal = Number(formData.get("confidence"));

		const payload = {
			name: formData.get("name"),
			description: formData.get("description") || null,
			weight: weightVal === 0 ? null : weightVal,
			confidence: confidenceVal === 0 ? null : confidenceVal,
			deadline: toUtcIso(formData.get("deadline"))
		};

		try {
			const res = await patchJson(`/api/assignments/${appState.assignment.id}`, payload);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();

			document.dispatchEvent(new CustomEvent("assignment:updated"));

			showToast(res.message);
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

function initDeleteAssignmentForm() {
	const form = document.getElementById("delete-assignment-form");
	if (!form) return;

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const errorEl = document.getElementById("da-error");
		setAlert(errorEl, "");

		try {
			await deleteJson(`/api/assignments/${appState.assignment.id}`);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();

			window.location.href = "/dashboard";
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

function initNewTaskForm() {
	const form = document.getElementById("new-task-form");
	if (!form) return;

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const errorEl = document.getElementById("nt-error");
		setAlert(errorEl, "");

		const formData = new FormData(form);
		const etcMinutes = formData.get("etcMinutes");

		const payload = {
			name: formData.get("name"),
			description: formData.get("description") || null,
			deadline: toUtcIso(formData.get("deadline")),
			etcMinutes: etcMinutes ? Number(etcMinutes) : null
		};

		try {
			const res = await postJson(`/api/assignments/${appState.assignment.id}/tasks`, payload);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();

			document.dispatchEvent(new CustomEvent("task:created"));

			showToast(res.message);
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

function initEditTaskForm() {
	const form = document.getElementById("edit-task-form");
	if (!form) return;

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const errorEl = document.getElementById("et-error");
		setAlert(errorEl, "");

		const formData = new FormData(form);
		const id = Number(formData.get("id"));
		const status = String(formData.get("status") || "todo");
		const etcMinutes = formData.get("etcMinutes");
		const atcMinutes = formData.get("atcMinutes");

		const payload = {
			name: formData.get("name"),
			description: formData.get("description") || null,
			status,
			deadline: toUtcIso(formData.get("deadline")),
			etcMinutes: etcMinutes ? Number(etcMinutes) : null,
		};

		if (status === "done") {
			payload.atcMinutes = atcMinutes ? Number(atcMinutes) : null;
		}

		try {
			const res = await patchJson(`/api/tasks/${id}`, payload);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();

			document.dispatchEvent(new CustomEvent("task:updated"));

			showToast(res.message);
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

function initDeleteTaskForm() {
	const form = document.getElementById("delete-task-form");
	if (!form) return;

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const errorEl = document.getElementById("dt-error");
		setAlert(errorEl, "");

		const formData = new FormData(form);
		const id = Number(formData.get("id"));

		try {
			await deleteJson(`/api/tasks/${id}`);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();

			document.dispatchEvent(new CustomEvent("task:deleted"));
			showToast("Task deleted successfully.");
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

function initTaskDragAndDrop() {
	if (getRouteName() !== "assignment") return;

	const boardEl = document.querySelector(".ui-grid");

	let drag = null;

	let pressTimer = null;
	let press = null; // { card, pointerId, x, y, fromList, fromStatus }
	let pressReady = false;

	const HOLD_MS = 180;
	const MOVE_PX = 8;

	const EDGE_PX = 60;
	const SCROLL_PX = 12;
	let autoScrollRaf = null;
	let lastPointerY = 0;

	const startAutoScroll = () => {
		if (autoScrollRaf) return;

		const tick = () => {
			if (!drag) {
				autoScrollRaf = null;
				return;
			}

			const y = lastPointerY;
			const vh = window.innerHeight;

			if (y < EDGE_PX) {
				window.scrollBy(0, -SCROLL_PX);
			} else if (y > vh - EDGE_PX) {
				window.scrollBy(0, SCROLL_PX);
			}

			autoScrollRaf = requestAnimationFrame(tick);
		};

		autoScrollRaf = requestAnimationFrame(tick);
	};

	const stopAutoScroll = () => {
		if (!autoScrollRaf) return;
		cancelAnimationFrame(autoScrollRaf);
		autoScrollRaf = null;
	};

	const clearDropHighlights = () => {
		document
			.querySelectorAll(".ui-list.is-drop-target")
			.forEach(el => el.classList.remove("is-drop-target"));
	};

	const getListFromPoint = (x, y) => {
		const el = document.elementFromPoint(x, y);
		return el?.closest?.('.ui-list[data-list]');
	};

	const moveGhost = (e) => {
		if (!drag) return;
		drag.ghost.style.transform =
			`translate3d(${e.clientX - drag.offsetX}px, ${e.clientY - drag.offsetY}px, 0)`;
	};

	const cleanupPress = () => {
		clearTimeout(pressTimer);
		pressTimer = null;
		press = null;
		pressReady = false;
	};

	const cleanupDrag = () => {
		if (!drag) return;

		drag.card.classList.remove("is-dragging");
		drag.ghost?.remove();

		boardEl.style.touchAction = drag.prevTouchAction ?? "";

		stopAutoScroll();
		clearDropHighlights();
		drag = null;
	};

	const cleanupAll = () => {
		cleanupPress();
		cleanupDrag();
	};

	const startDragFromMoveEvent = (e) => {
		if (!press || drag) return;

		const card = press.card;
		const fromList = press.fromList;

		const rect = card.getBoundingClientRect();

		const ghost = card.cloneNode(true);
		ghost.classList.add("ui-drag-ghost");
		ghost.style.width = `${rect.width}px`;
		ghost.style.height = `${rect.height}px`;
		document.body.appendChild(ghost);

		card.classList.add("is-dragging");

		const prevTouchAction = boardEl.style.touchAction;
		boardEl.style.touchAction = "none";

		drag = {
			taskId: Number(card.dataset.taskId),
			card,
			ghost,
			fromList,
			fromStatus: press.fromStatus,
			offsetX: e.clientX - rect.left,
			offsetY: e.clientY - rect.top,
			prevTouchAction
		};

		card.setPointerCapture(e.pointerId);

		e.preventDefault();

		moveGhost(e);

		const overList = getListFromPoint(e.clientX, e.clientY);
		clearDropHighlights();
		if (overList) overList.classList.add("is-drop-target");

		lastPointerY = e.clientY;
		startAutoScroll();

		cleanupPress();
	};

	boardEl.addEventListener(
		"touchmove",
		(e) => {
			if (drag) e.preventDefault();
		},
		{ passive: false }
	);

	boardEl.addEventListener("pointerdown", (e) => {
		if (appState.assignment.status === "completed") return;

		const card = e.target.closest('.ui-item[data-task-id]');
		if (!card) return;

		if (e.target.closest("button, a, input, textarea, select")) return;

		const fromList = card.closest('.ui-list[data-list]');
		if (!fromList) return;

		if (e.pointerType === "mouse") {
			press = {
				card,
				pointerId: e.pointerId,
				x: e.clientX,
				y: e.clientY,
				fromList,
				fromStatus: fromList.dataset.list
			};
			pressReady = true;
			startDragFromMoveEvent(e);
			return;
		}

		cleanupAll();

		press = {
			card,
			pointerId: e.pointerId,
			x: e.clientX,
			y: e.clientY,
			fromList,
			fromStatus: fromList.dataset.list
		};

		pressReady = false;

		pressTimer = setTimeout(() => {
			pressReady = true;
		}, HOLD_MS);
	});

	boardEl.addEventListener("pointermove", (e) => {
		if (drag) {
			lastPointerY = e.clientY;
			startAutoScroll();
		}

		if (!drag && press && e.pointerId === press.pointerId) {
			const dx = e.clientX - press.x;
			const dy = e.clientY - press.y;

			if (!pressReady && Math.hypot(dx, dy) > MOVE_PX) {
				cleanupPress();
				return;
			}

			if (pressReady) {
				startDragFromMoveEvent(e);
				return;
			}

			return;
		}

		if (!drag) return;

		moveGhost(e);

		const overList = getListFromPoint(e.clientX, e.clientY);
		clearDropHighlights();
		if (overList) overList.classList.add("is-drop-target");
	});

	boardEl.addEventListener("pointerup", async (e) => {
		if (!drag) {
			cleanupPress();
			return;
		}

		stopAutoScroll();

		const overList = getListFromPoint(e.clientX, e.clientY);
		const toStatus = overList?.dataset?.list;

		const taskId = drag.taskId;
		const fromStatus = drag.fromStatus;

		if (!overList || !toStatus) {
			cleanupDrag();
			return;
		}

		insertTaskCardSortedById(overList, drag.card, drag.taskId);

		cleanupDrag();

		if (toStatus === fromStatus) return;

		let atcMinutes = null;

		if (toStatus === "done" && fromStatus !== "done") {
			const t = appState.taskById.get(taskId);

			if (t && t.atcMinutes == null) {
				atcMinutes = await openCompleteTaskModal(taskId);
			}
		}


		try {
			await patchJson(`/api/tasks/${taskId}`, {
				status: toStatus,
				...(atcMinutes != null ? { atcMinutes } : {})
			});
			document.dispatchEvent(new CustomEvent("task:updated"));
		} catch (err) {
			document.dispatchEvent(new CustomEvent("task:updated"));
			showToast(err.message);
		}
	});

	boardEl.addEventListener("pointercancel", cleanupAll);

	function insertTaskCardSortedById(listEl, cardEl, taskId) {
		const t = appState.taskById.get?.(Number(taskId));
		const newTime = t?.deadline ? new Date(t.deadline).getTime() : Infinity;

		const items = Array.from(listEl.querySelectorAll('.ui-item[data-task-id]'))
			.filter(el => el !== cardEl);

		const before = items.find(el => {
			const id = Number(el.dataset.taskId);
			const other = appState.taskById.get?.(id);
			const otherTime = other?.deadline ? new Date(other.deadline).getTime() : Infinity;
			return newTime < otherTime;
		});

		if (before) listEl.insertBefore(cardEl, before);
		else listEl.appendChild(cardEl);
	}

	function openCompleteTaskModal(taskId) {
		const modal = document.getElementById("complete-task-modal");
		const form = document.getElementById("complete-task-form");

		const idEl = document.getElementById("ct-id");
		const atcEl = document.getElementById("ct-atc");
		const errorEl = document.getElementById("ct-error");

		setAlert(errorEl, "");

		idEl.value = taskId;
		atcEl.value = "";

		modal.classList.add("is-open");
		document.body.classList.add("modal-open");

		atcEl.focus();

		return new Promise((resolve) => {

			const close = (result) => {
				modal.classList.remove("is-open");
				document.body.classList.remove("modal-open");

				form.removeEventListener("submit", onSubmit);
				modal.removeEventListener("click", onCancel);

				resolve(result);
			};

			const onSubmit = (e) => {
				e.preventDefault();

				const val = atcEl.value.trim();
				if (!val) {
					close(null);
					return;
				}

				const n = Number(val);

				close(n);
			};

			const onCancel = (e) => {
				if (!e.target.closest("[data-modal-close]")) return;
				close(null);
			};

			form.addEventListener("submit", onSubmit);
			modal.addEventListener("click", onCancel);
		});
	}
}

// Global Inits
function initAuthForms() {
	const loginForm = document.getElementById("login-form");
	if (loginForm) {
		const errorEl = document.getElementById("auth-error");

		loginForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		setAlert(errorEl, "");

		const formData = new FormData(loginForm);
		const email = formData.get("email");
		const password = formData.get("password");
		try {
			await postJson("/api/auth/login", { email, password });
			window.location.href = "/dashboard";
		} catch (err) {
			setAlert(errorEl, err.message);
		}
	});
	}

	const registerForm = document.getElementById("register-form");
	if (registerForm) {
		const errorEl = document.getElementById("auth-error");;
		registerForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			setAlert(errorEl, "");

			const formData = new FormData(registerForm);
			const forename = formData.get("forename");
			const surname = formData.get("surname");
			const email = formData.get("email");
			const password = formData.get("password");
			const confirmPassword = formData.get("confirmPassword");

			try {
				await postJson("/api/auth/register", {
					forename,
					surname,
					email,
					password,
					confirmPassword
				});
			window.location.href = "/dashboard";
			} catch (err) {
				setAlert(errorEl, err.message);
			}
		});
	}
}

function initMobileNav() {
	const navToggleEl = document.querySelector(".nav-toggle");
	const navMenuEl = document.getElementById("nav-menu");
	
	navToggleEl.addEventListener("click", (e) => {
		e.stopPropagation();
		navMenuEl.classList.toggle("is-open");
	});

	document.addEventListener("click", (e) => {
		if (!navMenuEl.contains(e.target) && !navToggleEl.contains(e.target)) {
			navMenuEl.classList.remove("is-open");
		}
	});
}

function initFooterYear() {
	currentYearEl = document.getElementById("current-year");
	if (!currentYearEl) return;

	const currentYear = new Date().getFullYear();
	currentYearEl.textContent = currentYear;
}

function initLogoutLink() {
	const logoutLinkEl= document.getElementById("logout-link");
	if (!logoutLinkEl) return;

	logoutLinkEl.addEventListener("click", async (e) => {
		e.preventDefault();

		try {
			await postJson("/api/auth/logout");
			window.location.href = "/";
		} catch (err) {
			console.error(err);
		}
	});
}

document.addEventListener("DOMContentLoaded", async () => {
	initAuthForms();
	initMobileNav();
	initFooterYear();

	const publicRoutes = ["register", "login", "index"];
	if (publicRoutes.includes(getRouteName())) return;

	const routeContext = getRouteContext(getRouteName());
	await loadAppState(routeContext);

	initLogoutLink();
	initModals();

	await initDashboard();
	initSemesterModal();
	initDeleteSemesterForm();
	initNewModuleForm();
	initEditModuleForm();
	initDeleteModuleForm();
	initNewAssignmentForm();

	await initAssignment();
	initEditAssignmentForm();
	initDeleteAssignmentForm();
	initNewTaskForm();
	initEditTaskForm();
	initDeleteTaskForm();
	initTaskDragAndDrop();
});