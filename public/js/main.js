// App State
const appState = {
	// Settings
	activeSemesterId: null,
	theme: "system",
	forename: "",
	surname: "",
	onboarded: true,
	tutorialCompleted: true,
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
	semester: null,
	tasks: [],
	taskById: new Map(),
	// Study Sessions
	studySessions: [],
	studySessionById: new Map(),
	// Schedule
	selectedWeekStart: null,
	scheduledTasks: [],
	scheduledTaskById: new Map(),
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

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
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
		appState.forename = settings.forename;
		appState.surname = settings.surname;
		appState.onboarded = settings.onboarded;
		appState.tutorialCompleted = settings.tutorialCompleted;

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
	if (name === "studySessions") return { scope: "studySessions" };
	if (name === "schedule") return { scope: "schedule" };

	return { scope: "settings" };
}

function setAppStateCollection(key, items) {
	appState[key] = items;
	appState[`${key.slice(0, -1)}ById`] = new Map(
		items.map(item => [item.id, item])
	);
}

async function loadDashboardData() {
	try {
		const {
			semesters = [],
			modules = [],
			assignments = [],
			tasks = [],
			studySessions = [],
			scheduledTasks = []
		} = await getJson("/api/semesters/aggregate");

		semesters.sort((a, b) => a.name.localeCompare(b.name));
		modules.sort((a, b) => a.name.localeCompare(b.name));
		assignments.sort((a, b) => {
			const aTime = a.deadline ? new Date(a.deadline).getTime() : Infinity;
			const bTime = b.deadline ? new Date(b.deadline).getTime() : Infinity;
			return aTime - bTime;
		});

		setAppStateCollection("semesters", semesters);
		setAppStateCollection("modules", modules);
		setAppStateCollection("assignments", assignments);
		setAppStateCollection("tasks", tasks);
		setAppStateCollection("studySessions", studySessions);
		setAppStateCollection("scheduledTasks", scheduledTasks);
	}
	catch (err) {
		showToast(err.message || "Failed to load dashboard.", { type: "error" });
	}
}

async function loadAssignmentData(assignmentId) {
	try {
		const {
			assignment = null,
			tasks = [],
			scheduledTasks = [],
			module = null,
			semester = null
		} = await getJson(`/api/assignments/${assignmentId}/aggregate`);

		tasks.sort((a, b) => {
			const aTime = a.deadline ? new Date(a.deadline).getTime() : Infinity;
			const bTime = b.deadline ? new Date(b.deadline).getTime() : Infinity;
			return aTime - bTime;
		});

		appState.assignment = assignment;
		appState.module = module;
		appState.semester = semester;
		setAppStateCollection("tasks", tasks);
		setAppStateCollection("scheduledTasks", scheduledTasks);
	}
	catch (err) {
		showToast(err.message || "Failed to load assignment.", { type: "error" });
	}
}

async function loadStudySessionsData() {
	try {
		const {
			semesters = [],
			studySessions = []
		} = await getJson("/api/study-sessions/aggregate");
		
		semesters.sort((a, b) => a.name.localeCompare(b.name));

		setAppStateCollection("semesters", semesters);
		setAppStateCollection("studySessions", studySessions);
	}
	catch (err) {
		showToast(err.message || "Failed to load study sessions.", { type: "error" });
	}
}

async function loadScheduleData() {
	try {
		const {
			semesters = [],
			modules = [],
			assignments = [],
			tasks = [],
			studySessions = [],
			scheduledTasks = []
		} = await getJson("/api/scheduled-tasks/aggregate");
		
		semesters.sort((a, b) => a.name.localeCompare(b.name));
		modules.sort((a, b) => a.name.localeCompare(b.name));
		assignments.sort((a, b) => {
			const aTime = a.deadline ? new Date(a.deadline).getTime() : Infinity;
			const bTime = b.deadline ? new Date(b.deadline).getTime() : Infinity;
			return aTime - bTime;
		});
		tasks.sort((a, b) => {
			const aAssignment = appState.assignmentById.get(a.assignmentId);
			const bAssignment = appState.assignmentById.get(b.assignmentId);

			const aAssignmentTime = aAssignment?.deadline ? new Date(aAssignment.deadline).getTime() : Infinity;
			const bAssignmentTime = bAssignment?.deadline ? new Date(bAssignment.deadline).getTime() : Infinity;

			if (aAssignmentTime !== bAssignmentTime) {
				return aAssignmentTime - bAssignmentTime;
			}

			const aTaskTime = a.deadline ? new Date(a.deadline).getTime() : Infinity;
			const bTaskTime = b.deadline ? new Date(b.deadline).getTime() : Infinity;

			return aTaskTime - bTaskTime;
		});

		setAppStateCollection("semesters", semesters);
		setAppStateCollection("modules", modules);
		setAppStateCollection("assignments", assignments);
		setAppStateCollection("tasks", tasks);
		setAppStateCollection("studySessions", studySessions);
		setAppStateCollection("scheduledTasks", scheduledTasks);
	}
	catch (err) {
		showToast(err.message || "Failed to load schedule.", { type: "error" });
	}
}

