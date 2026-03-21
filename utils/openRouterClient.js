const OpenAI = require('openai');

let client;

function getOpenRouterClient() {
	if (!client) {
		client = new OpenAI({
			apiKey: process.env.OPENROUTER_API_KEY,
			baseURL: "https://openrouter.ai/api/v1"
		});
	}

	return client;
}

module.exports = { getOpenRouterClient };