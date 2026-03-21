const { getOpenRouterClient } = require("../../utils/openRouterClient.js");
const AppError = require("../../utils/AppError");

async function estimateTaskMinutes(
	taskName,
	taskDescription,
	assignmentName,
	assignmentDescription,
	assignmentConfidence,
	assignmentWeight
) {
	const client = getOpenRouterClient();

	const promptLines = [
		"Estimate the effort for this task.",
		"",
		`Task name: ${taskName}`
	];

	if (taskDescription) {
		promptLines.push(`Task description: ${taskDescription}`);
	}

	if (assignmentName) {
		promptLines.push(`Assignment name: ${assignmentName}`);
	}

	if (assignmentDescription) {
		promptLines.push(`Assignment description: ${assignmentDescription}`);
	}

	if (assignmentConfidence != null && assignmentConfidence !== "") {
		promptLines.push(`Student confidence for this assignment (1-5): ${assignmentConfidence}`);
	}

	if (assignmentWeight != null && assignmentWeight !== "") {
		promptLines.push(`Assignment weight percentage (1-100): ${assignmentWeight}`);
	}

	const response = await client.chat.completions.create(
		{
			model: process.env.OPENROUTER_MODEL,
			messages: [
				{
					role: "system",
					content:
						"You estimate how many minutes a student should spend on an academic task. " +
						"Return only valid JSON in this exact format: {\"estimatedMinutes\": number}. " +
						"Estimate realistic focused work time in minutes. " +
						"Use increments of 15 minutes. " +
						"Minimum 15. Maximum 1440. " +
						"Treat assignment confidence and assignment weight only as light supporting context, not dominant factors. " +
						"Do not include explanation or extra fields."
				},
				{
					role: "user",
					content: promptLines.join("\n")
				}
			],
			response_format: { type: "json_object" },
			temperature: 0.1,
			max_tokens: 80
		},
		{
			headers: {
				"HTTP-Referer": process.env.OPENROUTER_SITE_URL,
				"X-Title": process.env.OPENROUTER_APP_NAME
			}
		}
	);

	const content = response.choices?.[0]?.message?.content;
	if (!content) {
		throw new AppError("AI estimation returned no content.", 500);
	}

	let parsed;
	try {
		parsed = JSON.parse(content);
	} catch {
		throw new AppError("AI estimation returned invalid JSON.", 500);
	}

	const estimatedMinutes = Number(parsed.estimatedMinutes);

	if (
		!Number.isInteger(estimatedMinutes) ||
		estimatedMinutes < 15 ||
		estimatedMinutes > 1440 ||
		estimatedMinutes % 15 !== 0
	) {
		throw new AppError("AI estimation returned an invalid estimatedMinutes value.", 500);
	}

	return estimatedMinutes;
}

module.exports = { estimateTaskMinutes };