// Bring in the tools for salon settings so this file can work with the rest of the application.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import { ApiError } from "../../shared/http.js";

// Keep the shared values for salon settings together so later steps use the same definitions.
export const MAX_PORTFOLIO_IMAGE_BYTES = 5 * 1024 * 1024;
export const portfolioImageName = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.(jpg|png|webp)$/;
const mimeTypes = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

// Recognize the image from its contents so an uploaded file must match a supported picture format.
export function imageExtension(body: unknown, contentType: string) {
  if (!Buffer.isBuffer(body) || !body.length) throw new ApiError(400, "IMAGE_REQUIRED", "Choose an image to upload.");
  if (body.length > MAX_PORTFOLIO_IMAGE_BYTES) throw new ApiError(413, "IMAGE_TOO_LARGE", "Choose an image no larger than 5 MB.");
  if (contentType === "image/jpeg" && body.length >= 4 && body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) && body.subarray(-2).equals(Buffer.from([0xff, 0xd9]))) return "jpg";
  if (contentType === "image/png" && body.length >= 33 && body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && body.toString("ascii", 12, 16) === "IHDR") return "png";
  if (contentType === "image/webp" && body.length >= 20 && body.toString("ascii", 0, 4) === "RIFF" && body.toString("ascii", 8, 12) === "WEBP" && body.readUInt32LE(4) === body.length - 8) return "webp";
  throw new ApiError(415, "INVALID_IMAGE", "Choose a JPEG, PNG, or WebP image. Other file types are not supported.");
}

// Manage portfolio picture storage and retrieval so staff profiles can show supported images.
export function createPortfolioImagesService(prisma: PrismaClient, directory?: string) {
  const root = resolve(directory ?? "uploads/staff-portfolio");
  return {
    // Check and store the uploaded picture so the staff profile can refer to a valid image.
    async upload(actorId: string, staffId: string, body: unknown, contentType: string) {
      const actor = await prisma.user.findUnique({ where: { id: actorId } });
      if (!actor?.isActive || actor.role !== "ADMIN") throw new ApiError(403, "FORBIDDEN", "Administrator access is required.");
      if (!await prisma.staff.findUnique({ where: { id: staffId }, select: { id: true } })) throw new ApiError(404, "NOT_FOUND", "Staff member not found.");
      const extension = imageExtension(body, contentType);
      const name = `${randomUUID()}.${extension}`;
      await mkdir(root, { recursive: true });
      await writeFile(resolve(root, name), body as Buffer, { flag: "wx" });
      return { imageUrl: `/api/media/staff-portfolio/${name}` };
    },
    // Read a picture with a validated filename so a staff portfolio can display its stored image.
    async read(name: string) {
      if (!portfolioImageName.test(name)) throw new ApiError(404, "NOT_FOUND", "Image not found.");
      try {
        const body = await readFile(resolve(root, name));
        const extension = name.split(".").at(-1) as keyof typeof mimeTypes;
        return { body, contentType: mimeTypes[extension] };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new ApiError(404, "NOT_FOUND", "Image not found.");
        throw error;
      }
    },
  };
}
