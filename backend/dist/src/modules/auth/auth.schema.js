import { z } from "zod";
export const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const password = z.string().min(12).refine(value => Buffer.byteLength(value, "utf8") <= 72, "Password must fit within 72 UTF-8 bytes.");
export const username = z.string().trim().toLowerCase().min(1).max(254).regex(/^[^@\s]+$/, "Username cannot contain spaces or @.");
export const loginSchema = z.object({ body: z.object({
        username,
        password: z.string().min(1).refine(value => Buffer.byteLength(value, "utf8") <= 72),
    }).strict() });
export const forgotPasswordSchema = z.object({ body: z.object({ username }).strict() });
export const resetPasswordSchema = z.object({ body: z.object({
        challengeId: z.uuid(), code: z.string().regex(/^\d{6}$/), password,
        confirmPassword: z.string(),
    }).strict().refine(value => value.password === value.confirmPassword, {
        message: "Passwords must match.", path: ["confirmPassword"],
    }) });
export const accountFields = z.object({
    username, email, password, firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100), role: z.enum(["ADMIN", "CASHIER"]),
    isActive: z.boolean(),
}).strict();
export const createAccountSchema = z.object({ body: accountFields.extend({ isActive: z.boolean().default(true) }) });
export const updateAccountSchema = z.object({
    params: z.object({ id: z.uuid() }),
    body: accountFields.partial().refine(value => Object.keys(value).length > 0),
});
//# sourceMappingURL=auth.schema.js.map