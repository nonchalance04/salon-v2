// Bring in the tools for the salon assistant so this file can work with the rest of the application.
import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../../shared/http.js";
import { createConfigurationService } from "../configuration/configuration.service.js";
import { chatbotSchema } from "./chatbot.schema.js";
import { createChatbotService } from "./chatbot.service.js";
import { createGeminiChatbotService } from "./chatbot.gemini.js";
import { createChatbotLimiter } from "./chatbot.limit.js";
// Connect validated chat messages to the salon assistant so customers can ask supported questions.
export function createChatbotRouter(prisma, config, dependencies) {
    const router = Router();
    const source = createConfigurationService(prisma, config.SALON_TIMEZONE);
    const service = config.CHATBOT_PROVIDER === "gemini" ? createGeminiChatbotService(source, config, dependencies) : createChatbotService(source);
    router.post("/chatbot", createChatbotLimiter(), validateRequest(z.object({ body: chatbotSchema })), async (_req, res) => {
        res.set("Cache-Control", "no-store");
        res.json(await service.answer(res.locals.validated.body.message, res.locals.validated.body.history));
    });
    return router;
}
//# sourceMappingURL=chatbot.routes.js.map