// App State
const appState = {
	activeSemesterId: null,
	theme: "system",
	semesters: [],
	modules: [],
	assignments: [],
	semesterById: new Map(),
	moduleById: new Map()
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

// App State Refresh
async function refreshSettings() {
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

async function refreshAppState() {
	const settings = await refreshSettings();
  	if (!settings) return;

	const semestersPayload = await getJson("/api/semesters");

	const semesters = semestersPayload.semesters;
	
	semesters.sort((a, b) => a.name.localeCompare(b.name));

	appState.activeSemesterId = settings.activeSemesterId;
	appState.theme = settings.theme;
	appState.semesters = semesters;
	appState.semesterById = new Map(semesters.map(s => [s.id, s]));

	applyTheme(appState.theme);

	if (!settings.activeSemesterId) {
		appState.modules = [];
		appState.assignments = [];
		appState.moduleById = new Map();
		return;
	}

	const [modulesPayload, assignmentsPayload] = await Promise.all([
		getJson(`/api/semesters/${settings.activeSemesterId}/modules`),
		getJson(`/api/semesters/${settings.activeSemesterId}/assignments`)
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
}

function applyTheme(theme) {
	if (theme === "system") {
    	document.documentElement.removeAttribute("data-theme");
  	} else {
    	document.documentElement.setAttribute("data-theme", theme);
  	}
}

// Helpers
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

function renderSemesterStatusAndActions({ semesterNameEl, newModuleBtnEl, newAssignmentBtnEl }) {
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

function refreshDashboardClock(dateEl, timeEl) {
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

function renderEmptyListState(listEl, message) {
	listEl.innerHTML = "";

	const li = document.createElement("li");
	li.className = "dash-empty";

	li.textContent = message;

	listEl.appendChild(li);
}

function renderModulesList(listEl) {
	if (!appState.modules.length) {
		renderEmptyListState(listEl, "No modules yet. Create one to get started.");
		return;
	}

	listEl.innerHTML = "";

	for (const m of appState.modules) {
		const li = document.createElement("li");
		li.className = "dash-item";

		const inner = document.createElement("div");
		inner.className = "dash-item-inner";

		const row = document.createElement("div");
		row.className = "dash-item-row";

		const dot = document.createElement("span");
		dot.className = "dash-dot";
		dot.style.backgroundColor = m.colour;

		const title = document.createElement("div");
		title.className = "dash-item-main";
		title.textContent = m.name;

		row.appendChild(dot);
		row.appendChild(title);

		const actions = document.createElement("div");
		actions.className = "dash-item-actions";

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
		listEl.appendChild(li);
	}
}

function isOverdue(deadline) {
	if (!deadline) return false;
	const due = new Date(deadline);
	return due.getTime() < Date.now();
}

function renderAssignmentsList(listEl, { showCompleted = false } = {}) {
	const assignments = showCompleted
		? appState.assignments 
		: appState.assignments.filter(a => a.status === "active");

	if (!assignments.length) {
		renderEmptyListState(listEl, "No assignments yet. Create one to get started.");
		return;
	}

	listEl.innerHTML = "";

	for (const a of assignments) {
		const mod = appState.moduleById.get(a.moduleId);
		const moduleName = mod?.name ?? "Unknown module";
		const moduleColour = mod?.colour ?? "#4f7cff";

		const overdue = a.status === "active" && isOverdue(a.deadline);
		const completed = a.status === "completed";

		const li = document.createElement("li");
		li.className = "dash-item";
		if (completed) li.classList.add("dash-item--completed");
		if (overdue) li.classList.add("dash-item--overdue");

		const link = document.createElement("a");
		link.className = "dash-item-link dash-item-inner";
		link.href = `/assignments/${a.id}`;

		const row = document.createElement("div");
		row.className = "dash-item-row";

		const dot = document.createElement("span");
		dot.className = "dash-dot";
		dot.style.backgroundColor = moduleColour;

		const title = document.createElement("div");
		title.className = "dash-item-main";
		title.textContent = a.name;

		row.appendChild(dot);
		row.appendChild(title);

		if (completed || overdue) {
			const badge = document.createElement("span");
			badge.className = "dash-item-status";
			badge.textContent = completed ? "Completed" : "Overdue";
			link.classList.add("dash-item-inner--has-badge");
			link.appendChild(badge);
		}

		const content = document.createElement("div");
		content.className = "dash-item-content";

		const meta1 = document.createElement("div");
		meta1.className = "dash-item-meta";
		meta1.textContent = moduleName;

		const meta2 = document.createElement("div");
		meta2.className = "dash-item-meta";
		meta2.textContent = `Due: ${formatDueDate(a.deadline)}`;

		content.appendChild(meta1);
		content.appendChild(meta2);

		link.appendChild(row);
		link.appendChild(content);

		li.appendChild(link);
		listEl.appendChild(li);
	}
}

function renderTodayList(listEl, todayScheduledTasks = []) {
	if (!todayScheduledTasks.length) {
		renderEmptyListState(listEl, "Nothing is scheduled today! 🥳");
		return;
	}
}

function populateModuleSelect(selectEl, { keepValue = true } = {}) {
	const prev = keepValue ? selectEl.value : "";

	const placeholder = selectEl.querySelector('option[value=""]');
	selectEl.innerHTML = "";
	if (placeholder) selectEl.appendChild(placeholder);
	else {
		const opt = document.createElement("option");
		opt.value = "";
		opt.disabled = true;
		opt.selected = true;
		opt.textContent = "Select a module…";
		selectEl.appendChild(opt);
	}

	for (const m of appState.modules) {
		const opt = document.createElement("option");
		opt.value = String(m.id);
		opt.textContent = m.name;
		selectEl.appendChild(opt);
	}

	if (keepValue && prev && appState.modules.some(m => String(m.id) === prev)) {
		selectEl.value = prev;
	} else {
		selectEl.value = "";
	}
}

async function refreshDashboardGrid() {
	const semesterNameEl = document.getElementById("active-semester-name");
	const modulesListEl = document.querySelector('[data-list="modules"]');
	const assignmentsListEl = document.querySelector('[data-list="assignments"]');
	const todayListEl = document.querySelector('[data-list="today"]');
	const newModuleBtnEl = document.querySelector('[data-modal-open="new-module-modal"]');
	const newAssignmentBtnEl = document.querySelector('[data-modal-open="new-assignment-modal"]');
	
	await refreshAppState();

	renderSemesterStatusAndActions({ semesterNameEl, newModuleBtnEl, newAssignmentBtnEl });

	renderModulesList(modulesListEl);
	renderAssignmentsList(assignmentsListEl, {
		showCompleted: showCompletedAssignments
	});
	renderTodayList(todayListEl);

	const moduleSelectEl = document.getElementById("na-module");
	populateModuleSelect(moduleSelectEl);
}

function openEditModuleModal(moduleId) {
	const m = appState.moduleById?.get(moduleId);
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
	if (!modal || !form) return;

	const errorEl = document.getElementById("dm-error");
	const msgEl = document.getElementById("dm-message");
	const countsEl = document.getElementById("dm-counts");
	const submitBtn = form.querySelector('button[type="submit"]');

	setAlert(errorEl, "");
	countsEl.textContent = "";
	msgEl.textContent = "Are you sure you want to delete this module?";

	form.querySelector("#dm-id").value = moduleId;

	modal.classList.add("is-open");
	document.body.classList.add("modal-open");

	if (submitBtn) submitBtn.disabled = false;

	const m = appState.moduleById?.get(Number(moduleId));
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

function openDeleteSemesterModal(semesterId) {
	const modal = document.getElementById("delete-semester-modal");
	const form = document.getElementById("delete-semester-form");
	if (!modal || !form) return;

	const errorEl = document.getElementById("ds-error");
	const msgEl = document.getElementById("ds-message");
	const countsEl = document.getElementById("ds-counts");

	setAlert(errorEl, "");
	countsEl.textContent = "";

	const s = appState.semesters.find(x => Number(x.id) === Number(semesterId));
	const name = s?.name ?? "this semester";

	form.querySelector("#ds-id").value = String(semesterId);
	msgEl.textContent = `Are you sure you want to delete “${name}”?`;

	countsEl.textContent = "All modules and their associated assignments will be deleted.";

	if (appState.activeSemesterId && Number(appState.activeSemesterId) === Number(semesterId)) {
		countsEl.textContent += " This is your active semester. Your active semester will be cleared.";
	}

	modal.classList.add("is-open");
	document.body.classList.add("modal-open");
}

function renderSemestersList(listEl) {
	if (!appState.semesters.length) {
		renderEmptyListState(listEl, "No semesters yet. Create one to get started.");
		return;
	}

	listEl.innerHTML = "";

	for (const s of appState.semesters) {
		const li = document.createElement("li");
		li.className = "dash-item";

		const inner = document.createElement("div");
		inner.className = "dash-item-inner";

		const row = document.createElement("div");
		row.className = "dash-item-row";

		const title = document.createElement("div");
		title.className = "dash-item-main";
		title.textContent = s.name;

		row.appendChild(title);

		const actions = document.createElement("div");
		actions.className = "dash-item-actions";

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
		listEl.appendChild(li);
	}
}

function populateActiveSemesterSelect(selectEl) {
	const prev = selectEl.value;

	const placeholder = selectEl.querySelector('option[value=""]');
	selectEl.innerHTML = "";
	if (placeholder) selectEl.appendChild(placeholder);
	else {
		const opt = document.createElement("option");
		opt.value = "";
		opt.disabled = true;
		opt.selected = true;
		opt.textContent = "Select a semester…";
		selectEl.appendChild(opt);
	}

	for (const s of appState.semesters) {
		const opt = document.createElement("option");
		opt.value = String(s.id);
		opt.textContent = s.name;
		selectEl.appendChild(opt);
	}

	if (appState.activeSemesterId != null) {
		selectEl.value = String(appState.activeSemesterId);
	} else {
		selectEl.value = "";
	}
}

function semesterModalShowListView(modalEl) {
	const screenList = modalEl.querySelector("#semester-screen-list");
	const screenForm = modalEl.querySelector("#semester-screen-form");
	const footerList = modalEl.querySelector("#semester-footer-list");
	const footerForm = modalEl.querySelector("#semester-footer-form");

	if (screenList) screenList.style.display = "";
	if (screenForm) screenForm.style.display = "none";
	if (footerList) footerList.style.display = "";
	if (footerForm) footerForm.style.display = "none";

	const formErrorEl = modalEl.querySelector("#sm-form-error");
	if (formErrorEl) setAlert(formErrorEl, "");
}

function semesterModalShowFormView(modalEl, mode, semester) {
	const screenList = modalEl.querySelector("#semester-screen-list");
	const screenForm = modalEl.querySelector("#semester-screen-form");
	const footerList = modalEl.querySelector("#semester-footer-list");
	const footerForm = modalEl.querySelector("#semester-footer-form");

	if (screenList) screenList.style.display = "none";
	if (screenForm) screenForm.style.display = "";
	if (footerList) footerList.style.display = "none";
	if (footerForm) footerForm.style.display = "";

	const titleEl = modalEl.querySelector("#semester-modal-title");
	const saveBtn = modalEl.querySelector("#sm-save-btn");

	if (mode === "new") {
		if (titleEl) titleEl.textContent = "New Semester";
		if (saveBtn) saveBtn.textContent = "Create";
		fillSemesterForm(modalEl, null);
	} else {
		if (titleEl) titleEl.textContent = "Edit Semester";
		if (saveBtn) saveBtn.textContent = "Save";
		fillSemesterForm(modalEl, semester);
	}

	const formErrorEl = modalEl.querySelector("#sm-form-error");
	if (formErrorEl) setAlert(formErrorEl, "");
}

function fillSemesterForm(modalEl, semester) {
	const idEl = modalEl.querySelector("#sm-id");
	const nameEl = modalEl.querySelector("#sm-name");
	const startEl = modalEl.querySelector("#sm-start");
	const endEl = modalEl.querySelector("#sm-end");

	if (idEl) idEl.value = semester ? String(semester.id) : "";
	if (nameEl) nameEl.value = semester ? (semester.name || "") : "";

	const start = semester ? semester.startDate : null;
	const end = semester ? semester.endDate : null;

	if (startEl) startEl.value = semester ? start : "";
	if (endEl) endEl.value = semester ? end : "";
}

function pickRandomPresetModuleColour() {
	const used = new Set(appState.modules.map(m => m.colour));

	const available = MODULE_COLOUR_PRESETS.filter(c => !used.has(c));
	const pool = available.length ? available : MODULE_COLOUR_PRESETS;

	return pool[Math.floor(Math.random() * pool.length)];
}

// Setups
function setupLoginForm(formEl, errorEl) {
	formEl.addEventListener("submit", async (e) => {
		e.preventDefault();
		setAlert(errorEl, "");

		const formData = new FormData(formEl);
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

function setupRegisterForm(formEl, errorEl) {
	formEl.addEventListener("submit", async (e) => {
		e.preventDefault();
		setAlert(errorEl, "");

		const formData = new FormData(formEl);
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

function setupLogoutLink(navLinkEl) {
	navLinkEl.addEventListener("click", async (e) => {
		e.preventDefault();

		try {
			await postJson("/api/auth/logout");
			window.location.href = "/";
		} catch (err) {
			console.error(err);
		}
	});
}

function setupMobileNav(toggleEl, menuEl) {
	toggleEl.addEventListener("click", (e) => {
		e.stopPropagation();
		menuEl.classList.toggle("is-open");
	});

	document.addEventListener("click", (e) => {
		if (!menuEl.contains(e.target) && !toggleEl.contains(e.target)) {
			menuEl.classList.remove("is-open");
		}
	});
}

function setupDashboardClock(dateEl, timeEl) {
	refreshDashboardClock(dateEl, timeEl)
	setInterval(() => refreshDashboardClock(dateEl, timeEl), 1000);
}

function setupRangeLabel(rangeEl, valueEl, formatter = (v) => v) {
	if (!rangeEl || !valueEl) return;

	const sync = () => {
		valueEl.textContent = formatter(rangeEl.value);
	};

	rangeEl.addEventListener("input", sync);

	sync();
}

// Inits
function initAuthForms() {
	const loginForm = document.getElementById("login-form");
	if (loginForm) {
		const errorEl = document.getElementById("auth-error");;
		setupLoginForm(loginForm, errorEl);
	}

	const registerForm = document.getElementById("register-form");
	if (registerForm) {
		const errorEl = document.getElementById("auth-error");;
		setupRegisterForm(registerForm, errorEl);
	}
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

	setupLogoutLink(logoutLinkEl);
}

function initMobileNav() {
	const navToggleEl = document.querySelector(".nav-toggle");
	const navMenuEl = document.getElementById("nav-menu");
	if (!navToggleEl || !navMenuEl) return; 
	
	setupMobileNav(navToggleEl, navMenuEl);
}

async function initDashboard() {
	const dashboardEl = document.querySelector(".dashboard");
	if (!dashboardEl) return;
	
	const dateEl = document.querySelector(".dash-date");
	const timeEl = document.querySelector(".dash-time");
	setupDashboardClock(dateEl, timeEl);

	try {
		await refreshDashboardGrid();
	}
	catch (err) {
		showToast(err, { type: "error" });
	}
}

function initModals() {
	const openModal = (modal) => {
		modal.classList.add("is-open");
		document.body.classList.add("modal-open");

		const firstFocusable = modal.querySelector(
			'input:not([type="hidden"]), select, textarea, button'
		);
		if (firstFocusable) firstFocusable.focus();
	};

	const closeModal = (modal) => {
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
	};

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

function initNewAssignmentForm() {
	const form = document.getElementById("new-assignment-form");
	if (!form) return;

	const weightEl = form.querySelector("#na-weight");
	const weightValEl = form.querySelector("#na-weight-val");

	const confEl = form.querySelector("#na-confidence");
	const confValEl = form.querySelector("#na-confidence-val");

	const syncRanges = () => {
		if (weightEl && weightValEl) weightValEl.textContent = weightEl.value;
		if (confEl && confValEl) confValEl.textContent = confEl.value;
	};

	weightEl?.addEventListener("input", syncRanges);
	confEl?.addEventListener("input", syncRanges);

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

			await refreshDashboardGrid();

			showToast(res.message);
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

	const normalizeHex = (val) => {
		if (!val) return "";
		let v = String(val).trim();
		if (!v.startsWith("#")) v = `#${v}`;
		return v.toUpperCase();
	};

	const isValidHex = (val) => /^#[0-9A-F]{6}$/i.test(val);

	const syncColourFromPicker = () => {
		if (!colourPickerEl || !colourHexEl) return;
		colourHexEl.value = normalizeHex(colourPickerEl.value);
	};

	const syncColourFromHex = () => {
		if (!colourPickerEl || !colourHexEl) return;

		const v = normalizeHex(colourHexEl.value);

		if (isValidHex(v)) {
			colourPickerEl.value = v;
			colourHexEl.value = v;
		}
	};

	const setRandomDefaultColour = () => {
		if (!colourPickerEl || !colourHexEl) return;

		const picked = pickRandomPresetModuleColour(appState.modules);
		colourPickerEl.value = picked;
		colourHexEl.value = normalizeHex(picked);
	};

	colourPickerEl?.addEventListener("input", syncColourFromPicker);
	colourHexEl?.addEventListener("input", syncColourFromHex);
	colourHexEl?.addEventListener("blur", () => {
		if (!colourPickerEl || !colourHexEl) return;

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

			await refreshDashboardGrid();

			showToast(res.message);
		} catch (err) {
			setAlert(errorEl, err.message);

			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

function initModulesListActions() {
	const modulesListEl = document.querySelector('[data-list="modules"]');
	if (!modulesListEl) return;

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
}

function initEditModuleForm() {
	const form = document.getElementById("edit-module-form");
	if (!form) return;

	const picker = form.querySelector("#em-colour");
	const hex = form.querySelector("#em-colour-hex");

	const normalizeHex = (val) => {
		if (!val) return "";
		let v = String(val).trim();
		if (!v.startsWith("#")) v = `#${v}`;
		return v.toUpperCase();
	};

	const isValidHex = (val) => /^#[0-9A-F]{6}$/i.test(val);

	const syncColour = () => {
		if (!picker || !hex) return;
		hex.value = normalizeHex(picker.value);
	};

	picker?.addEventListener("input", syncColour);

	hex?.addEventListener("input", () => {
		const v = normalizeHex(hex.value);
		if (isValidHex(v)) {
			picker.value = v;
			hex.value = v;
		}
	});

	hex?.addEventListener("blur", () => {
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

			await refreshDashboardGrid();

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

			await refreshDashboardGrid();
			showToast("Module deleted successfully.");
		} catch (err) {
			setAlert(errorEl, err.message);

			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

function initAssignmentsToggle() {
	const btn = document.getElementById("toggle-completed-btn");
	const listEl = document.querySelector('[data-list="assignments"]');
	if (!btn || !listEl) return;

	const updateLabel = () => {
		btn.textContent = showCompletedAssignments
			? "Hide Completed"
			: "Show Completed";
	};

	btn.addEventListener("click", (e) => {
		e.preventDefault();

		showCompletedAssignments = !showCompletedAssignments;

		renderAssignmentsList(listEl, {
			showCompleted: showCompletedAssignments
		});

		updateLabel();
	});

	updateLabel();
}

function initSemesterModal() {
	const modalEl = document.getElementById("semester-modal");
	if (!modalEl) return;

	const listEl = modalEl.querySelector('ul[data-list="semesters"]');
	const activeSelect = modalEl.querySelector("#sm-active");

	const listErrorEl = modalEl.querySelector("#sm-error");
	const formErrorEl = modalEl.querySelector("#sm-form-error");

	const newBtn = modalEl.querySelector("#sm-new-btn");
	const setActiveBtn = modalEl.querySelector("#sm-set-active-btn");
	const cancelFormBtn = modalEl.querySelector("#sm-cancel-form-btn");
	const formEl = modalEl.querySelector("#semester-form");

	const titleEl = modalEl.querySelector("#semester-modal-title");

	const refreshSemesterUI = () => {
		if (activeSelect) populateActiveSemesterSelect(activeSelect);
		if (listEl) renderSemestersList(listEl);
	};

	const openFreshListView = () => {
		if (titleEl) titleEl.textContent = "Semesters";
		if (listErrorEl) setAlert(listErrorEl, "");
		if (formErrorEl) setAlert(formErrorEl, "");
		semesterModalShowListView(modalEl);
		refreshSemesterUI();
	};
	window.refreshSemesterModal = openFreshListView;

	document.addEventListener("click", async (e) => {
		const openBtn = e.target.closest('[data-modal-open="semester-modal"]');
		if (!openBtn) return;

		openFreshListView();
	});

	openFreshListView();

	newBtn?.addEventListener("click", () => {
		semesterModalShowFormView(modalEl, "new", null);
	});

	cancelFormBtn?.addEventListener("click", () => {
		openFreshListView();
	});

	listEl?.addEventListener("click", async (e) => {
		const btn = e.target.closest("button[data-semester-id][data-action]");
		if (!btn) return;

		const action = btn.dataset.action;
		const semesterId = Number(btn.dataset.semesterId);

		if (action === "edit") {
			const semester = appState.semesters.find(s => Number(s.id) === semesterId);
			if (!semester) return;
			semesterModalShowFormView(modalEl, "edit", semester);
			return;
		}

		if (action === "delete") {
			openDeleteSemesterModal(semesterId);
		}
	});

	setActiveBtn?.addEventListener("click", async () => {
		const picked = activeSelect?.value;
		if (!picked) return;

		try {
			await patchJson("/api/settings", { activeSemesterId: Number(picked) });

			await refreshDashboardGrid();

			refreshSemesterUI();
			if (listErrorEl) setAlert(listErrorEl, "");

			showToast("Active semester changed.");
		} catch (err) {
			if (listErrorEl) setAlert(listErrorEl, err.message);
		}
	});

	formEl?.addEventListener("submit", async (e) => {
		e.preventDefault();

		if (formErrorEl) setAlert(formErrorEl, "");

		const id = modalEl.querySelector("#sm-id")?.value.trim() || "";
		const name = modalEl.querySelector("#sm-name")?.value.trim() || "";
		const startDate = modalEl.querySelector("#sm-start")?.value || "";
		const endDate = modalEl.querySelector("#sm-end")?.value || "";
		const availability = new Array(168).fill(0);

		try {
			if (!id) {
				const res = await postJson("/api/semesters", { name, startDate, endDate, availability });
				showToast(res.message);
			} else {
				const res = await patchJson(`/api/semesters/${Number(id)}`, { name, startDate, endDate });
				showToast(res.message);
			}
	
			await refreshDashboardGrid();
			openFreshListView();
		} catch (err) {
			if (formErrorEl) setAlert(formErrorEl, err.message);
		}
	});
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

			await refreshDashboardGrid();

			const semesterModal = document.getElementById("semester-modal");
			if (semesterModal?.classList.contains("is-open")) {
				window.refreshSemesterModal?.();
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

document.addEventListener("DOMContentLoaded", async () => {
	const publicRoutes = ["/", "/login", "/register"];
	if (!publicRoutes.includes(window.location.pathname)) {
		await refreshSettings();
	}

	initAuthForms();
	initMobileNav();
	initLogoutLink();
	await initDashboard();
	initModals();
	initModulesListActions();
	initNewAssignmentForm();
	initNewModuleForm();
	initEditModuleForm();
	initDeleteModuleForm();
	initAssignmentsToggle();
	initSemesterModal();
	initDeleteSemesterForm();
	initFooterYear();
});