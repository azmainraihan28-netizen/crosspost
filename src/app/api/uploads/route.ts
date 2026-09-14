import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { route } from "@/lib/api";
import { apiUser, HttpError } from "@/lib/session";
import { randomToken } from "@/lib/crypto";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 8 * 1024 * 1024;

export const POST = route(async (req) => {
  const user = await apiUser();
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file uploaded");
  const ext = TYPES[file.type];
  if (!ext) throw new HttpError(400, "Only JPEG, PNG, WebP and GIF images are supported");
  if (file.size > MAX_BYTES) throw new HttpError(400, "Images must be 8 MB or smaller");

  const name = `${user.id.slice(0, 8)}-${randomToken(9)}.${ext}`;

  // Production: Vercel Blob (public URLs that Instagram/Threads/Facebook can fetch).
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${name}`, file, { access: "public", contentType: file.type });
    return Response.json({ url: blob.url });
  }

  // Local dev: write to /public/uploads. Note: Meta platforms can't fetch localhost URLs.
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: `/uploads/${name}` });
});
