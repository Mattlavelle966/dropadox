import { and, eq } from "drizzle-orm";
import { folderUserShares, userSettings, users } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "folder-user-share", 60, 60_000);
    const folderId = Number(getRouterParam(event, "folderId"));
    const { userId, userIds, role } = await readBody(event);
    const targetUserIds = Array.isArray(userIds)
        ? userIds.map((id) => String(id))
        : userId
            ? [String(userId)]
            : [];

    if (!Number.isInteger(folderId) || targetUserIds.length === 0 || targetUserIds.length > 25) {
        throw createError({ statusCode: 400, statusMessage: "Invalid share request" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const currentUserId = String(userPayload.id);
    const db = useDrizzle();

    const folderAccess = await getFolderAccess(db, String(folderId), currentUserId);

    if (!folderAccess?.isOwner) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    const shareRole = role === "owner" ? "owner" : "member";
    const canonicalOwnerId = String(folderAccess.folder.userId);
    const sharedUsers = [];

    for (const targetUserId of [...new Set(targetUserIds)]) {
        if (!Number.isInteger(Number(targetUserId))) {
            continue;
        }

        if (targetUserId === canonicalOwnerId) {
            continue;
        }

        const targetUser = await db.select().from(users)
            .where(eq(users.id, Number(targetUserId)))
            .get();

        if (!targetUser) {
            continue;
        }

        const existingShare = await db.select().from(folderUserShares)
            .where(and(
                eq(folderUserShares.folderId, String(folderId)),
                eq(folderUserShares.sharedWithUserId, targetUserId)
            ))
            .get();

        if (!existingShare) {
            await db.insert(folderUserShares).values({
                folderId: String(folderId),
                ownerId: canonicalOwnerId,
                sharedWithUserId: targetUserId,
                role: shareRole
            });
        } else {
            await db.update(folderUserShares)
                .set({ role: shareRole })
                .where(eq(folderUserShares.id, existingShare.id));
        }

        const targetSettings = await db.select().from(userSettings)
            .where(eq(userSettings.userID, targetUserId))
            .get();

        sharedUsers.push({
            id: targetUser.id,
            name: targetUser.name,
            username: targetUser.name,
            email: targetUser.email,
            role: shareRole,
            avatarUrl: userAvatarUrl(targetUser.id, targetSettings?.avatarPath)
        });
    }

    if (sharedUsers.length === 0) {
        throw createError({ statusCode: 404, statusMessage: "No matching users found" });
    }

    return {
        shared: true,
        users: sharedUsers,
        user: sharedUsers[0]
    };
});