// Global Helpers
function setAlert(alertEl, message, { type = "error" } = {}) {
	alertEl.classList.remove("alert-error", "alert-info");

	if (message) {
		alertEl.textContent = message;
		alertEl.style.display = "block";
		alertEl.classList.add(`alert-${type}`);
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

function setBanner(bannerEl, message, linkText = "", linkHref = "#") {
	if (!bannerEl) return;

	if (message) {
		bannerEl.innerHTML = "";

		const textEl = document.createElement("span");
		textEl.className = "info-banner-text";
		textEl.textContent = message;

		bannerEl.appendChild(textEl);

		if (linkText) {
			textEl.append(" ");

			const linkEl = document.createElement("a");
			linkEl.href = linkHref;
			linkEl.textContent = linkText;

			textEl.appendChild(linkEl);
		}

		bannerEl.style.display = "block";
	} else {
		bannerEl.innerHTML = "";
		bannerEl.style.display = "none";
	}
}

function setTutorialBanner(bannerEl, title, text, buttonText = "Skip Tutorial") {
	if (!bannerEl) return;

	if (title && text) {
		bannerEl.innerHTML = "";

		const headerRow = document.createElement("div");
		headerRow.className = "info-banner-header";

		const titleEl = document.createElement("div");
		titleEl.className = "info-banner-title";
		titleEl.textContent = title;

		const exitEl = document.createElement("a");
		exitEl.href = "#";
		exitEl.textContent = buttonText;

		exitEl.addEventListener("click", async (e) => {
			e.preventDefault();

			try { 
				const res = await postJson("/api/settings/tutorial-completed");
				showToast(res.message);

				document.dispatchEvent(new CustomEvent("tutorial:completed"));
			}
			catch (err) {
				showToast(err.message || "Failed to complete tutorial.", { type: "error" });
			}
		});

		headerRow.appendChild(titleEl);
		headerRow.appendChild(exitEl);

		const descEl = document.createElement("div");
		descEl.className = "info-banner-text";
		descEl.textContent = text;

		bannerEl.appendChild(headerRow);
		bannerEl.appendChild(descEl);

		bannerEl.style.display = "block";
	} else {
		bannerEl.innerHTML = "";
		bannerEl.style.display = "none";
	}
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

function renderLoadingListState(listEl) {
	listEl.innerHTML = "";

	const li = document.createElement("li");
	li.className = "ui-loading";

	const spinner = document.createElement("div");
	spinner.className = "spinner";

	li.appendChild(spinner);
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

function formatTime(timeStr) {
	return timeStr.slice(0, 5);
}

function getEndTime(startTime, durationMinutes) {
	const [h, m] = startTime.split(":").map(Number);
	const total = h * 60 + m + durationMinutes;

	const endH = Math.floor(total / 60) % 24;
	const endM = total % 60;

	return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
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
async function initDashboardMain() {
	if (getRouteName() !== "dashboard-main") return;

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
	const deadlineInput = document.querySelector("#new-assignment-form #na-deadline");
	const infoBannerEl = document.getElementById("info-banner");
	const newAssignmentInfoBannerEl = document.getElementById("na-info-banner");

	document.addEventListener("activeSemester:changed", async () => {
		await loadSettings();
		await refreshDashboard();
	});
	document.addEventListener("semester:created", async () => {
		await loadSettings();
		await refreshDashboard();
	});
	document.addEventListener("semester:updated", refreshDashboard);
	document.addEventListener("semester:deleted", async () => {
		await loadSettings();
		await refreshDashboard();
	});
	document.addEventListener("module:created", refreshDashboard);
	document.addEventListener("module:updated", refreshDashboard);
	document.addEventListener("module:deleted", refreshDashboard);
	document.addEventListener("assignment:created", refreshDashboard);

	document.addEventListener("tutorial:completed", async () => {
		await loadSettings();
		await refreshDashboard();
	});

	window.addEventListener("pageshow", async (e) => {
		if (e.persisted) {
			await loadSettings();
			await refreshDashboard();
		}
	});

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

		toggleCompletedBtnEl.textContent = showCompletedAssignments ? "Hide completed" : "Show completed";
	});
	toggleCompletedBtnEl.textContent = showCompletedAssignments ? "Hide completed" : "Show completed";

	setInterval(refreshDashboardClock, 1000);

	refreshDashboardClock();
	await refreshDashboard();

	async function refreshDashboard() {
		renderLoadingListState(modulesListEl);
		renderLoadingListState(assignmentsListEl);
		renderLoadingListState(todayListEl);

		await loadDashboardData();

		renderModulesList();
		renderAssignmentsList();
		renderTodayList();

		renderSemesterNameAndUpdateButtons();
		
		populateModuleSelect();
		refreshNewAssignmentDeadlineRange();

		renderTutorialBanner();
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
		modulesListEl.innerHTML = "";

		if (!appState.modules.length) {
			if (appState.activeSemesterId) renderEmptyListState(modulesListEl, "No modules yet. Create one to get started.");
			return;
		}

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
			editBtn.title = "Edit module";
			editBtn.dataset.moduleId = m.id;
			editBtn.dataset.action = "edit";

			const deleteBtn = document.createElement("button");
			deleteBtn.className = "icon-btn icon-btn-danger";
			deleteBtn.type = "button";
			deleteBtn.textContent = "✖";
			deleteBtn.title = "Delete module";
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
		assignmentsListEl.innerHTML = "";

		const assignments = showCompletedAssignments
			? appState.assignments 
			: appState.assignments.filter(a => a.status === "active");

		if (!appState.assignments.length) {
			if (appState.modules.length) renderEmptyListState(assignmentsListEl, "No assignments yet. Create one to get started.");
			return;
		}
		else if (!assignments.length) {
			renderEmptyListState(assignmentsListEl, "No active assignments! 🎉");
			return;
		}

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
		todayListEl.innerHTML = "";

		const today = startOfDay(new Date());
		const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

		const semester = appState.semesterById.get(appState.activeSemesterId);
		if (!semester) {
			return;
		}

		const semesterStart = startOfDay(semester.startDate);
		const semesterEnd = startOfDay(semester.endDate);

		if (today < semesterStart || today > semesterEnd) {
			renderEmptyListState(todayListEl, "Nothing is scheduled today! 🥳");
			return;
		}

		const todayScheduledTasks = appState.scheduledTasks
			.filter((st) => st.sessionDate === todayDateStr)
			.sort((a, b) => {
				if (a.studySessionId !== b.studySessionId) {
					const aSession = appState.studySessionById?.get(a.studySessionId)
						|| appState.studySessions.find((ss) => ss.id === a.studySessionId);
					const bSession = appState.studySessionById?.get(b.studySessionId)
						|| appState.studySessions.find((ss) => ss.id === b.studySessionId);

					const aStart = aSession?.startTime || "";
					const bStart = bSession?.startTime || "";

					if (aStart !== bStart) return aStart.localeCompare(bStart);
				}

				return a.position - b.position;
			});

		if (!todayScheduledTasks.length) {
			renderEmptyListState(todayListEl, "Nothing is scheduled today! 🥳");
			return;
		}

		const sessionTasksMap = new Map();
		for (const st of todayScheduledTasks) {
			if (!sessionTasksMap.has(st.studySessionId)) {
				sessionTasksMap.set(st.studySessionId, []);
			}
			sessionTasksMap.get(st.studySessionId).push(st);
		}

		for (const tasks of sessionTasksMap.values()) {
			tasks.sort((a, b) => a.position - b.position);
		}

		for (const scheduledTask of todayScheduledTasks) {
			const task =
				appState.taskById?.get(scheduledTask.taskId) ||
				appState.tasks.find((t) => t.id === scheduledTask.taskId);

			if (!task) continue;

			const studySession =
				appState.studySessionById?.get(scheduledTask.studySessionId) ||
				appState.studySessions.find((ss) => ss.id === scheduledTask.studySessionId);

			if (!studySession) continue;

			const sessionScheduledTasks = sessionTasksMap.get(scheduledTask.studySessionId) || [];

			const li = createTodayScheduleTaskItem(
				task,
				scheduledTask,
				sessionScheduledTasks,
				studySession.startTime,
			);

			todayListEl.appendChild(li);
		}
	}

	function createTodayScheduleTaskItem(task, scheduledTask, sessionScheduledTasks, sessionStartTime) {
		const li = document.createElement("li");
		li.className = "ui-item schedule-task-item";

		const assignment = appState.assignmentById.get(task.assignmentId);
		const module = assignment ? appState.moduleById.get(assignment.moduleId) : null;

		const assignmentOverdue = assignment ? isOverdue(assignment.deadline) : false;
		const taskOverdue = isOverdue(task.deadline);

		if (taskOverdue) li.classList.add("ui-item--overdue-warn");

		let offsetMinutes = 0;
		for (const st of sessionScheduledTasks) {
			if (st.position >= scheduledTask.position) break;
			offsetMinutes += st.durationMinutes;
		}

		const taskStart = addMinutesToTime(sessionStartTime, offsetMinutes);
		const taskEnd = addMinutesToTime(taskStart, scheduledTask.durationMinutes);

		const inner = document.createElement("div");
		inner.className = "ui-item-inner";

		const time = document.createElement("div");
		time.className = "schedule-task-time";
		time.textContent = `${formatTime(taskStart)} – ${formatTime(taskEnd)}`;

		const row = document.createElement("div");
		row.className = "ui-item-row";

		const dot = document.createElement("span");
		dot.className = "ui-dot";
		if (module?.colour) {
			dot.style.backgroundColor = module.colour;
		}

		const title = document.createElement("div");
		title.className = "ui-item-main";
		title.textContent = task.name;

		row.appendChild(dot);
		row.appendChild(title);

		const assignmentMeta = document.createElement("div");
		assignmentMeta.className = "ui-item-meta ui-item-meta--assignment";
		assignmentMeta.textContent = assignment?.name || "Unknown assignment";
		assignmentMeta.classList.toggle("danger-text", assignmentOverdue);

		const meta = document.createElement("div");
		meta.className = "ui-item-meta";

		const parts = [];
		parts.push(formatMinutes(scheduledTask.durationMinutes));
		if (assignmentOverdue) parts.push("Assignment overdue");
		else if (taskOverdue) parts.push("Task overdue");
		meta.textContent = parts.join(" • ");

		const actions = document.createElement("div");
		actions.className = "ui-item-actions";

		const assignmentBtn = document.createElement("button");
		assignmentBtn.className = "icon-btn";
		assignmentBtn.textContent = "🔗";
		assignmentBtn.title = "Open assignment";
		assignmentBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			window.location.href = `/assignments/${task.assignmentId}`;
		});

		actions.appendChild(assignmentBtn);

		inner.appendChild(time);
		inner.appendChild(row);
		inner.appendChild(assignmentMeta);
		inner.appendChild(meta);
		inner.appendChild(actions);

		li.appendChild(inner);

		return li;
	}

	function startOfDay(date) {
		const d = new Date(date);
		d.setHours(0, 0, 0, 0);
		return d;
	}

	function addMinutesToTime(timeString, minutesToAdd) {
		const [hours, minutes] = timeString.split(":").map(Number);
		const totalMinutes = (hours * 60) + minutes + minutesToAdd;

		const newHours = Math.floor(totalMinutes / 60);
		const newMinutes = totalMinutes % 60;

		return `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}`;
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

	function refreshNewAssignmentDeadlineRange() {
		const semester = appState.semesterById.get(appState.activeSemesterId);
		if (semester) {
			deadlineInput.min = `${semester.startDate}T00:00`;
			deadlineInput.max = `${semester.endDate}T23:59`;
		}
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

	function renderTutorialBanner() {
		if (appState.tutorialCompleted) {
			setTutorialBanner(infoBannerEl, "", "");
			return;
		}

		const activeTasksWithEtc = appState.tasks.filter(task => task.etcMinutes !== null && ["todo", "doing"].includes(task.status));

		if (appState.modules.length === 0) {
			setTutorialBanner(
				infoBannerEl, 
				"Step 1 of 5: Create your first module",
				"This is your dashboard, where you manage modules and assignments, and view tasks scheduled for today. Create a module to continue."
			);
		} else if (appState.assignments.length === 0) {
			setTutorialBanner(
				infoBannerEl,
				"Step 2 of 5: Create your first assignment",
				"All active assignments can be seen in the list below. Create an assignment to continue."
			);

			setTutorialBanner(
				newAssignmentInfoBannerEl,
				"Step 2 of 5: Create your first assignment",
				"The description is optional, but just like the weight and confidence, it helps improve AI estimation accuracy."
			);
		} else if (activeTasksWithEtc.length === 0 && appState.scheduledTasks.length === 0) {
			setTutorialBanner(
				infoBannerEl,
				"Step 3 of 5: Break down your assignment into tasks",
				appState.assignments.length == 1 ? "Click on the assignment to open its task board." : "Click on an assignment to open its task board."
			);
		} else if (appState.scheduledTasks.length === 0) {
			setTutorialBanner(
				infoBannerEl,
				"Step 4 of 5: Schedule your tasks",
				"Navigate to your schedule in the navigation bar."
			);
		} else if (appState.scheduledTasks.length > 0) {
			setTutorialBanner(
				infoBannerEl,
				"Step 5 of 5: Move tasks through the stages",
				appState.assignments.length == 1 ? "Go back into the assignment." : "Go back into an assignment."
			);
		}
		else {
			setTutorialBanner(infoBannerEl, "", "");
		}
	}
}

function initSemesterModal() {
	const modalEl = document.getElementById("semester-modal");
	if (!modalEl) return;

	const activeSelect = modalEl.querySelector("#sm-active");
	const studySessionsBtn = modalEl.querySelector("#sm-study-sessions-btn");
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

			await loadDashboardData();
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

			await loadDashboardData();
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
	activeSelect.addEventListener("change", updateSetActiveButtonState);

	function refreshModal() {
		populateActiveSemesterSelect();
		renderSemestersList();
		updateSetActiveButtonState();
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
			editBtn.title = "Edit semester";
			editBtn.dataset.semesterId = s.id;
			editBtn.dataset.action = "edit";

			const deleteBtn = document.createElement("button");
			deleteBtn.className = "icon-btn icon-btn-danger";
			deleteBtn.type = "button";
			deleteBtn.textContent = "✖";
			deleteBtn.dataset.semesterId = s.id;
			deleteBtn.dataset.action = "delete";

			if (appState.semesters.length === 1 || appState.activeSemesterId === s.id) {
				deleteBtn.disabled = true;
				deleteBtn.title = "You must keep at least one semester";
			} else {
				deleteBtn.title = "Delete semester";
			}

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
			studySessionsBtn.disabled = false;
		} else {
			activeSelect.value = "";
			studySessionsBtn.disabled = true;
		}
	}

	function updateSetActiveButtonState() {
		const picked = activeSelect.value;

		if (!picked) {
			setActiveBtn.disabled = true;
			return;
		}

		if (Number(picked) === appState.activeSemesterId) {
			setActiveBtn.disabled = true;
			return;
		}

		setActiveBtn.disabled = false;
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

async function initDashboardOnboarding() {
	if (getRouteName() !== "dashboard-onboarding") return;

	const onboardingChecklistEl = document.getElementById("onboarding-checklist");
	const semesterRow = onboardingChecklistEl.querySelector('[data-check="semester"]');
	const semesterCheckLabel = semesterRow.querySelector(".checklist-label");
	const semesterCheckButton = semesterRow.querySelector("button");
	const studySessionRow = onboardingChecklistEl.querySelector('[data-check="study-session"]');
	const studySessionCheckLabel = studySessionRow.querySelector(".checklist-label");
	const studySessionCheckButton = studySessionRow.querySelector("button");
	const finalRow = onboardingChecklistEl.querySelector('[data-check="final"]');
	const dashboardBtn = document.getElementById('dashboard-btn');

	document.addEventListener("semester:created", refreshChecklist);
	dashboardBtn.addEventListener("click", async (e) => {
		e.preventDefault();

		try {
			await postJson("/api/settings/onboarding");
			
			window.location.href = "/dashboard";
		} catch (err) {
			showToast(err.message || "Failed to complete onboarding.", { type: "error" });
		}
	});

	window.addEventListener("pageshow", async (e) => {
		if (e.persisted) {
			await loadSettings();
			await refreshChecklist();
		}
	});

	await refreshChecklist();

	async function refreshChecklist() {
		await loadDashboardData();

		renderOnboardingChecklist();
	}

	function renderOnboardingChecklist() {
		const hasSemesters = appState.semesters.length > 0;
		const hasStudySessions = appState.studySessions.length > 0;

		semesterRow.classList.add("checklist-item--visible");

		if (hasSemesters) {
			semesterCheckLabel.classList.add("checklist-label--completed");
			semesterCheckButton.disabled = true;
		} else {
			semesterCheckLabel.classList.remove("checklist-label--completed");
			semesterCheckButton.disabled = false;
		}

		if (hasSemesters) {
			studySessionRow.classList.add("checklist-item--visible");
		} else {
			studySessionRow.classList.remove("checklist-item--visible");
		}

		if (hasStudySessions) {
			studySessionCheckLabel.classList.add("checklist-label--completed");
			studySessionCheckButton.disabled = true;
		} else {
			studySessionCheckLabel.classList.remove("checklist-label--completed");
			studySessionCheckButton.disabled = false;
		}

		if (hasSemesters && hasStudySessions) {
			finalRow.classList.add("checklist-item--visible");
		} else {
			finalRow.classList.remove("checklist-item--visible");
		}
	}
}

function initNewSemesterForm() {
	const form = document.getElementById("new-semester-form");
	if (!form) return;

	const errorEl = document.getElementById("ns-error");

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		setAlert(errorEl, "");

		const formData = new FormData(form);

		const payload = {
			name: formData.get("name"),
			startDate: formData.get("startDate"),
			endDate: formData.get("endDate")
		};

		try {
			const res = await postJson("/api/semesters", payload);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();

			document.dispatchEvent(new CustomEvent("semester:created"));

			showToast(res.message);
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
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

			document.dispatchEvent(new CustomEvent("semester:deleted"));

			const semesterModal = document.getElementById("semester-modal");
			if (semesterModal.classList.contains("is-open")) {
				await loadDashboardData();
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
	const deadlineInput = form.querySelector("#na-deadline");

	const semester = appState.semesterById.get(appState.activeSemesterId);
	if (semester) {
		deadlineInput.min = `${semester.startDate}T00:00`;
		deadlineInput.max = `${semester.endDate}T23:59`;
	}

	function syncRanges() {
		if (weightEl && weightValEl) weightValEl.textContent = weightEl.value;
		if (confEl && confValEl) confValEl.textContent = confEl.value;
	};

	weightEl.addEventListener("input", syncRanges);
	confEl.addEventListener("input", syncRanges);
	form.addEventListener("reset", () => {
		setTimeout(syncRanges, 0);
	});

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
	const infoBannerEl = document.getElementById("info-banner");
	const newTaskInfoBannerEl = document.getElementById("nt-info-banner");

	document.addEventListener("assignment:updated", refreshAssignment);
	document.addEventListener("task:created", refreshAssignment);
	document.addEventListener("task:updated", refreshAssignment);
	document.addEventListener("task:deleted", refreshAssignment);
	editModal.addEventListener("modal:open", populateEditAssignmentForm);
	main.addEventListener("click", handleAssignmentActions);

	document.addEventListener("tutorial:completed", async () => {
		await loadSettings();
		await refreshAssignment();
	});

	window.addEventListener("pageshow", async (e) => {
		if (e.persisted) {
			await loadSettings();
			await refreshAssignment();
		}
	});

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
		renderLoadingListState(todoListEl);
		renderLoadingListState(doingListEl);
		renderLoadingListState(doneListEl);

		await loadAssignmentData(assignmentId);

		renderDetailsAndUpdateButtons();
		renderTaskBoard();

		renderTutorialBanner();
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
			let totalScheduledMinutes = 0;
			for (const st of appState.scheduledTaskById.values()) {
				if (st.taskId === t.id) {
					totalScheduledMinutes += st.durationMinutes;
				}
			}

			const li = document.createElement("li");
			li.className = "ui-item";
			li.dataset.taskId = t.id;
			if (overdue) li.classList.add("ui-item--overdue-warn");
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

			if (t.deadline){
				const meta1 = document.createElement("div");
				meta1.className = "ui-item-meta";
				meta1.textContent = `Due: ${formatDueDate(t.deadline)}`;
				content.appendChild(meta1);
			}

			const meta2 = document.createElement("div");
			meta2.className = "ui-item-meta";

			const parts = [];

			if (t.etcMinutes != null) {
				parts.push(`ETC ${formatMinutes(t.etcMinutes)}`);

				if (totalScheduledMinutes > 0) {
					if (totalScheduledMinutes == t.etcMinutes && t.status !== "done") {
						parts.push("scheduled");
					} else {
						parts.push(`${formatMinutes(totalScheduledMinutes)} sched.`);
					}
				}
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
			editBtn.title = "Edit task";
			editBtn.dataset.taskId = t.id;
			editBtn.dataset.action = "edit";

			const deleteBtn = document.createElement("button");
			deleteBtn.className = "icon-btn icon-btn-danger";
			deleteBtn.type = "button";
			deleteBtn.textContent = "✖";
			deleteBtn.title = "Delete task";
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

	function renderTutorialBanner() {
		if (appState.tutorialCompleted) {
			setTutorialBanner(infoBannerEl, "", "");
			return;
		}

		const activeTasksWithEtc = appState.tasks.filter(task => task.etcMinutes !== null && ["todo", "doing"].includes(task.status));

		if (activeTasksWithEtc.length === 0) {
			if (appState.scheduledTasks.length === 0) {
				setTutorialBanner(
					infoBannerEl,
					"Step 3 of 5: Break down your assignment into tasks",
					appState.tasks.length > 0 ? "Have at least one task with an ETC in the To Do or Doing column to continue." 
						: "Here you fill up the assignment with tasks and keep track of their status. Create the first task to continue."
				);

				setTutorialBanner(
					newTaskInfoBannerEl,
					"Step 3 of 5: Break down your assignment into tasks",
					"Use the estimate button to get an AI-generated ETC for your task based on its name and description."
				);
			}
			else {
				setTutorialBanner(
					infoBannerEl,
					"Step 5 of 5: Move tasks through the stages",
					appState.tasks.length === 0 ? "Now that the only task is done, the assignment can be marked as completed by clicking the button above. That’s it!" 
						: "Now that all tasks are done, the assignment can be marked as completed by clicking the button above. That’s it!",
					"Finish Tutorial"
				);
			}
		} else if (appState.scheduledTasks.length === 0) {
			setTutorialBanner(
				infoBannerEl,
				"Step 4 of 5: Schedule your tasks",
				"Navigate to your schedule in the navigation bar."
			);
		} else if (appState.scheduledTasks.length > 0) {
			setTutorialBanner(
				infoBannerEl,
				"Step 5 of 5: Move tasks through the stages",
				appState.tasks.length == 1 ? "Move tasks to the right as you work through them, either by drag and dropping or by editing them. Move the task into the Done column to continue." 
					: "Move tasks to the right as you work through them, either by drag and dropping or by editing them. Move all tasks into the Done column to continue."
			);
		}
		else {
			setTutorialBanner(infoBannerEl, "", "");
		}
	}
}

function initEditAssignmentForm() {
	const form = document.getElementById("edit-assignment-form");
	if (!form) return;

	const weightEl = form.querySelector("#ea-weight");
	const weightValEl = form.querySelector("#ea-weight-val");
	const confEl = form.querySelector("#ea-confidence");
	const confValEl = form.querySelector("#ea-confidence-val");
	const deadlineInput = form.querySelector("#ea-deadline");

	deadlineInput.min = `${appState.semester.startDate}T00:00`;
	deadlineInput.max = `${appState.semester.endDate}T23:59`;

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

	const errorEl = document.getElementById("nt-error");
	const estimateBtn = document.getElementById("nt-estimate-btn");
	const etcInput = document.getElementById("nt-etc");
	const deadlineInput = form.querySelector("#nt-deadline");

	deadlineInput.min = `${appState.semester.startDate}T00:00`;
	deadlineInput.max = `${appState.semester.endDate}T23:59`;

	async function handleEstimateClick() {
		if (!estimateBtn || !etcInput) return;

		const formData = new FormData(form);

		const taskName = formData.get("name")?.toString().trim();
		if (!taskName) {
			showToast("Enter a task name before estimating.", { type: "error" });
			return;
		}

		const originalBtnText = estimateBtn.textContent;

		estimateBtn.disabled = true;
		estimateBtn.textContent = "Estimating...";

		try {
			const payload = {
				assignmentId: appState.assignment.id,
				taskName,
				taskDescription: formData.get("description")?.toString().trim() || null
			};

			const res = await postJson("/api/tasks/estimate", payload);

			etcInput.value = res.estimatedMinutes;

			showToast(res.message);
		} catch (err) {
			showToast(err.message || "Failed to estimate task time.", { type: "error" });
		} finally {
			estimateBtn.disabled = false;
			estimateBtn.textContent = originalBtnText;
		}
	}

	estimateBtn.addEventListener("click", handleEstimateClick);

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

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

	const errorEl = document.getElementById("et-error");
	const estimateBtn = document.getElementById("et-estimate-btn");
	const etcInput = document.getElementById("et-etc");
	const deadlineInput = form.querySelector("#et-deadline");

	deadlineInput.min = `${appState.semester.startDate}T00:00`;
	deadlineInput.max = `${appState.semester.endDate}T23:59`;

	async function handleEstimateClick() {
		if (!estimateBtn || !etcInput) return;

		const formData = new FormData(form);

		const taskName = formData.get("name")?.toString().trim();
		if (!taskName) {
			showToast("Enter a task name before estimating.", { type: "error" });
			return;
		}

		const originalBtnText = estimateBtn.textContent;

		estimateBtn.disabled = true;
		estimateBtn.textContent = "Estimating...";

		try {
			const payload = {
				assignmentId: appState.assignment.id,
				taskName,
				taskDescription: formData.get("description")?.toString().trim() || null
			};

			const res = await postJson("/api/tasks/estimate", payload);

			etcInput.value = res.estimatedMinutes;

			showToast(res.message);
		} catch (err) {
			showToast(err.message || "Failed to estimate task time.", "error");
		} finally {
			estimateBtn.disabled = false;
			estimateBtn.textContent = originalBtnText;
		}
	}

	estimateBtn.addEventListener("click", handleEstimateClick);

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

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
			etcMinutes: etcMinutes ? Number(etcMinutes) : null
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
		
		drag.ghost.style.left = `${e.clientX - drag.offsetX}px`;
		drag.ghost.style.top = `${e.clientY - drag.offsetY}px`;
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
		ghost.style.top = `${rect.top}px`;
		ghost.style.left = `${rect.left}px`;
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

// Study Sessions
async function initStudySessions() {
	if (getRouteName() !== "studySessions") return;

	const semesterNameEl = document.getElementById("active-semester-name");
	const studySessionsListEl = document.querySelector('[data-list="studySessions"]');
	const newStudySessionBtnEl = document.querySelector('[data-modal-open="new-study-session-modal"]');
	const infoBannerEl = document.getElementById("info-banner");

	document.addEventListener("activeSemester:changed", async () => {
		await loadSettings();
		await refreshStudySessions();
	});
	document.addEventListener("semester:created", refreshStudySessions);
	document.addEventListener("semester:updated", refreshStudySessions);
	document.addEventListener("semester:deleted", async () => {
		await loadSettings();
		await refreshStudySessions();
	});
	document.addEventListener("studySession:created", refreshStudySessions);
	document.addEventListener("studySession:updated", refreshStudySessions);
	document.addEventListener("studySession:deleted", refreshStudySessions);

	window.addEventListener("pageshow", async (e) => {
		if (e.persisted) {
			await loadSettings();
			await refreshStudySessions();
		}
	});

	studySessionsListEl.addEventListener("click", (e) => {
		const btn = e.target.closest("button[data-study-session-id][data-action]");
		if (!btn) return;

		const studySessionId = Number(btn.dataset.studySessionId);

		if (btn.dataset.action === "edit") {
			openEditStudySessionModal(studySessionId);
		} else if (btn.dataset.action === "delete") {
			openDeleteStudySessionModal(studySessionId);
		}
	});

	await refreshStudySessions();

	async function refreshStudySessions() {
		renderLoadingListState(studySessionsListEl);

		await loadStudySessionsData(appState.activeSemesterId);

		renderStudySessionsList();
		renderSemesterNameAndUpdateButton();

		renderOnboardingBanner();
	}

	function renderStudySessionsList() {
		if (!appState.studySessions.length) {
			renderEmptyListState(studySessionsListEl, "No study sessions yet.");
			return;
		}

		studySessionsListEl.innerHTML = "";

		const grouped = new Map();
		for (const ss of appState.studySessions) {
			if (!grouped.has(ss.dayOfWeek)) {
				grouped.set(ss.dayOfWeek, []);
			}
			grouped.get(ss.dayOfWeek).push(ss);
		}

		for (let day = 0; day <= 6; day++) {
			const daySessions = grouped.get(day);
			if (!daySessions) continue;

			daySessions.sort((a, b) => a.startTime.localeCompare(b.startTime));

			const groupDiv = document.createElement("div");
			groupDiv.className = "ss-day-group";

			const heading = document.createElement("h3");
			heading.className = "ss-day-label";
			heading.textContent = DAY_NAMES[day];

			const list = document.createElement("ul");
			list.className = "ui-list ui-list--editable";

			for (const ss of daySessions) {
				const li = document.createElement("li");
				li.className = "ui-item";

				const inner = document.createElement("div");
				inner.className = "ui-item-inner";

				const row = document.createElement("div");
				row.className = "ui-item-row";

				const title = document.createElement("div");
				title.className = "ui-item-main";

				const start = formatTime(ss.startTime);
				const end = getEndTime(ss.startTime, ss.durationMinutes);

				title.textContent = `${start} – ${end}`;

				row.appendChild(title);

				const actions = document.createElement("div");
				actions.className = "ui-item-actions";

				const editBtn = document.createElement("button");
				editBtn.className = "icon-btn";
				editBtn.textContent = "✎";
				editBtn.title = "Edit study session";
				editBtn.dataset.studySessionId = ss.id;
				editBtn.dataset.action = "edit";

				const deleteBtn = document.createElement("button");
				deleteBtn.className = "icon-btn icon-btn-danger";
				deleteBtn.textContent = "✖";
				deleteBtn.title = "Delete study session";
				deleteBtn.dataset.studySessionId = ss.id;
				deleteBtn.dataset.action = "delete";

				actions.appendChild(editBtn);
				actions.appendChild(deleteBtn);

				inner.appendChild(row);
				inner.appendChild(actions);
				li.appendChild(inner);
				list.appendChild(li);
			}

			groupDiv.appendChild(heading);
			groupDiv.appendChild(list);
			studySessionsListEl.appendChild(groupDiv);
		}
	}

	function renderSemesterNameAndUpdateButton() {
		const hasActiveSemesterId = !!appState.activeSemesterId;

		if (!hasActiveSemesterId) {
			semesterNameEl.textContent = "No semester selected";
			semesterNameEl.classList.add("warning-text");
		} else {
			const semester = appState.semesterById.get(appState.activeSemesterId);
			semesterNameEl.textContent = semester?.name ?? "";
			semesterNameEl.classList.remove("warning-text");
		}

		if (newStudySessionBtnEl) {
			newStudySessionBtnEl.disabled = !hasActiveSemesterId;
		}
	}

	function openEditStudySessionModal(studySessionId) {
		const ss = appState.studySessionById.get(studySessionId);
		if (!ss) return;

		const form = document.getElementById("edit-study-session-form");
		const modal = document.getElementById("edit-study-session-modal");
		if (!form || !modal) return;

		const errorEl = document.getElementById("ess-error");
		setAlert(errorEl, "");

		form.querySelector("#ess-id").value = ss.id;
		form.querySelector("#ess-day").value = ss.dayOfWeek;
		form.querySelector("#ess-start").value = formatTime(ss.startTime);
		form.querySelector("#ess-duration").value = ss.durationMinutes;

		modal.classList.add("is-open");
		document.body.classList.add("modal-open");
	}

	async function openDeleteStudySessionModal(studySessionId) {
		const modal = document.getElementById("delete-study-session-modal");
		const form = document.getElementById("delete-study-session-form");

		const errorEl = document.getElementById("dss-error");
		const msgEl = document.getElementById("dss-message");

		setAlert(errorEl, "");
		msgEl.textContent = "Are you sure you want to delete this study session?";

		form.querySelector("#dss-id").value = studySessionId;

		modal.classList.add("is-open");
		document.body.classList.add("modal-open");
	}

	function renderOnboardingBanner() {
		if (appState.onboarded) {
			setBanner(infoBannerEl, "");
			return
		}

		if (appState.studySessions.length > 0) {
			setBanner(
				infoBannerEl,
				"Finished setting up your study sessions?",
				"Continue onboarding",
				"/dashboard"
			);
		} else {
			setBanner(
				infoBannerEl,
				"Create your first study session to continue onboarding."
			);
		}
	}
}

function initNewStudySessionForm() {
	const form = document.getElementById("new-study-session-form");
	if (!form) return;

	const daySelect = document.getElementById("nss-day");
	const startTimeSelect = document.getElementById("nss-start");
	const errorEl = document.getElementById("nss-error");

	DAY_NAMES.forEach((name, index) => {
		const opt = document.createElement("option");
		opt.value = index;
		opt.textContent = name;
		daySelect.appendChild(opt);
	});

	for (let h = 0; h < 24; h++) {
		for (let m = 0; m < 60; m += 15) {
			const hh = String(h).padStart(2, "0");
			const mm = String(m).padStart(2, "0");

			const opt = document.createElement("option");
			opt.value = `${hh}:${mm}`;
			opt.textContent = `${hh}:${mm}`;

			startTimeSelect.appendChild(opt);
		}
	}
	startTimeSelect.value = "18:00";

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		setAlert(errorEl, "");

		const formData = new FormData(form);

		const payload = {
			dayOfWeek: Number(formData.get("dayOfWeek")),
			startTime: formData.get("startTime"),
			durationMinutes: Number(formData.get("durationMinutes"))
		};

		try {
			const res = await postJson(`/api/semesters/${appState.activeSemesterId}/study-sessions`, payload);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();

			document.dispatchEvent(new CustomEvent("studySession:created"));

			showToast(res.message);
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

function initEditStudySessionForm() {
	const form = document.getElementById("edit-study-session-form");
	if (!form) return;

	const daySelect = document.getElementById("ess-day");
	const startTimeSelect = document.getElementById("ess-start");
	const errorEl = document.getElementById("ess-error");

	DAY_NAMES.forEach((name, index) => {
		const opt = document.createElement("option");
		opt.value = index;
		opt.textContent = name;
		daySelect.appendChild(opt);
	});

	for (let h = 0; h < 24; h++) {
		for (let m = 0; m < 60; m += 15) {
			const hh = String(h).padStart(2, "0");
			const mm = String(m).padStart(2, "0");

			const opt = document.createElement("option");
			opt.value = `${hh}:${mm}`;
			opt.textContent = `${hh}:${mm}`;

			startTimeSelect.appendChild(opt);
		}
	}
	startTimeSelect.value = "18:00";

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		setAlert(errorEl, "");

		const formData = new FormData(form);

		const id = Number(formData.get("id"));

		const payload = {
			dayOfWeek: Number(formData.get("dayOfWeek")),
			startTime: formData.get("startTime"),
			durationMinutes: Number(formData.get("durationMinutes"))
		};

		try {
			const res = await patchJson(`/api/study-sessions/${id}`, payload);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();

			document.dispatchEvent(new CustomEvent("studySession:updated"));

			showToast(res.message);
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

function initDeleteStudySessionForm() {
	const form = document.getElementById("delete-study-session-form");
	if (!form) return;

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const errorEl = document.getElementById("dss-error");
		setAlert(errorEl, "");

		const formData = new FormData(form);
		const id = Number(formData.get("id"));

		try {
			await deleteJson(`/api/study-sessions/${id}`);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();

			document.dispatchEvent(new CustomEvent("studySession:deleted"));
			showToast("Study session deleted successfully.");
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

// Schedule
async function initSchedule() {
	if (getRouteName() !== "schedule") return;

	const prevWeekBtnEl = document.getElementById("prev-week-btn");
	const selectedWeekNameEl = document.getElementById("selected-week-name");
	const nextWeekBtnEl = document.getElementById("next-week-btn");
	const scheduleListEl = document.querySelector('[data-list="schedule"]');
	const unscheduledTasksListEl = document.querySelector('[data-list="unscheduledTasks"]');
	const autoScheduleBtnEl = document.querySelector('[data-modal-open="auto-schedule-modal"]');
	const infoBannerEl = document.getElementById("info-banner");

	document.addEventListener("selectedWeek:changed", refreshSchedule);
	document.addEventListener("scheduledTask:created", refreshSchedule);
	document.addEventListener("scheduledTask:updated", refreshSchedule);
	document.addEventListener("scheduledTask:deleted", refreshSchedule);

	document.addEventListener("tutorial:completed", async () => {
		await loadSettings();
		await refreshDashboard();
	});

	window.addEventListener("pageshow", async (e) => {
		if (e.persisted) {
			await loadSettings();
			await refreshSchedule();
		}
	});

	prevWeekBtnEl.addEventListener("click", () => changeWeek(-1));
	nextWeekBtnEl.addEventListener("click", () => changeWeek(1));

	let isFirstLoad = true;

	await refreshSchedule();

	async function refreshSchedule() {
		renderLoadingListState(scheduleListEl);
		renderLoadingListState(unscheduledTasksListEl);

		await loadScheduleData(appState.activeSemesterId);

		renderWeekNameAndUpdateButtons();
		renderScheduleList();
		renderUnscheduledTasksList();

		renderTutorialBanner();

		isFirstLoad = false;
	}

	function renderScheduleList() {
		if (!appState.studySessions.length) {
			renderEmptyListState(scheduleListEl, "No study sessions yet.");
			return;
		}

		scheduleListEl.innerHTML = "";

		const groupedSessions = new Map();

		for (const ss of appState.studySessions) {
			if (!groupedSessions.has(ss.dayOfWeek)) {
				groupedSessions.set(ss.dayOfWeek, []);
			}
			groupedSessions.get(ss.dayOfWeek).push(ss);
		}

		const scheduledTasksBySessionId = new Map();

		for (const st of appState.scheduledTasks) {
			if (!scheduledTasksBySessionId.has(st.studySessionId)) {
				scheduledTasksBySessionId.set(st.studySessionId, []);
			}
			scheduledTasksBySessionId.get(st.studySessionId).push(st);
		}

		const semester = appState.semesterById.get(appState.activeSemesterId);
		const semesterStart = startOfDay(semester.startDate);
		const semesterEnd = startOfDay(semester.endDate);

		const board = document.createElement("div");
		board.className = "schedule-board";

		const weekStart = new Date(appState.selectedWeekStart);

		let hasVisibleSessions = false;

		for (let day = 0; day <= 6; day++) {
			const dayDate = new Date(weekStart);
			dayDate.setDate(weekStart.getDate() + day);

			const dayDateOnly = startOfDay(dayDate);

			if (dayDateOnly < semesterStart || dayDateOnly > semesterEnd) {
				continue;
			}

			const daySessions = groupedSessions.get(day);
			if (!daySessions || !daySessions.length) continue;

			hasVisibleSessions = true;

			daySessions.sort((a, b) => a.startTime.localeCompare(b.startTime));

			const dayColumn = document.createElement("div");
			dayColumn.className = "schedule-day-column";

			const sessionDate = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, "0")}-${String(dayDate.getDate()).padStart(2, "0")}`;
			dayColumn.dataset.date = sessionDate;

			const dayHeading = document.createElement("h3");
			dayHeading.className = "schedule-day-label";
			dayHeading.textContent = `${DAY_NAMES[day]} ${dayDate.toLocaleDateString("en-GB", {
				day: "numeric",
				month: "short"
			})}`;

			const today = new Date();
			const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

			if (todayStr === sessionDate) {
				dayHeading.classList.add("is-today");
			}

			dayColumn.appendChild(dayHeading);

			for (const ss of daySessions) {
				const sessionWrap = document.createElement("div");
				sessionWrap.className = "schedule-session";

				const sessionHeading = document.createElement("div");
				sessionHeading.className = "schedule-session-label";

				const start = formatTime(ss.startTime);
				const end = getEndTime(ss.startTime, ss.durationMinutes);
				sessionHeading.textContent = `${start} – ${end}`;

				const sessionList = document.createElement("ul");
				sessionList.className = "ui-list ui-list--editable";
				sessionList.innerHTML = "";

				const sessionScheduledTasks = (scheduledTasksBySessionId.get(ss.id) || [])
					.filter((st) => st.sessionDate === sessionDate)
					.sort((a, b) => a.position - b.position);

				const usedMinutes = sessionScheduledTasks.reduce((sum, st) => sum + st.durationMinutes, 0);
				const freeMinutes = Math.max(0, ss.durationMinutes - usedMinutes);

				sessionList.dataset.studySessionId = ss.id;
				sessionList.dataset.sessionDate = sessionDate;
				sessionList.dataset.sessionDurationMinutes = ss.durationMinutes;
				sessionList.dataset.freeMinutes = freeMinutes;

				if (!sessionScheduledTasks.length) {
					renderEmptyListState(sessionList, "No tasks scheduled");
				} else {
					for (const scheduledTask of sessionScheduledTasks) {
						const task =
							appState.taskById?.get(scheduledTask.taskId) ||
							appState.tasks.find((t) => t.id === scheduledTask.taskId);

						if (!task) continue;

						const li = createScheduleTaskItem(task, scheduledTask, sessionScheduledTasks, ss.startTime);
						sessionList.appendChild(li);
					}
				}

				sessionWrap.appendChild(sessionHeading);
				sessionWrap.appendChild(sessionList);
				dayColumn.appendChild(sessionWrap);
			}

			board.appendChild(dayColumn);
		}

		if (!hasVisibleSessions) {
			renderEmptyListState(scheduleListEl, "No study sessions this week.");
			return;
		}

		scheduleListEl.appendChild(board);

		scrollToToday(board);
	}

	function scrollToToday(board) {
		if (!isFirstLoad) return;

		const today = new Date();
		const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

		const todayColumn = board.querySelector(`[data-date="${todayStr}"]`);

		if (!todayColumn) return;

		todayColumn.scrollIntoView({
			behavior: "smooth",
			inline: "center",
			block: "nearest"
		});
	}

	function createScheduleTaskItem(task, scheduledTask, sessionScheduledTasks, sessionStartTime) {
		const li = document.createElement("li");
		li.className = "ui-item schedule-task-item";

		const assignment = appState.assignmentById.get(task.assignmentId);
		const module = assignment ? appState.moduleById.get(assignment.moduleId) : null;

		const assignmentOverdue = isOverdue(assignment.deadline);
		const taskOverdue = isOverdue(task.deadline);

		if (taskOverdue) li.classList.add("ui-item--overdue-warn");
		if (task.status !== "done") {
			li.classList.add("ui-item--draggable");
		}

		let offsetMinutes = 0;

		for (const st of sessionScheduledTasks) {
			if (st.position >= scheduledTask.position) break;
			offsetMinutes += st.durationMinutes;
		}

		const taskStart = addMinutesToTime(sessionStartTime, offsetMinutes);
		const taskEnd = addMinutesToTime(taskStart, scheduledTask.durationMinutes);

		const inner = document.createElement("div");
		inner.className = "ui-item-inner";

		const time = document.createElement("div");
		time.className = "schedule-task-time";
		time.textContent = `${formatTime(taskStart)} – ${formatTime(taskEnd)}`;

		const row = document.createElement("div");
		row.className = "ui-item-row";

		const dot = document.createElement("span");
		dot.className = "ui-dot";
		if (module?.colour) {
			dot.style.backgroundColor = module.colour;
		}

		const title = document.createElement("div");
		title.className = "ui-item-main";
		title.textContent = task.name;

		row.appendChild(dot);
		row.appendChild(title);

		const assignmentMeta = document.createElement("div");
		assignmentMeta.className = "ui-item-meta ui-item-meta--assignment";
		assignmentMeta.textContent = assignment?.name || "Unknown assignment";
		assignmentMeta.classList.toggle("danger-text", assignmentOverdue);

		const meta = document.createElement("div");
		meta.className = "ui-item-meta";

		const parts = [];
		parts.push(formatMinutes(scheduledTask.durationMinutes));
		if (assignmentOverdue) parts.push("Assignment overdue");
		else if (taskOverdue) parts.push("Task overdue");
		meta.textContent = parts.join(" • ");

		const actions = document.createElement("div");
		actions.className = "ui-item-actions";



		const moveControls = document.createElement("div");
		moveControls.className = "schedule-move-controls";

		const moveUpBtn = document.createElement("button");
		moveUpBtn.type = "button";
		moveUpBtn.className = "icon-btn";
		moveUpBtn.textContent = "▲";
		moveUpBtn.title = "Move up";
		moveUpBtn.disabled = scheduledTask.position === 0;
		moveUpBtn.addEventListener("click", async (e) => {
			e.stopPropagation();
			await moveScheduledTask(scheduledTask, sessionScheduledTasks, "up");
		});

		const moveDownBtn = document.createElement("button");
		moveDownBtn.type = "button";
		moveDownBtn.className = "icon-btn";
		moveDownBtn.textContent = "▼";
		moveDownBtn.title = "Move down";
		moveDownBtn.disabled = scheduledTask.position === sessionScheduledTasks.length - 1;
		moveDownBtn.addEventListener("click", async (e) => {
			e.stopPropagation();
			await moveScheduledTask(scheduledTask, sessionScheduledTasks, "down");
		});

		moveControls.appendChild(moveUpBtn);
		moveControls.appendChild(moveDownBtn);
		

		const unscheduleBtn = document.createElement("button");
		unscheduleBtn.className = "icon-btn";
		unscheduleBtn.textContent = "✖";
		unscheduleBtn.title = "Unschedule task";
		unscheduleBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			unscheduleTask(scheduledTask.id);
		});

		const assignmentBtn = document.createElement("button");
		assignmentBtn.className = "icon-btn";
		assignmentBtn.textContent = "🔗";
		assignmentBtn.title = "Open assignment";
		assignmentBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			window.location.href = `/assignments/${task.assignmentId}`;
		});

		actions.appendChild(moveControls);
		actions.appendChild(unscheduleBtn);
		actions.appendChild(assignmentBtn);

		inner.appendChild(time);
		inner.appendChild(row);
		inner.appendChild(assignmentMeta);
		inner.appendChild(meta);
		inner.appendChild(actions);
		li.appendChild(inner);

		return li;
	}

	function startOfDay(date) {
		const d = new Date(date);
		d.setHours(0, 0, 0, 0);
		return d;
	}

	function addMinutesToTime(timeString, minutesToAdd) {
		const [hours, minutes] = timeString.split(":").map(Number);
		const totalMinutes = (hours * 60) + minutes + minutesToAdd;

		const newHours = Math.floor(totalMinutes / 60);
		const newMinutes = totalMinutes % 60;

		return `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}`;
	}

	function renderWeekNameAndUpdateButtons() {
		const hasActiveSemesterId = !!appState.activeSemesterId;

		if (!hasActiveSemesterId) {
			selectedWeekNameEl.textContent = "No semester selected";
			selectedWeekNameEl.classList.add("warning-text");
			prevWeekBtnEl.classList.add("disabled");
			nextWeekBtnEl.classList.add("disabled");
			autoScheduleBtnEl.disabled = true;
		} else {
			const semester = appState.semesterById.get(appState.activeSemesterId);
			const semesterStart = new Date(semester.startDate);
			const semesterEnd = new Date(semester.endDate);

			if (!appState.selectedWeekStart) {
				const today = new Date();
				let currentMonday = new Date(today);
				const jsWeekday = currentMonday.getDay();
				currentMonday.setDate(currentMonday.getDate() - ((jsWeekday + 6) % 7));

				if (currentMonday < semesterStart) {
					currentMonday = new Date(semesterStart);
					const startWeekday = currentMonday.getDay();
					currentMonday.setDate(currentMonday.getDate() - ((startWeekday + 6) % 7));
				}

				if (currentMonday > semesterEnd) {
					currentMonday = new Date(semesterEnd);
					const endWeekday = currentMonday.getDay();
					currentMonday.setDate(currentMonday.getDate() - ((endWeekday + 6) % 7));
				}

				appState.selectedWeekStart = currentMonday;
			}

			const selectedDate = appState.selectedWeekStart;

			const mondayOfWeek = new Date(selectedDate);
			mondayOfWeek.setDate(selectedDate.getDate() - ((selectedDate.getDay() + 6) % 7));
			selectedWeekNameEl.textContent = `Week of ${mondayOfWeek.toLocaleDateString("en-GB", {
				day: "numeric",
				month: "short",
				year: "numeric"
			})}`;

			const prevWeekStart = new Date(mondayOfWeek);
			prevWeekStart.setDate(prevWeekStart.getDate() - 7);
			const prevWeekEnd = new Date(prevWeekStart);
			prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);

			const nextWeekStart = new Date(mondayOfWeek);
			nextWeekStart.setDate(nextWeekStart.getDate() + 7);
			const nextWeekEnd = new Date(nextWeekStart);
			nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);

			prevWeekBtnEl.classList.toggle("disabled", prevWeekEnd < semesterStart);
			nextWeekBtnEl.classList.toggle("disabled", nextWeekStart > semesterEnd);
		}
	}

	function changeWeek(delta) {
		const semester = appState.semesterById.get(appState.activeSemesterId);
		const semesterStart = new Date(semester.startDate);
		const semesterEnd = new Date(semester.endDate);

		const newMonday = new Date(appState.selectedWeekStart);
		newMonday.setDate(newMonday.getDate() + delta * 7);

		const newWeekEnd = new Date(newMonday);
		newWeekEnd.setDate(newMonday.getDate() + 6);

		if (newWeekEnd < semesterStart || newMonday > semesterEnd) return;

		appState.selectedWeekStart = newMonday;
		document.dispatchEvent(new CustomEvent("selectedWeek:changed"));
	}

	function renderUnscheduledTasksList() {
		unscheduledTasksListEl.innerHTML = "";

		let hasRenderableTasks = false;

		for (const t of appState.tasks) {
			if (t.status === "done" || t.etcMinutes == null) continue;

			let totalScheduledMinutes = 0;

			for (const st of appState.scheduledTaskById.values()) {
				if (st.taskId === t.id) {
					totalScheduledMinutes += st.durationMinutes;
				}
			}

			const remainingMinutes = t.etcMinutes - totalScheduledMinutes;
			if (remainingMinutes == 0) continue;

			const assignmentOverdue = isOverdue(appState.assignmentById.get(t.assignmentId).deadline);
			const taskOverdue = isOverdue(t.deadline);

			const li = document.createElement("li");
			li.className = "ui-item";
			li.dataset.taskId = t.id;
			if (taskOverdue) li.classList.add("ui-item--overdue-warn");
			if (appState.assignmentById.get(t.assignmentId).status !== "completed") {
				li.classList.add("ui-item--draggable");
			}

			const inner = document.createElement("div");
			inner.className = "ui-item-inner";

			const row = document.createElement("div");
			row.className = "ui-item-row";

			const dot = document.createElement("span");
			dot.className = "ui-dot";
			dot.style.backgroundColor = appState.moduleById.get(appState.assignmentById.get(t.assignmentId).moduleId).colour;

			const title = document.createElement("div");
			title.className = "ui-item-main";
			title.textContent = t.name;

			row.appendChild(dot);
			row.appendChild(title);

			const badge = document.createElement("span");
			badge.className = "ui-item-status";
			badge.textContent = t.status;
			inner.classList.add("ui-item-inner--has-badge");
			inner.appendChild(badge);

			const content = document.createElement("div");
			content.className = "ui-item-content";
			
			const meta1 = document.createElement("div");
			meta1.className = "ui-item-meta";
			meta1.textContent = appState.assignmentById.get(t.assignmentId).name;
			meta1.classList.toggle("danger-text", assignmentOverdue);
			content.appendChild(meta1);

			if (t.deadline) {
				const meta2 = document.createElement("div");
				meta2.className = "ui-item-meta";
				meta2.textContent = `Due: ${formatDueDate(t.deadline)}`;
				content.appendChild(meta2);
			}

			const meta3 = document.createElement("div");
			meta3.className = "ui-item-meta";

			const parts = [];

			if (t.etcMinutes != null) {
				parts.push(`ETC ${formatMinutes(t.etcMinutes)}`);

				unscheduledMinutes = t.etcMinutes - totalScheduledMinutes;
				if (unscheduledMinutes > 0) {
					parts.push(`${formatMinutes(unscheduledMinutes)} unsched.`);
				}
			}

			if (t.atcMinutes != null) {
				parts.push(`ATC ${formatMinutes(t.atcMinutes)}`);
			}

			if (assignmentOverdue) parts.push("Assignment overdue");
			else if (taskOverdue) parts.push("Task overdue");

			if (parts.length) {
				meta3.textContent = parts.join(" • ");
				content.appendChild(meta3);
			}

			const actions = document.createElement("div");
			actions.className = "ui-item-actions";

			const scheduleBtn = document.createElement("button");
			scheduleBtn.className = "icon-btn";
			scheduleBtn.textContent = "🗓";
			scheduleBtn.title = "Schedule task";
			scheduleBtn.addEventListener("click", () => {
				openScheduleTaskModal(t);
			});

			const assignmentBtn = document.createElement("button");
			assignmentBtn.className = "icon-btn";
			assignmentBtn.textContent = "🔗";
			assignmentBtn.title = "Open assignment";
			assignmentBtn.addEventListener("click", () => {
				window.location.href = `/assignments/${t.assignmentId}`;
			});

			actions.appendChild(scheduleBtn);
			actions.appendChild(assignmentBtn);

			inner.appendChild(row);
			inner.appendChild(content);
			inner.appendChild(actions);
			li.appendChild(inner);

			hasRenderableTasks = true;
			unscheduledTasksListEl.appendChild(li);
		}

		if (!hasRenderableTasks) {
			renderEmptyListState(unscheduledTasksListEl, "No suitable tasks. An active task needs an ETC to be schedulable.");
			autoScheduleBtnEl.disabled = true;
		}
		else {
			autoScheduleBtnEl.disabled = false;
		}
	}

	function openScheduleTaskModal(task) {
		const form = document.getElementById("schedule-task-form");
		const modal = document.getElementById("schedule-task-modal");
		if (!form || !modal) return;

		const errorEl = document.getElementById("st-error");
		setAlert(errorEl, "");

		const remainingMinutes = getTaskRemainingMinutes(task.id);
		if (remainingMinutes <= 0) {
			showToast("This task has no unscheduled time remaining.", { type: "error" });
			return;
		}

		form.dataset.taskId = task.id;
		form.dataset.remainingMinutes = remainingMinutes;

		form.querySelector("#st-task-name").value = task.name ?? "";

		const dateInput = form.querySelector("#st-date");
		const today = new Date();
		const todayStr = today.toISOString().split("T")[0];
		dateInput.value = todayStr;

		const durationInput = form.querySelector("#st-duration");
		durationInput.value = remainingMinutes;
		durationInput.max = String(remainingMinutes);

		populateScheduleStudySessionsSelect(dateInput.value);
		updateScheduleDurationState();

		modal.classList.add("is-open");
		document.body.classList.add("modal-open");
	}

	async function unscheduleTask(scheduledTaskId) {
		try {
			await deleteJson(`/api/scheduled-tasks/${scheduledTaskId}`);

			document.dispatchEvent(new CustomEvent("scheduledTask:deleted"));
			showToast("Task unscheduled successfully.");
		} catch (err) {
			showToast(err.message, { type: "error" });
		}
	}

	async function moveScheduledTask(scheduledTask, sessionScheduledTasks, direction) {
		const currentIndex = scheduledTask.position;

		let targetIndex = currentIndex;

		if (direction === "up") {
			targetIndex = currentIndex - 1;
		} else if (direction === "down") {
			targetIndex = currentIndex + 1;
		}

		if (targetIndex < 0 || targetIndex >= sessionScheduledTasks.length) {
			return;
		}

		try {
			const res = await patchJson(`/api/scheduled-tasks/${scheduledTask.id}`, {
				position: targetIndex
			});

			await refreshSchedule();

			showToast("Scheduled order updated.", { type: "success" });

			document.dispatchEvent(new CustomEvent("scheduledTask:updated"));
		} catch (err) {
			showToast(err.message, { type: "error" });
		}
	}

	function renderTutorialBanner() {
		if (appState.tutorialCompleted) {
			setTutorialBanner(infoBannerEl, "", "");
			return;
		}

		const activeTasksWithEtc = appState.tasks.filter(task => task.etcMinutes !== null && ["todo", "doing"].includes(task.status));
		console.log(activeTasksWithEtc);

		if (activeTasksWithEtc.length && appState.scheduledTasks.length === 0) {
			setTutorialBanner(
				infoBannerEl,
				"Step 4 of 5: Schedule your tasks",
				"Drag and drop a task into a study session to schedule it, or use the auto-schedule feature."
			);
		}
		else if (appState.scheduledTasks.length > 0) {
			setTutorialBanner(
				infoBannerEl,
				"Step 5 of 5: Move tasks through the stages",
				appState.assignments.length == 1 ? "A task has been scheduled! Now go back into the assignment." : "A task has been scheduled! Now go back into an assignment."
			);
		}
		else {
			setTutorialBanner(infoBannerEl, "", "");
		}
	}
}

function isDateWithinActiveSemester(dateStr) {
	if (!dateStr) return false;
	if (appState.activeSemesterId == null) return false;

	const semester = appState.semesterById.get(appState.activeSemesterId);
	if (!semester) return false;

	const selected = new Date(dateStr);
	const start = new Date(semester.startDate);
	const end = new Date(semester.endDate);

	selected.setHours(0, 0, 0, 0);
	start.setHours(0, 0, 0, 0);
	end.setHours(0, 0, 0, 0);

	return selected >= start && selected <= end;
}

function formatStudySessionOption(ss) {
	const start = formatTime(ss.startTime);
	const end = getEndTime(ss.startTime, ss.durationMinutes);
	return `${start}–${end}`;
}

function getAppDayOfWeek(dateStr) {
	const [y, m, d] = dateStr.split("-").map(Number);
	const jsDay = new Date(y, m - 1, d).getDay();
	return (jsDay + 6) % 7;
}

function getScheduledMinutesForSessionOnDate(studySessionId, dateStr) {
	let total = 0;

	for (const st of appState.scheduledTaskById.values()) {
		if (st.studySessionId === studySessionId && st.sessionDate === dateStr) {
			total += st.durationMinutes;
		}
	}

	return total;
}

function getRemainingMinutesForSessionOnDate(studySessionId, dateStr) {
	const ss = appState.studySessionById.get(studySessionId);
	if (!ss) return 0;

	let scheduled = 0;

	for (const st of appState.scheduledTaskById.values()) {
		if (st.studySessionId === studySessionId && st.sessionDate === dateStr) {
			scheduled += st.durationMinutes;
		}
	}

	return ss.durationMinutes - scheduled;
}

function getTaskRemainingMinutes(taskId) {
	const task = appState.taskById.get(taskId);
	if (!task || task.etcMinutes == null) return 0;

	let totalScheduledMinutes = 0;

	for (const st of appState.scheduledTaskById.values()) {
		if (st.taskId === taskId) {
			totalScheduledMinutes += st.durationMinutes;
		}
	}

	return Math.max(0, task.etcMinutes - totalScheduledMinutes);
}

function suggestAutoSchedule() {
	const suggestions = [];
	const semester = appState.semesterById.get(appState.activeSemesterId);
	
	if (!semester || !appState.studySessions.length) {
		return suggestions;
	}

	const semesterStart = new Date(semester.startDate);
	const semesterEnd = new Date(semester.endDate);
	const now = new Date();

	const unscheduledTasks = appState.tasks.filter(task => {
		if (task.status === "done" || task.etcMinutes === null) return false;
		const remainingMinutes = getTaskRemainingMinutes(task.id);
		return remainingMinutes > 0;
	});

	const sessionUsageFromSuggestions = new Map();

	const getAvailableMinutesForSession = (sessionId, dateStr) => {
		const ss = appState.studySessionById.get(sessionId);
		if (!ss) return 0;

		let scheduledMinutes = 0;
		for (const st of appState.scheduledTaskById.values()) {
			if (st.studySessionId === sessionId && st.sessionDate === dateStr) {
				scheduledMinutes += st.durationMinutes;
			}
		}

		const suggestionKey = `${sessionId}-${dateStr}`;
		const suggestionMinutes = sessionUsageFromSuggestions.get(suggestionKey) || 0;

		return ss.durationMinutes - scheduledMinutes - suggestionMinutes;
	};

	const isSessionSchedulable = (session, dateStr) => {
		const [year, month, day] = dateStr.split("-").map(Number);
		const sessionDate = new Date(year, month - 1, day);
		const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		if (sessionDate < todayDate) {
			return false;
		}

		if (sessionDate.getTime() === todayDate.getTime()) {
			const [sessionHours, sessionMinutes] = session.startTime.split(":").map(Number);
			const sessionStartMinutes = sessionHours * 60 + sessionMinutes;
			const nowMinutes = now.getHours() * 60 + now.getMinutes();

			if (nowMinutes >= sessionStartMinutes) {
				return false;
			}
		}

		return true;
	};

	for (const task of unscheduledTasks) {
		let remainingETC = getTaskRemainingMinutes(task.id);
		
		for (let d = new Date(semesterStart); d <= semesterEnd && remainingETC > 0; d.setDate(d.getDate() + 1)) {
			const currentDate = new Date(d);
			const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
			
			const jsWeekday = currentDate.getDay();
			const appWeekday = (jsWeekday + 6) % 7;
			
			const sessionsForDay = appState.studySessions
				.filter(ss => ss.dayOfWeek === appWeekday)
				.filter(ss => isSessionSchedulable(ss, dateStr))
				.sort((a, b) => a.startTime.localeCompare(b.startTime));
			
			for (const session of sessionsForDay) {
				if (remainingETC <= 0) break;
				
				const availableMinutes = getAvailableMinutesForSession(session.id, dateStr);
				
				if (availableMinutes > 0) {
					const durationToSchedule = Math.min(remainingETC, availableMinutes);
					
					const sessionEndTime = getEndTime(session.startTime, session.durationMinutes);
					const timeRange = `${formatTime(session.startTime)} – ${formatTime(sessionEndTime)}`;
					
					suggestions.push({
						taskId: task.id,
						taskName: task.name,
						assignmentName: appState.assignmentById.get(task.assignmentId).name,
						studySessionId: session.id,
						sessionDate: dateStr,
						durationMinutes: durationToSchedule,
						timeRange: timeRange
					});
					
					const suggestionKey = `${session.id}-${dateStr}`;
					sessionUsageFromSuggestions.set(suggestionKey, (sessionUsageFromSuggestions.get(suggestionKey) || 0) + durationToSchedule);
					
					remainingETC -= durationToSchedule;
				}
			}
		}
	}

	return suggestions;
}

function initAutoScheduleForm() {
	const form = document.getElementById("auto-schedule-form");
	if (!form) return;

	const modal = document.getElementById("auto-schedule-modal");
	const checklistEl = form.querySelector(".checklist");
	const submitBtn = document.querySelector(
		'button[form="auto-schedule-form"]'
	);
	const errorEl = document.getElementById("as-error");

	if (!checklistEl || !submitBtn) return;

	let suggestions = [];

	modal.addEventListener("modal:open", () => {
		form.loadSuggestions();
	});

	function renderChecklist() {
		checklistEl.innerHTML = "";

		if (!suggestions.length) {
			checklistEl.innerHTML = `<div class="field-hint">No suggestions available.</div>`;
			submitBtn.disabled = true;
			return;
		}

		suggestions.forEach((s, index) => {
			const label = document.createElement("label");
			label.className = "checklist-item";

			const dayDate = new Date(s.sessionDate);

			const sessionDate = `${DAY_NAMES[appState.studySessionById.get(s.studySessionId).dayOfWeek]} ${dayDate.toLocaleDateString("en-GB", {
				day: "numeric",
				month: "short"
			})}`;

			label.innerHTML = `
				<input type="checkbox" name="selectedAllocations" value="${index}" checked />
				<span>
					${s.taskName}, ${s.assignmentName} → ${sessionDate}, ${s.timeRange}
					(${s.durationMinutes}m)
				</span>
			`;

			checklistEl.appendChild(label);
		});

		updateSubmitState();
	}

	function updateSubmitState() {
		const checked = form.querySelectorAll(
			'input[name="selectedAllocations"]:checked'
		);
		submitBtn.disabled = checked.length === 0;
	}

	form.addEventListener("change", (e) => {
		if (e.target.name === "selectedAllocations") {
			updateSubmitState();
		}
	});

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		setAlert(errorEl, "");

		const selectedIndexes = [...form.querySelectorAll(
			'input[name="selectedAllocations"]:checked'
		)].map(cb => Number(cb.value));

		const allocations = selectedIndexes.map((i) => {
			const { taskId, studySessionId, sessionDate, durationMinutes } = suggestions[i];

			return {
				taskId,
				studySessionId,
				sessionDate,
				durationMinutes
			};
		});

		try {
			const res = await postJson("/api/scheduled-tasks/auto", {
				allocations
			});

			showToast(res.message);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			document.dispatchEvent(new CustomEvent("scheduledTask:updated"));
		} catch (err) {
			setAlert(errorEl, err.message);
		}
	});

	form.loadSuggestions = () => {
		suggestions = suggestAutoSchedule();
		renderChecklist();
	};
}

function populateScheduleStudySessionsSelect(dateStr) {
	const form = document.getElementById("schedule-task-form");
	if (!form) return;

	const sessionSelect = form.querySelector("#st-session");
	if (!sessionSelect) return;

	const placeholder = sessionSelect.querySelector('option[value=""]');
	sessionSelect.innerHTML = "";

	if (placeholder) {
		placeholder.textContent = "Select a study session…";
		sessionSelect.appendChild(placeholder);
	}
	else {
		const opt = document.createElement("option");
		opt.value = "";
		opt.disabled = true;
		opt.selected = true;
		opt.textContent = "Select a study session…";
		sessionSelect.appendChild(opt);
	}

	if (!isDateWithinActiveSemester(dateStr)) {
		sessionSelect.value = "";
		return;
	}

	const dayOfWeek = getAppDayOfWeek(dateStr);

	const sessions = appState.studySessions
		.filter((ss) => ss.dayOfWeek === dayOfWeek)
		.sort((a, b) => a.startTime.localeCompare(b.startTime));

	let hasAvailableSession = false;

	for (const ss of sessions) {
		const option = document.createElement("option");
		option.value = String(ss.id);

		const scheduledMinutes = getScheduledMinutesForSessionOnDate(ss.id, dateStr);
		const remainingMinutes = ss.durationMinutes - scheduledMinutes;
		const isFull = remainingMinutes <= 0;

		option.textContent = isFull
			? `${formatStudySessionOption(ss)} (Full)`
			: `${formatStudySessionOption(ss)} (${formatMinutes(remainingMinutes)} free)`;
		option.disabled = isFull;

		if (!isFull) {
			hasAvailableSession = true;
		}

		sessionSelect.appendChild(option);
	}

	if (!sessions.length) {
		sessionSelect.firstElementChild.textContent = "No study sessions available";
	}
	else if (!hasAvailableSession) {
		sessionSelect.firstElementChild.textContent = "No available study sessions";
	}

	sessionSelect.value = "";
}

function updateScheduleDurationState() {
	const form = document.getElementById("schedule-task-form");
	if (!form) return;

	const durationInput = form.querySelector("#st-duration");
	const sessionSelect = form.querySelector("#st-session");
	const dateInput = form.querySelector("#st-date");
	const infoEl = document.getElementById("st-remaining-info");

	if (!durationInput || !infoEl || !sessionSelect || !dateInput) return;

	const taskRemaining = Number(form.dataset.remainingMinutes || 0);

	let sessionRemaining = Infinity;

	const sessionId = Number(sessionSelect.value);
	const dateStr = dateInput.value;

	if (sessionId && dateStr) {
		sessionRemaining = getRemainingMinutesForSessionOnDate(sessionId, dateStr);
	}

	const maxDuration = Math.min(taskRemaining, sessionRemaining);

	durationInput.max = String(maxDuration);

	let duration = Number(durationInput.value) || 0;

	if (duration > maxDuration) {
		duration = maxDuration;
		durationInput.value = String(maxDuration);
	}

	const remainingAfter = taskRemaining - duration;

	infoEl.textContent = `Remaining after scheduling: ${remainingAfter} minutes`;
}

function initScheduleTaskForm() {
	const form = document.getElementById("schedule-task-form");
	if (!form || !appState.activeSemesterId) return;

	const dateInput = form.querySelector("#st-date");
	const durationInput = form.querySelector("#st-duration");
	const sessionSelect = form.querySelector("#st-session");

	const semester = appState.semesterById.get(appState.activeSemesterId);

	dateInput.min = semester.startDate;
	dateInput.max = semester.endDate;

	dateInput.onchange = () => {
		populateScheduleStudySessionsSelect(dateInput.value);
	};

	durationInput.oninput = () => {
		updateScheduleDurationState();
	};

	sessionSelect.onchange = () => {
		updateScheduleDurationState();
	};

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const errorEl = document.getElementById("st-error");
		setAlert(errorEl, "");

		const formData = new FormData(form);
		const studySessionId = Number(formData.get("studySessionId"));

		const payload = {
			taskId: Number(form.dataset.taskId),
			sessionDate: formData.get("date"),
			durationMinutes: Number(formData.get("durationMinutes"))
		};

		try {
			const res = await postJson(
				`/api/study-sessions/${studySessionId}/scheduled-tasks`,
				payload
			);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();
			delete form.dataset.taskId;
			delete form.dataset.remainingMinutes;

			document.dispatchEvent(new CustomEvent("scheduledTask:created"));

			showToast(res.message);
		} catch (err) {
			setAlert(errorEl, err.message);

			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

function openScheduleDurationModal(task, studySessionId, dateStr) {
	const modal = document.getElementById("schedule-duration-modal");
	const form = document.getElementById("schedule-duration-form");

	const idEl = document.getElementById("sd-id");
	const durationEl = document.getElementById("sd-duration");
	const infoEl = document.getElementById("sd-remaining-info");

	if (!modal || !form || !idEl || !durationEl || !infoEl) {
		return Promise.resolve(null);
	}

	const taskRemainingMinutes = getTaskRemainingMinutes(task.id);
	if (taskRemainingMinutes <= 0) {
		showToast("This task has no unscheduled time remaining.", { type: "error" });
		return Promise.resolve(null);
	}

	const sessionRemainingMinutes = getRemainingMinutesForSessionOnDate(studySessionId, dateStr);
	if (sessionRemainingMinutes <= 0) {
		showToast("This study session has no time remaining.", { type: "error" });
		return Promise.resolve(null);
	}

	const maxDuration = Math.min(taskRemainingMinutes, sessionRemainingMinutes);

	idEl.value = task.id;
	form.dataset.taskRemainingMinutes = taskRemainingMinutes;
	form.dataset.sessionRemainingMinutes = sessionRemainingMinutes;

	durationEl.value = maxDuration;
	durationEl.max = String(maxDuration);

	updateScheduleDurationModalState();

	modal.classList.add("is-open");
	document.body.classList.add("modal-open");

	durationEl.focus();

	return new Promise((resolve) => {
		const close = (result) => {
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.removeEventListener("submit", onSubmit);
			modal.removeEventListener("click", onCancel);
			durationEl.removeEventListener("input", onInput);

			resolve(result);
		};

		const onSubmit = (e) => {
			e.preventDefault();

			const val = durationEl.value.trim();
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

		const onInput = () => {
			updateScheduleDurationModalState();
		};

		form.addEventListener("submit", onSubmit);
		modal.addEventListener("click", onCancel);
		durationEl.addEventListener("input", onInput);
	});
}

function updateScheduleDurationModalState() {
	const form = document.getElementById("schedule-duration-form");
	if (!form) return;

	const durationInput = form.querySelector("#sd-duration");
	const infoEl = document.getElementById("sd-remaining-info");

	if (!durationInput || !infoEl) return;

	const taskRemaining = Number(form.dataset.taskRemainingMinutes || 0);
	const sessionRemaining = Number(form.dataset.sessionRemainingMinutes || 0);

	const maxDuration = Math.min(taskRemaining, sessionRemaining);

	durationInput.max = String(maxDuration);

	let duration = Number(durationInput.value) || 0;

	if (duration > maxDuration) {
		duration = maxDuration;
		durationInput.value = String(maxDuration);
	}

	const remainingAfter = taskRemaining - duration;

	infoEl.textContent = `Remaining after scheduling: ${remainingAfter} minutes`;
}

function initScheduleTaskDragAndDrop() {
	if (getRouteName() !== "schedule") return;

	const pageEl = document.querySelector('.page[data-page="schedule"]');
	if (!pageEl) return;

	let drag = null;

	let pressTimer = null;
	let press = null;
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
			.querySelectorAll('.ui-list.is-drop-target')
			.forEach(el => el.classList.remove("is-drop-target"));
	};

	const isValidSessionDropTarget = (listEl) => {
		if (!listEl) return false;

		const studySessionId = Number(listEl.dataset.studySessionId);
		const freeMinutes = Number(listEl.dataset.freeMinutes);

		return Number.isFinite(studySessionId) && freeMinutes > 0;
	};

	const getSessionListFromPoint = (x, y) => {
		const el = document.elementFromPoint(x, y);
		const listEl = el?.closest?.('.ui-list[data-study-session-id]');
		return isValidSessionDropTarget(listEl) ? listEl : null;
	};

	const moveGhost = (e) => {
		if (!drag) return;

		drag.ghost.style.left = `${e.clientX - drag.offsetX}px`;
		drag.ghost.style.top = `${e.clientY - drag.offsetY}px`;
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

		pageEl.style.touchAction = drag.prevTouchAction ?? "";

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
		const rect = card.getBoundingClientRect();

		const ghost = card.cloneNode(true);
		ghost.classList.add("ui-drag-ghost");
		ghost.style.width = `${rect.width}px`;
		ghost.style.height = `${rect.height}px`;
		ghost.style.top = `${rect.top}px`;
		ghost.style.left = `${rect.left}px`;
		document.body.appendChild(ghost);

		card.classList.add("is-dragging");

		const prevTouchAction = pageEl.style.touchAction;
		pageEl.style.touchAction = "none";

		drag = {
			taskId: Number(card.dataset.taskId),
			card,
			ghost,
			offsetX: e.clientX - rect.left,
			offsetY: e.clientY - rect.top,
			prevTouchAction
		};

		card.setPointerCapture(e.pointerId);

		e.preventDefault();

		moveGhost(e);

		const overList = getSessionListFromPoint(e.clientX, e.clientY);
		clearDropHighlights();
		if (overList) overList.classList.add("is-drop-target");

		lastPointerY = e.clientY;
		startAutoScroll();

		cleanupPress();
	};

	pageEl.addEventListener(
		"touchmove",
		(e) => {
			if (drag) e.preventDefault();
		},
		{ passive: false }
	);

	pageEl.addEventListener("pointerdown", (e) => {
		const card = e.target.closest('.ui-list[data-list="unscheduledTasks"] .ui-item[data-task-id]');
		if (!card) return;

		if (e.target.closest("button, a, input, textarea, select")) return;

		cleanupAll();

		if (e.pointerType === "mouse") {
			press = {
				card,
				pointerId: e.pointerId,
				x: e.clientX,
				y: e.clientY
			};
			pressReady = true;
			startDragFromMoveEvent(e);
			return;
		}

		press = {
			card,
			pointerId: e.pointerId,
			x: e.clientX,
			y: e.clientY
		};

		pressReady = false;

		pressTimer = setTimeout(() => {
			pressReady = true;
		}, HOLD_MS);
	});

	pageEl.addEventListener("pointermove", (e) => {
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

		const overList = getSessionListFromPoint(e.clientX, e.clientY);
		clearDropHighlights();
		if (overList) overList.classList.add("is-drop-target");
	});

	pageEl.addEventListener("pointerup", async (e) => {
		if (!drag) {
			cleanupPress();
			return;
		}

		stopAutoScroll();

		const overList = getSessionListFromPoint(e.clientX, e.clientY);

		if (!overList) {
			cleanupDrag();
			return;
		}

		const taskId = drag.taskId;
		const studySessionId = Number(overList.dataset.studySessionId);
		const sessionDate = overList.dataset.sessionDate;
		const freeMinutes = Number(overList.dataset.freeMinutes);

		cleanupDrag();

		if (!studySessionId || !sessionDate || freeMinutes <= 0) {
			return;
		}

		const remainingMinutes = getTaskRemainingMinutes(taskId);
		if (remainingMinutes <= 0) {
			showToast("This task has no unscheduled time remaining.", { type: "error" });
			return;
		}

		const durationMinutes = await openScheduleDurationModal(appState.taskById.get(taskId), studySessionId, sessionDate);
		if (durationMinutes == null) return;

		try {
			await postJson(`/api/study-sessions/${studySessionId}/scheduled-tasks`, {
				taskId,
				sessionDate,
				durationMinutes
			});

			document.dispatchEvent(new CustomEvent("scheduledTask:created"));
			showToast("Task scheduled successfully.");
		} catch (err) {
			showToast(err.message, { type: "error" });
		}
	});

	pageEl.addEventListener("pointercancel", cleanupAll);
}

// Settings
function initSettings() {
	if (getRouteName() !== "settings") return;

	const profileForm = document.getElementById("settings-profile-form");
	const prefsForm = document.getElementById("settings-preferences-form");
	const avatarImg = document.getElementById("ac-avatar-preview");
	const avatarInput = document.getElementById("ac-avatar");
	const deleteAvatarBtn = document.getElementById("ac-avatar-delete");
	const forenameInput = document.getElementById("ac-forename");
	const surnameInput = document.getElementById("ac-surname");
	const themeSelect = document.getElementById("spf-theme");
	const profileSaveBtn = document.querySelector('#settings-profile-form button[type="submit"]');
	const prefsSaveBtn = document.querySelector('#settings-preferences-form button[type="submit"]');

	document.addEventListener("setting:updated", refreshSettings);
	document.addEventListener("avatar:updated", refreshSettings);
	document.addEventListener("avatar:deleted", refreshSettings);

	window.addEventListener("pageshow", refreshSettings);

	function updateButtons() {
		profileSaveBtn.disabled =
			forenameInput.value.trim() === (appState.forename || "") &&
			surnameInput.value.trim() === (appState.surname || "");

		prefsSaveBtn.disabled =
			themeSelect.value === appState.theme;
	}

	async function refreshSettings() {
		await loadSettings();

		avatarImg.src = `/api/settings/avatar?t=${Date.now()}`;
		forenameInput.value = appState.forename;
		surnameInput.value = appState.surname;
		themeSelect.value = appState.theme;

		updateButtons();
	}

	refreshSettings();

	forenameInput.addEventListener("input", updateButtons);
	surnameInput.addEventListener("input", updateButtons);
	themeSelect.addEventListener("change", updateButtons);

	avatarInput.addEventListener("change", async () => {
		const file = avatarInput.files[0];
		if (!file) return;

		try {
			const formData = new FormData();
			formData.append("avatar", file);

			const res = await fetch("/api/settings/avatar", {
				method: "PATCH",
				body: formData
			});

			const data = await res.json();

			if (!res.ok) throw new Error(data.message || "Upload failed.");

			showToast(data.message);
			document.dispatchEvent(new Event("avatar:updated"));
		} catch (err) {
			showToast(err.message, { type: "error" });
		} finally {
			avatarInput.value = "";
		}
	});

	deleteAvatarBtn.addEventListener("click", async () => {
		try {
			await deleteJson("/api/settings/avatar");

			showToast("Avatar deleted successfully.");
			document.dispatchEvent(new Event("avatar:deleted"));
		} catch (err) {
			showToast(err.message, { type: "error" });
		}
	});

	profileForm.addEventListener("submit", async (e) => {
		e.preventDefault();

		try {
			const payload = {
				forename: forenameInput.value.trim(),
				surname: surnameInput.value.trim()
			};

			const res = await patchJson("/api/settings", payload);

			document.dispatchEvent(new Event("setting:updated"));
			showToast(res.message);
		} catch (err) {
			showToast(err.message, { type: "error" });
		}
	});

	prefsForm.addEventListener("submit", async (e) => {
		e.preventDefault();

		try {
			const payload = {
				theme: themeSelect.value
			};

			const res = await patchJson("/api/settings", payload);

			document.dispatchEvent(new Event("setting:updated"));
			showToast(res.message);
		} catch (err) {
			showToast(err.message, { type: "error" });
		}
	});
}

function initChangePasswordForm() {
	const form = document.getElementById("change-password-form");
	if (!form) return;

	const errorEl = document.getElementById("cp-error");

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		setAlert(errorEl, "");

		const formData = new FormData(form);

		const payload = {
			currentPassword: formData.get("currentPassword"),
			newPassword: formData.get("newPassword"),
			confirmPassword: formData.get("confirmPassword")
		};

		try {
			const res = await postJson("/api/auth/change-password", payload);

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();

			showToast(res.message);
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

function initDeleteAccountForm() {
	const form = document.getElementById("delete-account-form");
	if (!form) return;

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const errorEl = document.getElementById("da-error");
		setAlert(errorEl, "");

		const formData = new FormData(form);
		const password = formData.get("password");

		try {
			await postJson("/api/auth/delete-account", { password });

			const modal = form.closest(".modal");
			modal.classList.remove("is-open");
			document.body.classList.remove("modal-open");

			form.reset();

			window.location.href = "/";
		} catch (err) {
			setAlert(errorEl, err.message);
			const dialog = form.closest(".modal-dialog");
			dialog.classList.add("is-invalid");
			setTimeout(() => dialog.classList.remove("is-invalid"), 200);
		}
	});
}

// Statistics
function initStatistics() {
	if (getRouteName() !== "statistics") return;

	const overviewList = document.getElementById("statistics-overview-list");
	const analyticsSelect = document.getElementById("statistics-analytics-select");
	const analyticsCanvas = document.getElementById("statistics-chart");
	const insightsList = document.getElementById("statistics-insights-list");

	let chart = null;
	let analytics = [];

	function destroyChart() {
		if (chart) {
			chart.destroy();
			chart = null;
		}
	}

	function renderOverview(overview) {
		overviewList.innerHTML = "";

		if (!overview || overview.length === 0) {
			renderEmptyListState(overviewList, "No overview statistics available.");
			return;
		}

		for (const item of overview) {
			const li = document.createElement("li");
			li.className = "ui-item";

			const inner = document.createElement("div");
			inner.className = "ui-item-inner";

			const label = document.createElement("div");
			label.className = "statistics-stat-label";
			label.textContent = item.label ?? "";

			const value = document.createElement("div");
			value.className = "statistics-stat-value";
			value.textContent = item.value != null ? String(item.value) : "—";

			inner.appendChild(label);
			inner.appendChild(value);
			li.appendChild(inner);

			overviewList.appendChild(li);
		}
	}

	function renderInsights(insights) {
		insightsList.innerHTML = "";

		if (!insights || insights.length === 0) {
			renderEmptyListState(insightsList, "No insights	 available.");
			return;
		}

		for (const insight of insights) {
			const li = document.createElement("li");
			li.className = "ui-item";

			const inner = document.createElement("div");
			inner.className = "ui-item-inner";

			const insightDiv = document.createElement("div");
			insightDiv.className = "statistics-stat-value";
			insightDiv.textContent = insight;

			inner.appendChild(insightDiv);
			li.appendChild(inner);

			insightsList.appendChild(li);
		}
	}

	function buildChartConfig(graph) {
		return {
			type: graph.type,
			data: {
				labels: graph.labels,
				datasets: graph.datasets
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: true
					},
					title: {
						display: false
					}
				}
			}
		};
	}

	function renderAnalyticsOptions(graphs) {
		if (!graphs || graphs.length === 0) {
			analyticsSelect.innerHTML = `<option value="">No charts available</option>`;
			analyticsSelect.disabled = true;
			analyticsCanvas.style.display = "none";
			destroyChart();
			return;
		}

		analyticsSelect.disabled = false;
		analyticsCanvas.style.display = "";

		analyticsSelect.innerHTML = graphs
			.map(
				(graph, index) => `
					<option value="${index}">${escapeHtml(graph.title)}</option>
				`
			)
			.join("");
	}

	function renderSelectedChart(index) {
		const graph = analytics[index];
		if (!graph) {
			destroyChart();
			return;
		}

		destroyChart();
		chart = new Chart(analyticsCanvas, buildChartConfig(graph));
	}

	async function loadStatistics() {
		renderLoadingListState(overviewList);
		renderLoadingListState(insightsList);

		try {
			const res = await getJson(`/api/statistics/${appState.activeSemesterId}`);
			const { overview, insights } = res.statistics;
			analytics = res.statistics.analytics;

			renderOverview(overview);
			renderInsights(insights);
			renderAnalyticsOptions(analytics);

			if (analytics.length > 0) {
				analyticsSelect.value = "0";
				renderSelectedChart(0);
			}
		} catch (err) {
			showToast("Failed to load statistics.", { type: "error" });

			renderEmptyListState(overviewList, "Failed to load overview statistics.");
			renderEmptyListState(insightsList, "Failed to load insights.");

			analyticsSelect.innerHTML = `<option value="">No charts available</option>`;
			analyticsSelect.disabled = true;
			analyticsCanvas.style.display = "none";
			destroyChart();
		}
	}

	analyticsSelect.addEventListener("change", () => {
		renderSelectedChart(Number(analyticsSelect.value));
	});

	loadStatistics();
}

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

// Global Inits
function initAuthForms() {
	const loginForm = document.getElementById("login-form");
	if (loginForm) {
		const errorEl = document.getElementById("auth-error");
		const passwordInput = loginForm.querySelector('input[name="password"]')

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

				passwordInput.value = "";
			}
		});
	}

	const registerStartForm = document.getElementById("register-start-form");
	const registerVerifyForm = document.getElementById("register-verify-form");

	if (registerStartForm && registerVerifyForm) {
		const startView = document.getElementById("register-start-view");
		const verifyView = document.getElementById("register-verify-view");

		const startErrorEl = document.getElementById("auth-start-error");
		const verifyErrorEl = document.getElementById("auth-verify-error");

		const verifyEmailInput = document.getElementById("register-verify-email");
		const verifyEmailText = document.getElementById("register-verify-email-text");
		const expiryMinutesEl = document.getElementById("register-expiry-minutes");
		const resendLink = document.getElementById("register-resend-link");

		function showVerifyStep(email, expiresInMinutes) {
			setAlert(startErrorEl, "");
			setAlert(verifyErrorEl, "");

			verifyEmailInput.value = email;
			verifyEmailText.textContent = email;

			if (expiresInMinutes) {
				expiryMinutesEl.textContent = expiresInMinutes;
			}

			startView.style.display = "none";
			verifyView.style.display = "";
		}

		registerStartForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			setAlert(startErrorEl, "");

			const formData = new FormData(registerStartForm);
			const forename = formData.get("forename");
			const surname = formData.get("surname");
			const email = formData.get("email");
			const password = formData.get("password");
			const confirmPassword = formData.get("confirmPassword");

			try {
				const result = await postJson("/api/auth/register/start", {
					forename,
					surname,
					email,
					password,
					confirmPassword
				});

				showVerifyStep(result.email, result.expiresInMinutes);
			} catch (err) {
				setAlert(startErrorEl, err.message);
			}
		});

		registerVerifyForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			setAlert(verifyErrorEl, "");

			const formData = new FormData(registerVerifyForm);
			const email = formData.get("email");
			const code = String(formData.get("code") || "").replace(/\s+/g, "");

			try {
				await postJson("/api/auth/register/complete", {
					email,
					code
				});

				window.location.href = "/dashboard";
			} catch (err) {
				setAlert(verifyErrorEl, err.message);
			}
		});

		const codeInput = document.getElementById('verification-code');
		codeInput.addEventListener('input', () => {
			codeInput.value = codeInput.value.replace(/\D/g, '');
		});

		resendLink.addEventListener("click", async (e) => {
			e.preventDefault();

			setAlert(verifyErrorEl, "");

			const email = verifyEmailInput.value;

			try {
				await postJson("/api/auth/register/resend", { email });
				showToast("A new verification code has been sent.");
			} catch (err) {
				setAlert(verifyErrorEl, err.message);
			}
		});
	}

	const forgotPasswordForm = document.getElementById("forgot-password-form");
	if (forgotPasswordForm) {
		const alertEl = document.getElementById("auth-alert");

		forgotPasswordForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			setAlert(alertEl, "");

			const formData = new FormData(forgotPasswordForm);
			const email = formData.get("email");

			try {
				const res = await postJson("/api/auth/password-reset/start", { email });
				setAlert(alertEl, res.message, { type: "info" });

				forgotPasswordForm.reset();
			} catch (err) {
				setAlert(alertEl, err.message);
			}
		});
	}

	const resetPasswordForm = document.getElementById("reset-password-form");
	if (resetPasswordForm) {
		const alertEl = document.getElementById("auth-alert");

		resetPasswordForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			setAlert(alertEl, "");

			const params = new URLSearchParams(window.location.search);
			const resetToken = params.get("token");

			const formData = new FormData(resetPasswordForm);
			const newPassword = formData.get("newPassword");
			const confirmPassword = formData.get("confirmPassword");

			try {
				const res = await postJson("/api/auth/password-reset/complete", { resetToken, newPassword, confirmPassword });
				setAlert(alertEl, res.message, { type: "info" });

				resetPasswordForm.reset();

				resetPasswordForm.querySelectorAll("input, button").forEach(el => {
					el.disabled = true;
				});
			} catch (err) {
				setAlert(alertEl, err.message);
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

function initLinkButtons() {
	document.querySelectorAll('[data-link]').forEach(btn => {
		btn.addEventListener('click', () => {
			window.location.href = btn.dataset.link;
		});
	});
}

function initLandingSlide() {
	if (getRouteName() !== "index") return;

	const slides = Array.from(document.querySelectorAll(".hero-slide"));
	const dots = Array.from(document.querySelectorAll(".hero-dot"));

	if (!slides.length || slides.length !== dots.length) return;

	let currentIndex = 0;
	let intervalId;

	function showSlide(index) {
		slides.forEach((slide, i) => {
			slide.classList.toggle("active", i === index);
		});

		dots.forEach((dot, i) => {
			dot.classList.toggle("active", i === index);
		});

		currentIndex = index;
	}

	function nextSlide() {
		const nextIndex = (currentIndex + 1) % slides.length;
		showSlide(nextIndex);
	}

	function startAutoSlide() {
		intervalId = setInterval(nextSlide, 6000);
	}

	function resetAutoSlide() {
		clearInterval(intervalId);
		startAutoSlide();
	}

	dots.forEach((dot, index) => {
		dot.addEventListener("click", () => {
			showSlide(index);
			resetAutoSlide();
		});
	});

	showSlide(0);
	startAutoSlide();
}

document.addEventListener("DOMContentLoaded", async () => {
	initAuthForms();
	initMobileNav();
	initLandingSlide();
	
	const publicRoutes = ["register", "login", "index"];
	if (publicRoutes.includes(getRouteName())) return;

	await loadSettings();

	initLogoutLink();
	initModals();
	initLinkButtons();

	await initDashboardMain();
	await initDashboardOnboarding();
	initSemesterModal();
	initNewSemesterForm();
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

	await initStudySessions();
	initNewStudySessionForm();
	initEditStudySessionForm();
	initDeleteStudySessionForm();

	await initSchedule();
	initScheduleTaskForm();
	initScheduleTaskDragAndDrop();
	initAutoScheduleForm();

	await initSettings();
	initChangePasswordForm();
	initDeleteAccountForm();

	initStatistics();
});