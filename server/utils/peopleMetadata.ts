import { eq, sql } from "drizzle-orm";
import { folderUserShares, userSettings, users } from "~~/server/database/schema";
import { userAvatarUrl } from "~~/server/utils/mediaUrls";

export type PersonMetadata = {
    id: number;
    name: string;
    email: string;
    role?: string;
    avatarUrl: string | null;
}

function person(row: { id: number; name: string; email: string; role?: string | null; avatarPath?: string | null }): PersonMetadata {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role ?? undefined,
        avatarUrl: userAvatarUrl(row.id, row.avatarPath)
    };
}

export async function getUsersByIdMetadata(db: any, userIds: Array<string | number>) {
    const uniqueUserIds = [...new Set(userIds.map((id) => Number(id)).filter(Number.isInteger))];
    const peopleById = new Map<number, PersonMetadata>();

    for (const userId of uniqueUserIds) {
        const row = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            avatarPath: userSettings.avatarPath
        }).from(users)
            .leftJoin(userSettings, sql`${userSettings.userID} = cast(${users.id} as text)`)
            .where(eq(users.id, userId))
            .get();

        if (row) {
            peopleById.set(userId, person(row));
        }
    }

    return peopleById;
}

export async function getFolderPeopleMetadata(db: any, folderIds: Array<string | number>) {
    const uniqueFolderIds = [...new Set(folderIds.map(String))];
    const folderPeople = new Map<string, { owners: PersonMetadata[]; sharedUsers: PersonMetadata[] }>();

    for (const folderId of uniqueFolderIds) {
        const shares = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: folderUserShares.role,
            avatarPath: userSettings.avatarPath
        }).from(folderUserShares)
            .innerJoin(users, sql`${folderUserShares.sharedWithUserId} = cast(${users.id} as text)`)
            .leftJoin(userSettings, sql`${userSettings.userID} = cast(${users.id} as text)`)
            .where(eq(folderUserShares.folderId, folderId))
            .all();

        const sharedUsers = shares.map(person);
        folderPeople.set(folderId, {
            owners: sharedUsers.filter((user) => user.role === "owner"),
            sharedUsers
        });
    }

    return { folderPeople };
}
