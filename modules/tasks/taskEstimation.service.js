const { getOpenRouterClient } = require("../../utils/openRouterClient.js");
const AppError = require("../../utils/AppError");

async function estimateTaskMinutes(taskName, taskDescription, assignmentName, assignmentDescription) {
	const client = getOpenRouterClient();

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
						"Do not include explanation or extra fields."
				},
				{
					role: "user",
					content:
						`Estimate the effort for this task.\n\n` +
						`Task name: ${taskName || "(none)"}\n` +
						`Task description: ${taskDescription || "(none)"}\n` +
						`Assignment name: ${assignmentName || "(none)"}\n` +
						`Assignment description: ${assignmentDescription || "(none)"}`
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