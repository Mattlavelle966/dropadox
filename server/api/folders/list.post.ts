import { getFolderPeopleMetadata, getUsersByIdMetadata } from "~~/server/utils/peopleMetadata";

export default defineEventHandler(async (event) => {
    const userPayload = getAuthenticatedUserPayload(event);

    const db = useDrizzle();
    const accessibleFolders = await getAccessibleFolderRows(db, String(userPayload.id));
    const folderIds = accessibleFolders.map(({ folder }) => folder.id);
    const primaryOwners = await getUsersByIdMetadata(db, accessibleFolders.map(({ folder }) => folder.userId));
    const { folderPeople } = await getFolderPeopleMetadata(db, folderIds);

    return {
        folders: accessibleFolders.map(({ folder, shared, accessRole }) => {
            const primaryOwner = folder.userId ? primaryOwners.get(Number(folder.userId)) ?? null : null;
            const people = folderPeople.get(String(folder.id)) ?? { owners: [], sharedUsers: [] };

            return {
                ...folderResponse(folder, shared, accessRole),
                owners: [
                    ...(primaryOwner ? [{ ...primaryOwner, role: "owner" }] : []),
                    ...people.owners
                ],
                sharedUsers: people.sharedUsers
            };
        })
    };
});
