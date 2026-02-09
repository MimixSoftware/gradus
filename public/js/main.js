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

document.addEventListener("DOMContentLoaded", () => {
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
	const registerForm = document.getElementById("register-form");
	if (registerForm) {
		const errorEl = document.getElementById("auth-error");

		registerForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			setAuthError(errorEl, "");

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
				setAuthError(errorEl, err.message);
			}
		});
	}

	// current-year span
	currentYearElement = document.getElementById("current-year");
	if (currentYearElement) {
		const currentYear = new Date().getFullYear();
		currentYearElement.textContent = currentYear;
	}
});