export function userAvatarUrl(userId: number | string, hasAvatar?: string | null) {
    return hasAvatar ? `/api/users/avatar/${userId}` : null;
}

export function folderIconUrl(folderId: number | string, hasIcon?: string | null) {
    return hasIcon ? `/api/folders/icon/${folderId}` : null;
}

export function publicFolderIconUrl(token: string, hasIcon?: string | null) {
    return hasIcon ? `/api/public/folders/icon/${token}` : null;
}

export function folderResponse(folder: any, shared = false, accessRole = "owner") {
    return {
        id: folder.id,
        userId: folder.userId,
        parentId: folder.parentId ?? null,
        name: folder.name,
        createdAt: folder.createdAt,
        shared,
        accessRole,
        canManage: accessRole === "owner",
        iconUrl: folderIconUrl(folder.id, folder.iconPath)
    };
}
