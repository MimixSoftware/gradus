const VALID_LOG_LEVELS = ["DEBUG", "INFO", "WARN", "ERROR"];

function required(name) {
	const value = process.env[name];
	if (!value || value.trim() === "") {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value.trim();
}

function optional(name, fallback) {
	const value = process.env[name];
	return (!value || value.trim() === "") ? fallback : value.trim();
}

function assertInt(name, value) {
	if (!/^\d+$/.test(value)) {
		throw new Error(`${name} must be an integer, got: "${value}"`);
	}
}

function assertPort(name, value) {
	assertInt(name, value);
	const n = Number(value);
	if (n < 1 || n > 65535) {
		throw new Error(`${name} must be between 1 and 65535, got: ${value}`);
	}
}

function assertBool(name, value) {
	const v = value.toLowerCase();
	if (v !== "true" && v !== "false") {
		throw new Error(`${name} must be "true" or "false", got: "${value}"`);
	}
}

function validateEnv() {
	const port = optional("PORT", "3000");
	assertPort("PORT", port);
	process.env.PORT = port;

	const production = optional("PRODUCTION", "false");
	assertBool("PRODUCTION", production);
	process.env.PRODUCTION = production.toLowerCase();

	const level = optional("LOG_LEVEL", "INFO").toUpperCase();
	if (!VALID_LOG_LEVELS.includes(level)) {
		throw new Error(
			`LOG_LEVEL must be one of ${VALID_LOG_LEVELS.join(", ")}, got: "${process.env.LOG_LEVEL}"`
		);
	}
	process.env.LOG_LEVEL = level;

	const maintenance = optional("MAINTENANCE_MODE", "false");
	assertBool("MAINTENANCE_MODE", maintenance);
	process.env.MAINTENANCE_MODE = maintenance.toLowerCase();

	required("DB_HOST");
	required("DB_USER");
	required("DB_PASSWORD");
	required("DB_NAME");

	const dbPort = optional("DB_PORT", "3306");
	assertPort("DB_PORT", dbPort);
	process.env.DB_PORT = dbPort;

	const bcryptSaltRounds = required("BCRYPT_SALT_ROUNDS");
	assertInt("BCRYPT_SALT_ROUNDS", bcryptSaltRounds)
	
	required("SESSION_SECRET");

	required("OPENROUTER_API_KEY");
	required("OPENROUTER_MODEL");
	required("OPENROUTER_SITE_URL");
	required("OPENROUTER_APP_NAME");
}

module.exports = { validateEnv };
