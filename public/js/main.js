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

function setAuthError(el, message) {
	if (!el) return;
	if (message) {
		el.textContent = message;
		el.style.display = "block";
	} else {
		el.textContent = "";
		el.style.display = "none";
	}
}

function updateDashboardClock(dateEl, timeEl) {
	if (!dateEl || !timeEl) return;

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

function formatDue(iso) {
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

function renderModulesList(listEl, modules) {
	if (!listEl) return;
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
	if (!listEl) return;
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
		meta2.textContent = `Due: ${formatDue(a.deadline)}`;

		content.appendChild(meta1);
		content.appendChild(meta2);

		link.appendChild(row);
		link.appendChild(content);

		li.appendChild(link);
		listEl.appendChild(li);
	}
}

async function loadDashboardData() {
	const modulesListEl = document.querySelector('[data-list="modules"]');
	const assignmentsListEl = document.querySelector('[data-list="assignments"]');

	if (!modulesListEl && !assignmentsListEl) return;

	const [modulesPayload, assignmentsPayload] = await Promise.all([
		getJson("/api/modules"),
		getJson("/api/assignments")
	]);

	const modules = Array.isArray(modulesPayload?.modules) ? modulesPayload.modules : [];
	const assignments = Array.isArray(assignmentsPayload?.assignments) ? assignmentsPayload.assignments : [];

	const moduleById = new Map(modules.map(m => [m.id, m]));

	if (modulesListEl) renderModulesList(modulesListEl, modules);
	if (assignmentsListEl) renderAssignmentsList(assignmentsListEl, assignments, moduleById);
}

document.addEventListener("DOMContentLoaded", async () => {
	// Login form
	const loginForm = document.getElementById("login-form");
	if (loginForm) {
		const errorEl = document.getElementById("auth-error");

		loginForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			setAuthError(errorEl, "");

			const formData = new FormData(loginForm);
			const email = formData.get("email");
			const password = formData.get("password");

			try {
				await postJson("/api/auth/login", { email, password });
				window.location.href = "/dashboard";
			} catch (err) {
				setAuthError(errorEl, err.message);
			}
		});
	}

	// Register form
	const registerFormEl = document.getElementById("register-form");
	if (registerFormEl) {
		const errorEl = document.getElementById("auth-error");

		registerFormEl.addEventListener("submit", async (e) => {
			e.preventDefault();
			setAuthError(errorEl, "");

			const formData = new FormData(registerFormEl);
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
				setAuthError(errorEl, err.message);
			}
		});
	}

	// Mobile nav menu
	const navToggleEl = document.querySelector(".nav-toggle");
	const navMenuEl = document.querySelector("#nav-menu");

	if (navToggleEl && navMenuEl) {
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

	// logout link
	const logoutLinkEl= document.querySelector("#logout-link");
	if (logoutLinkEl) {
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

	// dashboard
	dashboardEl = document.querySelector(".dashboard");
	if (dashboardEl) {
		const dateEl = document.querySelector(".dash-date");
		const timeEl = document.querySelector(".dash-time");

		updateDashboardClock(dateEl, timeEl)
		setInterval(() => updateDashboardClock(dateEl, timeEl), 1000);

		try {
			await loadDashboardData();
		} catch (err) {
			console.error(err);
		}
	}

	// current-year span
	currentYearEl = document.getElementById("current-year");
	if (currentYearEl) {
		const currentYear = new Date().getFullYear();
		currentYearEl.textContent = currentYear;
	}
});