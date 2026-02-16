// Request Helpers
async function postJson(url, data) {
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json", "Accept": "application/json" },
		credentials: "same-origin",
		body: JSON.stringify(data)
	});

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

async function getJson(url) {
	const res = await fetch(url, {
		method: "GET",
		headers: { "Accept": "application/json" },
		credentials: "same-origin"
	});

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

async function patchJson(url, data) {
	const res = await fetch(url, {
		method: "PATCH",
		headers: { "Content-Type": "application/json", "Accept": "application/json" },
		credentials: "same-origin",
		body: JSON.stringify(data)
	});

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

function renderActiveSemesterName(semesterNameEl, activeSemesterId, semesterById) {
	if (!activeSemesterId) {
		semesterNameEl.textContent = "";
		return;
	}

	const semester = semesterById.get(activeSemesterId);
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

function renderEmptyState(listEl, message) {
	if (!listEl) return;

	listEl.innerHTML = "";

	const li = document.createElement("li");
	li.className = "dash-empty";

	li.textContent = message;

	listEl.appendChild(li);
}

function renderModulesList(listEl, modules) {
	if (!modules.length) {
		renderEmptyState(listEl, "No modules yet. Create one to get started.");
		return;
	}

	listEl.innerHTML = "";

	for (const m of modules) {
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

		const deleteBtn = document.createElement("button");
		deleteBtn.className = "icon-btn icon-btn-danger";
		deleteBtn.type = "button";
		deleteBtn.textContent = "✖";
		deleteBtn.dataset.moduleId = m.id;

		actions.appendChild(editBtn);
		actions.appendChild(deleteBtn);

		inner.appendChild(row);
		inner.appendChild(actions);
		li.appendChild(inner);
		listEl.appendChild(li);
	}
}

function renderAssignmentsList(listEl, assignments, moduleById) {
	if (!assignments.length) {
		renderEmptyState(listEl, "No assignments yet. Create one to get started.");
		return;
	}

	listEl.innerHTML = "";

	for (const a of assignments) {
		const mod = moduleById.get(a.moduleId);
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

function renderTodayList(listEl, scheduledTasks, moduleById) {
	if (!scheduledTasks.length) {
		renderEmptyState(listEl, "Nothing is scheduled today! 🥳");
		return;
	}
}

async function refreshDashboardData(dashboardEl, semesterNameEl, modulesListEl, assignmentsListEl, todayListEl) {
	const activeSemesterIdRaw = dashboardEl.dataset.activeSemesterId;
	const activeSemesterId = activeSemesterIdRaw ? Number(activeSemesterIdRaw) : null;

	const [semestersPayload, modulesPayload, assignmentsPayload] = await Promise.all([
		getJson("/api/semesters"),
		getJson(`/api/semesters/${activeSemesterId}/modules`),
		getJson(`/api/semesters/${activeSemesterId}/assignments`)
	]);

	const semesters = Array.isArray(semestersPayload?.semesters) ? semestersPayload.semesters : [];
	const modules = Array.isArray(modulesPayload?.modules) ? modulesPayload.modules : [];
	const assignments = Array.isArray(assignmentsPayload?.assignments) ? assignmentsPayload.assignments : [];
	assignments.sort((a, b) => {
		const aTime = a.deadline ? new Date(a.deadline).getTime() : Infinity;
		const bTime = b.deadline ? new Date(b.deadline).getTime() : Infinity;
		return aTime - bTime;
	});

	const semesterById = new Map(semesters.map(s => [s.id, s]));
	const moduleById = new Map(modules.map(m => [m.id, m]));

	renderActiveSemesterName(semesterNameEl, activeSemesterId, semesterById);

	renderModulesList(modulesListEl, modules);
	renderAssignmentsList(assignmentsListEl, assignments.filter(a => a.status === "active"), moduleById);
	renderTodayList(todayListEl, [], moduleById);
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

	const semesterNameEl = document.getElementById("active-semester-name");
	const modulesListEl = document.querySelector('[data-list="modules"]');
	const assignmentsListEl = document.querySelector('[data-list="assignments"]');
	const todayListEl = document.querySelector('[data-list="today"]');

	try {
		await refreshDashboardData(dashboardEl, semesterNameEl, modulesListEl, assignmentsListEl, todayListEl);
	}
	catch (err) {
		console.error(err);
	}
}

document.addEventListener("DOMContentLoaded", async () => {
	initAuthForms();
	initMobileNav();
	initLogoutLink();
	await initDashboard();
	initFooterYear();
});