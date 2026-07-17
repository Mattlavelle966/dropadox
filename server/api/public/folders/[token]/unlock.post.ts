import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { folderPublicShares } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "public-folder-unlock", 30, 60_000);
    const shareToken = getRouterParam(event, "token");
    const { password } = await readBody(event);

    if (!shareToken || typeof password !== "string") {
        throw createError({ statusCode: 400, statusMessage: "Invalid password" });
    }

    const db = useDrizzle();
    const share = await db.select().from(folderPublicShares)
        .where(eq(folderPublicShares.token, shareToken))
        .get();

    if (!share?.passwordHash) {
        throw createError({ statusCode: 404, statusMessage: "Share not found" });
    }

    const valid = await bcrypt.compare(password, share.passwordHash);
    if (!valid) {
        throw createError({ statusCode: 401, statusMessage: "Incorrect password" });
    }

    setCookie(event, publicFolderShareCookieName(shareToken), share.passwordHash, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.COOKIE_SECURE === "true" || getRequestHeader(event, "x-forwarded-proto") === "https",
        path: `/`,
        maxAge: 60 * 60 * 24 * 30
    });

    return { unlocked: true };
});
