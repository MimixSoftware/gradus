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

function renderActiveSemesterName(semesterNameEl) {
	if (!appState.activeSemesterId) {
		semesterNameEl.textContent = "";
		return;
	}

	const semester = appState.semesterById.get(appState.activeSemesterId);
	semesterNameEl.textContent = semester.name;
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

		const li = document.createElement("li");
		li.className = "dash-item";

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
	
	await refreshAppState();

	renderActiveSemesterName(semesterNameEl);
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

	syncColourFromPicker();

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
			syncColourFromPicker();

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
			const res = await deleteJson(`/api/modules/${id}`);

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
	initFooterYear();
});