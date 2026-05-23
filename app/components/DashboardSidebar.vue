<template>
    <aside class="w-56 shrink-0 bg-zinc-300 dark:bg-neutral-900 dark:text-white flex flex-col p-3 space-y-4">
        <div class="flex flex-col gap-2">
            <Input v-model="search" :placeholder="t('dashboard.searchFiles')"
                class="rounded-none border-zinc-300 bg-white dark:bg-neutral-800 dark:focus-visible:ring-neutral-300 focus-visible:ring-zinc-300" />

            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <Button class="w-full cursor-pointer justify-between rounded-none" variant="default">{{ t('common.words.new') }}
                        <ChevronDown class="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem @click="showUploadFile = true">{{ t('dashboard.uploadFile') }}</DropdownMenuItem>
                    <DropdownMenuItem @click="showCreateFolder = true">{{ t('dashboard.newFolder') }}</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        <nav class="flex flex-col gap-2">
            <Button variant="ghost" class="justify-start rounded-none hover:bg-zinc-400/30 cursor-pointer"
                @click="emit('select-folder', null)"
                :class="{ 'bg-zinc-400/30': props.selectedFolderId === null }">
                <Folder class="w-4 h-4 mr-2" />
                {{ t('dashboard.myFiles') }}
            </Button>
            <NuxtLink to="/settings">
                <Button variant="ghost" class="w-full justify-start rounded-none hover:bg-zinc-400/30 cursor-pointer">
                    <Settings class="w-4 h-4 mr-2" />
                    {{ t('common.nav.settings') }}
                </Button>
            </NuxtLink>
            <Button variant="ghost" class="w-full justify-start rounded-none hover:bg-zinc-400/30 cursor-pointer"
                @click="openStorageDialog">
                <HardDrive class="w-4 h-4 mr-2" />
                {{ t('dashboard.storage') }}
            </Button>
            <NuxtLink v-if="isAdmin" to="/admin">
                <Button variant="ghost" class="w-full justify-start rounded-none hover:bg-zinc-400/30 cursor-pointer">
                    <Shield class="w-4 h-4 mr-2" />
                    {{ t('common.nav.admin') }}
                </Button>
            </NuxtLink>
            <Button v-if="isLoggedIn" variant="ghost"
                class="justify-start rounded-none text-red-600 hover:bg-red-500/10 hover:text-red-600 cursor-pointer"
                @click="logoff">
                <LogOut class="w-4 h-4 mr-2" />
                {{ t('common.nav.logOut') }}
            </Button>
        </nav>

        <NuxtLink v-if="isLoggedIn" to="/settings"
            class="flex min-w-0 items-center gap-3 border border-zinc-400/40 bg-zinc-200/60 p-3 text-left text-xs text-zinc-700 transition hover:bg-zinc-200 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-zinc-300 dark:hover:bg-neutral-800">
            <img v-if="showAvatar" :src="avatarUrl" :alt="session?.username"
                class="h-9 w-9 shrink-0 rounded-none object-cover" @error="showAvatar = false" />
            <span v-else
                class="flex h-9 w-9 shrink-0 items-center justify-center bg-zinc-300 text-xs font-bold text-zinc-700 dark:bg-neutral-700 dark:text-white">
                <User class="h-4 w-4" />
            </span>
            <span class="min-w-0">
                <span class="block truncate font-semibold text-zinc-900 dark:text-white">{{ session?.username }}</span>
                <span class="block truncate opacity-70">{{ session?.emailAddress }}</span>
            </span>
        </NuxtLink>

        <button type="button"
            class="mt-auto flex flex-col gap-2 border border-zinc-400/40 bg-zinc-200/60 p-3 text-left text-xs text-zinc-700 transition hover:bg-zinc-200 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-zinc-300 dark:hover:bg-neutral-800"
            @click="openStorageDialog">
            <div class="flex w-full items-center justify-between gap-2">
                <span class="font-medium text-zinc-900 dark:text-white">{{ t('dashboard.storage') }}</span>
                <span>{{ storagePercentLabel }}</span>
            </div>
            <div class="h-1.5 w-full overflow-hidden bg-zinc-400/40 dark:bg-neutral-700">
                <div class="h-full bg-blue-500 transition-[width]" :style="{ width: `${storagePercent}%` }"></div>
            </div>
            <span>{{ t('dashboard.storageRemaining', { remaining: storageRemainingLabel }) }}</span>
        </button>

        <div class="text-sm text-black/80 dark:text-white/50">
            © {{ new Date().getFullYear() }} {{ t('common.siteName') }}
        </div>
    </aside>

    <div class="min-w-0 flex-1 flex flex-col w-full">
        <main class="min-w-0 flex flex-col w-full gap-4 p-4 overflow-y-auto">
            <slot :open-folder-settings="openFolderSettings" :delete-folder="deleteFolder" :clone-folder="cloneFolder"
                :leave-folder="leaveFolder" />
        </main>

        <Dialog v-model:open="showUploadFile">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{{ t('dashboard.uploadFileModalTitle') }}</DialogTitle>
                </DialogHeader>

                <fileUpload :folder-id="props.selectedFolderId" @uploaded="handleUploaded" />
            </DialogContent>
        </Dialog>

        <Dialog v-model:open="showStorageDialog">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{{ t('dashboard.storage') }}</DialogTitle>
                </DialogHeader>

                <div class="flex flex-col gap-4">
                    <div class="flex items-center justify-between gap-4 text-sm">
                        <span class="text-zinc-600 dark:text-zinc-300">{{ t('dashboard.storageUsed') }}</span>
                        <span class="font-medium">{{ storageUsedLabel }} / {{ storageMaxLabel }}</span>
                    </div>
                    <div class="h-3 w-full overflow-hidden rounded bg-zinc-200 dark:bg-neutral-800">
                        <div class="h-full rounded bg-blue-500 transition-[width]" :style="{ width: `${storagePercent}%` }"></div>
                    </div>
                    <div class="flex items-center justify-between gap-4 text-sm">
                        <span class="text-zinc-600 dark:text-zinc-300">{{ t('dashboard.storageRemainingLabel') }}</span>
                        <span class="font-medium">{{ storageRemainingLabel }}</span>
                    </div>
                    <p v-if="storageError" class="text-sm text-red-500">{{ storageError }}</p>
                    <Button variant="ghost" class="cursor-pointer justify-start" @click="refreshStorage">
                        {{ t('dashboard.refreshStorage') }}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog v-model:open="showCreateFolder">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{{ t('dashboard.newFolder') }}</DialogTitle>
                </DialogHeader>

                <div class="flex flex-col gap-3">
                    <Input v-model="folderName" :placeholder="t('dashboard.folderName')" />
                    <p v-if="folderError" class="text-sm text-red-500">{{ folderError }}</p>
                    <Button class="cursor-pointer" :disabled="!folderName.trim()" @click="createFolder">
                        {{ t('dashboard.createFolder') }}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog v-model:open="showFolderSettings">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{{ t('dashboard.folderSettings') }}</DialogTitle>
                </DialogHeader>

                <div class="flex flex-col gap-5">
                    <p v-if="settingsError" class="text-sm text-red-500">{{ settingsError }}</p>
                    <p v-if="settingsMessage" class="text-sm text-green-600">{{ settingsMessage }}</p>

                    <section class="flex flex-col gap-2">
                        <h3 class="text-sm font-semibold">{{ t('dashboard.folderIcon') }}</h3>
                        <div class="flex items-center gap-3">
                            <img v-if="settingsFolder?.iconUrl" :src="settingsFolder.iconUrl" :alt="settingsFolder.name"
                                class="h-14 w-14 rounded-md object-cover" />
                            <div v-else
                                class="flex h-14 w-14 items-center justify-center rounded-md bg-zinc-200 dark:bg-neutral-800">
                                <Folder class="h-6 w-6 opacity-70" />
                            </div>
                            <div class="flex flex-1 flex-col gap-2">
                                <Input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp"
                                    @change="uploadFolderIcon" />
                                <Button v-if="settingsFolder?.iconUrl" variant="ghost"
                                    class="cursor-pointer justify-start text-red-600 hover:text-red-600"
                                    @click="removeFolderIcon">
                                    {{ t('dashboard.removeFolderIcon') }}
                                </Button>
                            </div>
                        </div>
                    </section>

                    <section class="flex flex-col gap-2">
                        <h3 class="text-sm font-semibold">{{ t('dashboard.renameFolder') }}</h3>
                        <div class="flex gap-2">
                            <Input v-model="settingsFolderName" :placeholder="t('dashboard.folderName')" />
                            <Button class="cursor-pointer" :disabled="!settingsFolderName.trim()" @click="renameFolder">
                                {{ t('dashboard.saveFolderName') }}
                            </Button>
                        </div>
                    </section>

                    <section class="flex flex-col gap-2">
                        <h3 class="text-sm font-semibold">{{ t('dashboard.publicAccess') }}</h3>
                        <Button v-if="!publicShareUrl" class="cursor-pointer" @click="createPublicShare">
                            {{ t('dashboard.createPublicLink') }}
                        </Button>
                        <div v-if="publicShareUrl" class="flex gap-2">
                            <Input :model-value="publicShareUrl" readonly />
                            <Button class="cursor-pointer" @click="copyPublicShareUrl">
                                {{ t('dashboard.copyLink') }}
                            </Button>
                        </div>
                        <Button v-if="publicShareUrl" variant="ghost" class="cursor-pointer justify-start text-red-600 hover:text-red-600"
                            @click="removePublicShare">
                            {{ t('dashboard.removePublicLink') }}
                        </Button>
                    </section>

                    <section class="flex flex-col gap-2">
                        <h3 class="text-sm font-semibold">{{ t('dashboard.publishFolder') }}</h3>
                        <textarea v-model="publishedMarkdown"
                            class="min-h-28 rounded-md border border-zinc-300 bg-white p-2 text-sm text-zinc-900 outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                            :placeholder="t('dashboard.publishMarkdownPlaceholder')"></textarea>
                        <div class="flex gap-2">
                            <Button class="cursor-pointer" @click="publishFolder">
                                {{ publishedUrl ? t('dashboard.updatePublishedFolder') : t('dashboard.publishFolderAction') }}
                            </Button>
                            <Button v-if="publishedUrl" variant="ghost" class="cursor-pointer text-red-600 hover:text-red-600"
                                @click="removePublishedFolder">
                                {{ t('dashboard.unpublishFolder') }}
                            </Button>
                        </div>
                        <div v-if="publishedUrl" class="flex gap-2">
                            <Input :model-value="publishedUrl" readonly />
                            <Button class="cursor-pointer" @click="copyPublishedUrl">
                                {{ t('dashboard.copyLink') }}
                            </Button>
                        </div>
                        <p v-if="publishedUrl" class="text-xs text-zinc-500 dark:text-zinc-400">
                            {{ t('dashboard.publishedLikes', { count: publishedLikes }) }}
                        </p>
                    </section>

                    <section class="flex flex-col gap-2">
                        <h3 class="text-sm font-semibold">{{ t('dashboard.peopleWithAccess') }}</h3>
                        <div v-if="sharedUsers.length" class="flex flex-col gap-2">
                            <div v-for="user in sharedUsers" :key="user.id"
                                class="flex items-center justify-between gap-3 rounded-md border border-zinc-300 p-2 text-sm dark:border-neutral-700">
                                <div class="flex min-w-0 items-center gap-3">
                                    <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.name"
                                        class="h-9 w-9 rounded-full object-cover" />
                                    <div v-else
                                        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-neutral-800 dark:text-white">
                                        {{ initials(user.name || user.email) }}
                                    </div>
                                    <div class="min-w-0">
                                        <span class="block truncate font-medium">{{ user.name }}</span>
                                        <span class="block truncate opacity-70">{{ user.email }}</span>
                                        <span class="block text-xs opacity-60">{{ user.role === 'owner' ? t('dashboard.folderOwner') : t('dashboard.folderMember') }}</span>
                                    </div>
                                </div>
                                <div class="flex shrink-0 items-center gap-1">
                                    <Button v-if="user.role !== 'owner'" variant="ghost"
                                        class="h-8 cursor-pointer"
                                        @click="setSharedUserRole(user, 'owner')">
                                        {{ t('dashboard.makeOwner') }}
                                    </Button>
                                    <Button v-else variant="ghost"
                                        class="h-8 cursor-pointer"
                                        @click="setSharedUserRole(user, 'member')">
                                        {{ t('dashboard.makeMember') }}
                                    </Button>
                                    <Button variant="ghost" class="h-8 cursor-pointer text-red-600 hover:text-red-600"
                                        @click="removeSharedUser(user)">
                                        {{ t('dashboard.removeUser') }}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <p v-else class="text-sm text-zinc-500 dark:text-zinc-400">{{ t('dashboard.noSharedUsers') }}</p>
                    </section>

                    <section class="flex flex-col gap-2">
                        <h3 class="text-sm font-semibold">{{ t('dashboard.addPeople') }}</h3>
                        <Input v-model="userSearch" :placeholder="t('dashboard.searchUsers')" @input="searchUsers" />

                        <div v-if="selectedUsers.length" class="flex flex-wrap gap-2">
                            <button v-for="user in selectedUsers" :key="user.id"
                                class="flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                @click="removeSelectedUser(user.id)">
                                <span>{{ user.email }}</span>
                                <X class="h-3 w-3" />
                            </button>
                        </div>

                        <div class="flex flex-col gap-2">
                            <button v-for="user in userResults" :key="user.id"
                                class="flex items-center gap-3 rounded-md border border-zinc-300 p-2 text-left text-sm hover:bg-zinc-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                @click="selectUser(user)">
                                <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.name"
                                    class="h-9 w-9 rounded-full object-cover" />
                                <span v-else
                                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-neutral-800 dark:text-white">
                                    {{ initials(user.name || user.email) }}
                                </span>
                                <span class="min-w-0">
                                    <span class="block truncate font-medium">{{ user.name }}</span>
                                    <span class="block truncate opacity-70">{{ user.email }}</span>
                                </span>
                            </button>
                        </div>

                        <div class="flex gap-2">
                            <Button class="cursor-pointer" :disabled="selectedUsers.length === 0" @click="shareWithSelectedUsers('member')">
                                {{ t('dashboard.shareSelectedUsers') }}
                            </Button>
                            <Button variant="ghost" class="cursor-pointer" :disabled="selectedUsers.length === 0" @click="shareWithSelectedUsers('owner')">
                                {{ t('dashboard.shareAsOwner') }}
                            </Button>
                        </div>

                    </section>
                </div>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Folder, ChevronDown, X, Settings, Shield, LogOut, HardDrive, User } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
const { t } = useI18n();
const router = useRouter();
const { data: session } = await useFetch("/api/verifyToken", {
    method: "POST"
});
const isLoggedIn = computed(() => Boolean(session.value?.authenticated && session.value?.id));
const isAdmin = computed(() => session.value?.role === "admin");
const avatarVersion = ref(Date.now());
const showAvatar = ref(true);
const avatarUrl = computed(() => isLoggedIn.value ? `/api/users/avatar/${session.value?.id}?v=${avatarVersion.value}` : "");
const showUploadFile = ref(false)
const showCreateFolder = ref(false)
const showFolderSettings = ref(false)
const showStorageDialog = ref(false)
const folderName = ref("")
const folderError = ref("")
const settingsFolder = ref<FolderItem | null>(null)
const settingsFolderName = ref("")
const settingsError = ref("")
const settingsMessage = ref("")
const publicShareUrl = ref("")
const publishedUrl = ref("")
const publishedMarkdown = ref("")
const publishedLikes = ref(0)
const userSearch = ref("")
const userResults = ref<Array<{ id: number; name: string; email: string; avatarUrl?: string | null }>>([])
const selectedUsers = ref<Array<{ id: number; name: string; email: string; avatarUrl?: string | null }>>([])
const sharedUsers = ref<Array<{ id: number; name: string; email: string; role?: string; avatarUrl?: string | null }>>([])
const storage = ref({ usedBytes: 0, maxBytes: 0, remainingBytes: 0, usedPercent: 0 })
const storageError = ref("")

type FolderItem = {
    id: number;
    name: string;
    shared?: boolean;
    accessRole?: string;
    canManage?: boolean;
    iconUrl?: string | null;
}

const props = defineProps<{
    search?: string;
    folders?: FolderItem[];
    selectedFolderId?: string | null;
}>();
const emit = defineEmits<{
    (e: 'update:search', value: string): void;
    (e: 'select-folder', folderId: string | null): void;
    (e: 'folder-created', folder: FolderItem): void;
    (e: 'folder-updated', folder: FolderItem): void;
    (e: 'folder-deleted', folderId: number): void;
    (e: 'uploaded'): void;
}>();

const search = ref(props.search ?? "");
const storagePercent = computed(() => Math.min(100, Math.max(0, storage.value.usedPercent || 0)));
const storagePercentLabel = computed(() => `${storagePercent.value.toFixed(storagePercent.value % 1 === 0 ? 0 : 1)}%`);
const storageUsedLabel = computed(() => formatBytes(storage.value.usedBytes));
const storageMaxLabel = computed(() => formatBytes(storage.value.maxBytes));
const storageRemainingLabel = computed(() => formatBytes(storage.value.remainingBytes));

// Keep v-model in sync
watch(search, (val: string) => emit("update:search", val));
watch(() => props.search, (val) => {
    if (val !== undefined && val !== search.value) {
        search.value = val;
    }
});

watch(showStorageDialog, (open) => {
    if (open) {
        refreshStorage();
    }
});

onMounted(() => {
    refreshStorage();
    window.addEventListener("user-avatar-updated", refreshAvatar);
});

onBeforeUnmount(() => {
    window.removeEventListener("user-avatar-updated", refreshAvatar);
});

function initials(value = "") {
    return value.trim().slice(0, 2).toUpperCase() || "??";
}

function refreshAvatar() {
    showAvatar.value = true;
    avatarVersion.value = Date.now();
}

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }

    return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

async function refreshStorage() {
    if (!isLoggedIn.value) {
        return;
    }

    storageError.value = "";

    try {
        storage.value = await $fetch<typeof storage.value>("/api/storage");
    } catch (err: any) {
        storageError.value = err?.data?.statusMessage || err?.statusMessage || "Could not load storage";
    }
}

async function openStorageDialog() {
    showStorageDialog.value = true;
    await refreshStorage();
}

async function handleUploaded() {
    await refreshStorage();
    emit('uploaded');
}

async function createFolder() {
    folderError.value = "";

    try {
        const res = await $fetch<{ folder: { id: number; name: string } }>("/api/folders/create", {
            method: "POST",
            body: {
                name: folderName.value,
                parentId: props.selectedFolderId
            }
        });

        emit("folder-created", res.folder);
        emit("select-folder", String(res.folder.id));
        folderName.value = "";
        showCreateFolder.value = false;
    } catch (err: any) {
        folderError.value = err?.data?.statusMessage || err?.statusMessage || "Could not create folder";
    }
}

async function logoff() {
    if (!isLoggedIn.value) {
        return;
    }

    await $fetch("/api/logout", {
        method: "POST"
    });
    session.value = { authenticated: false };
    await router.push("/");
}

async function openFolderSettings(folder: FolderItem) {
    settingsFolder.value = folder;
    settingsFolderName.value = folder.name;
    publicShareUrl.value = "";
    publishedUrl.value = "";
    publishedMarkdown.value = "";
    publishedLikes.value = 0;
    userSearch.value = "";
    userResults.value = [];
    selectedUsers.value = [];
    sharedUsers.value = [];
    settingsError.value = "";
    settingsMessage.value = "";
    showFolderSettings.value = true;
    await loadFolderSettings();
}

function firstPublicShareUrl(publicShares: Array<{ url: string }> = []) {
    const share = publicShares[0];
    return share ? `${window.location.origin}${share.url}` : "";
}

async function loadFolderSettings() {
    if (!settingsFolder.value) {
        return;
    }

    try {
        const res = await $fetch<{
            folder: FolderItem;
            publicShares: Array<{ url: string }>;
            publishedShare: { url: string; markdown: string; likes: number } | null;
            sharedUsers: Array<{ id: number; name: string; email: string; role?: string; avatarUrl?: string | null }>;
        }>(`/api/folders/settings/${settingsFolder.value.id}`);

        settingsFolder.value = { ...settingsFolder.value, name: res.folder.name };
        settingsFolderName.value = res.folder.name;
        publicShareUrl.value = firstPublicShareUrl(res.publicShares);
        publishedUrl.value = res.publishedShare ? `${window.location.origin}${res.publishedShare.url}` : "";
        publishedMarkdown.value = res.publishedShare?.markdown ?? "";
        publishedLikes.value = res.publishedShare?.likes ?? 0;
        sharedUsers.value = res.sharedUsers;
        emit("folder-updated", settingsFolder.value);
    } catch (err: any) {
        settingsError.value = err?.data?.statusMessage || err?.statusMessage || "Could not load folder settings";
    }
}

async function publishFolder() {
    if (!settingsFolder.value) {
        return;
    }

    settingsError.value = "";
    settingsMessage.value = "";

    try {
        const res = await $fetch<{ share: { url: string; markdown: string; likes: number } }>(`/api/folders/publish/${settingsFolder.value.id}`, {
            method: "POST",
            body: {
                markdown: publishedMarkdown.value
            }
        });

        publishedUrl.value = `${window.location.origin}${res.share.url}`;
        publishedMarkdown.value = res.share.markdown;
        publishedLikes.value = res.share.likes;
        settingsMessage.value = t('dashboard.folderPublished');
    } catch (err: any) {
        settingsError.value = err?.data?.statusMessage || err?.statusMessage || "Could not publish folder";
    }
}

async function removePublishedFolder() {
    if (!settingsFolder.value) {
        return;
    }

    if (!confirm(t('dashboard.confirmUnpublishFolder'))) {
        return;
    }

    settingsError.value = "";
    settingsMessage.value = "";

    try {
        await $fetch(`/api/folders/publish/remove/${settingsFolder.value.id}`, {
            method: "POST"
        });

        publishedUrl.value = "";
        publishedLikes.value = 0;
        settingsMessage.value = t('dashboard.folderUnpublished');
    } catch (err: any) {
        settingsError.value = err?.data?.statusMessage || err?.statusMessage || "Could not unpublish folder";
    }
}

async function copyPublishedUrl() {
    if (!publishedUrl.value) {
        return;
    }

    await navigator.clipboard.writeText(publishedUrl.value);
    settingsMessage.value = t('dashboard.linkCopied');
}

async function uploadFolderIcon(event: Event) {
    if (!settingsFolder.value) {
        return;
    }

    settingsError.value = "";
    settingsMessage.value = "";

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
        return;
    }

    try {
        const form = new FormData();
        form.append("icon", file);
        const res = await $fetch<{ folder: FolderItem }>(`/api/folders/icon/${settingsFolder.value.id}`, {
            method: "POST",
            body: form
        });

        settingsFolder.value = { ...settingsFolder.value, ...res.folder };
        settingsMessage.value = t('dashboard.folderIconUpdated');
        emit("folder-updated", settingsFolder.value);
    } catch (err: any) {
        settingsError.value = err?.data?.statusMessage || err?.statusMessage || "Could not update folder icon";
    } finally {
        input.value = "";
    }
}

async function removeFolderIcon() {
    if (!settingsFolder.value) {
        return;
    }

    settingsError.value = "";
    settingsMessage.value = "";

    try {
        const res = await $fetch<{ folder: FolderItem }>(`/api/folders/icon/remove/${settingsFolder.value.id}`, {
            method: "POST"
        });

        settingsFolder.value = { ...settingsFolder.value, ...res.folder };
        settingsMessage.value = t('dashboard.folderIconRemoved');
        emit("folder-updated", settingsFolder.value);
    } catch (err: any) {
        settingsError.value = err?.data?.statusMessage || err?.statusMessage || "Could not remove folder icon";
    }
}

async function createPublicShare() {
    if (!settingsFolder.value) {
        return;
    }

    settingsError.value = "";
    settingsMessage.value = "";

    try {
        const res = await $fetch<{ url: string }>(`/api/folders/share/public/${settingsFolder.value.id}`, {
            method: "POST"
        });

        publicShareUrl.value = `${window.location.origin}${res.url}`;
        settingsMessage.value = t('dashboard.publicLinkCreated');
    } catch (err: any) {
        settingsError.value = err?.data?.statusMessage || err?.statusMessage || "Could not create share link";
    }
}

async function copyPublicShareUrl() {
    if (!publicShareUrl.value) {
        return;
    }

    await navigator.clipboard.writeText(publicShareUrl.value);
    settingsMessage.value = t('dashboard.linkCopied');
}

async function removePublicShare() {
    if (!settingsFolder.value) {
        return;
    }

    if (!confirm(t('dashboard.confirmRemovePublicLink'))) {
        return;
    }

    settingsError.value = "";
    settingsMessage.value = "";

    try {
        await $fetch(`/api/folders/share/public/remove/${settingsFolder.value.id}`, {
            method: "POST"
        });

        publicShareUrl.value = "";
        settingsMessage.value = t('dashboard.publicLinkRemoved');
    } catch (err: any) {
        settingsError.value = err?.data?.statusMessage || err?.statusMessage || "Could not remove public link";
    }
}

async function renameFolder() {
    if (!settingsFolder.value) {
        return;
    }

    settingsError.value = "";
    settingsMessage.value = "";

    try {
        const res = await $fetch<{ folder: FolderItem }>(`/api/folders/rename/${settingsFolder.value.id}`, {
            method: "POST",
            body: {
                name: settingsFolderName.value
            }
        });

        settingsFolder.value = { ...settingsFolder.value, name: res.folder.name };
        settingsFolderName.value = res.folder.name;
        settingsMessage.value = t('dashboard.folderRenamed');
        emit("folder-updated", settingsFolder.value);
    } catch (err: any) {
        settingsError.value = err?.data?.statusMessage || err?.statusMessage || "Could not rename folder";
    }
}

async function searchUsers() {
    settingsError.value = "";
    settingsMessage.value = "";

    if (userSearch.value.trim().length < 2) {
        userResults.value = [];
        return;
    }

    try {
        const res = await $fetch<{ users: Array<{ id: number; name: string; email: string; avatarUrl?: string | null }> }>("/api/users/search", {
            query: {
                q: userSearch.value
            }
        });

        userResults.value = res.users;
    } catch (err: any) {
        settingsError.value = err?.data?.statusMessage || err?.statusMessage || "Could not search users";
    }
}

function selectUser(user: { id: number; name: string; email: string; avatarUrl?: string | null }) {
    if (
        !selectedUsers.value.some((selectedUser) => selectedUser.id === user.id)
        && !sharedUsers.value.some((sharedUser) => sharedUser.id === user.id)
    ) {
        selectedUsers.value = [...selectedUsers.value, user];
    }

    userSearch.value = "";
    userResults.value = [];
}

function removeSelectedUser(userId: number) {
    selectedUsers.value = selectedUsers.value.filter((user) => user.id !== userId);
}

async function shareWithSelectedUsers(role: "member" | "owner" = "member") {
    if (!settingsFolder.value) {
        return;
    }

    if (selectedUsers.value.length === 0) {
        settingsError.value = "Select at least one user";
        return;
    }

    try {
        const res = await $fetch<{ users: Array<{ id: number; name: string; email: string; avatarUrl?: string | null }> }>(`/api/folders/share/user/${settingsFolder.value.id}`, {
            method: "POST",
            body: {
                userIds: selectedUsers.value.map((user) => user.id),
                role
            }
        });

        settingsMessage.value = `${t('dashboard.sharedWith')} ${res.users.map((user) => user.email).join(", ")}`;
        selectedUsers.value = [];
        await loadFolderSettings();
    } catch (err: any) {
        settingsError.value = err?.data?.statusMessage || err?.statusMessage || "Could not share folder";
    }
}

async function setSharedUserRole(user: { id: number; email: string }, role: "member" | "owner") {
    if (!settingsFolder.value) {
        return;
    }

    settingsError.value = "";
    settingsMessage.value = "";

    try {
        await $fetch(`/api/folders/share/user/${settingsFolder.value.id}`, {
            method: "POST",
            body: {
                userId: user.id,
                role
            }
        });

        settingsMessage.value = role === "owner"
            ? t('dashboard.userMadeOwner')
            : t('dashboard.userMadeMember');
        await loadFolderSettings();
    } catch (err: any) {
        settingsError.value = err?.data?.statusMessage || err?.statusMessage || "Could not update user permissions";
    }
}

async function removeSharedUser(user: { id: number; email: string }) {
    if (!settingsFolder.value) {
        return;
    }

    if (!confirm(t('dashboard.confirmRemoveUser', { email: user.email }))) {
        return;
    }

    settingsError.value = "";
    settingsMessage.value = "";

    try {
        await $fetch(`/api/folders/share/user/remove/${settingsFolder.value.id}`, {
            method: "POST",
            body: {
                userId: user.id
            }
        });

        sharedUsers.value = sharedUsers.value.filter((sharedUser) => sharedUser.id !== user.id);
        settingsMessage.value = t('dashboard.userRemoved');
    } catch (err: any) {
        settingsError.value = err?.data?.statusMessage || err?.statusMessage || "Could not remove user";
    }
}

async function deleteFolder(folder: FolderItem) {
    if (!confirm(`Delete folder "${folder.name}" and all files inside it? This cannot be undone.`)) {
        return;
    }

    try {
        await $fetch(`/api/folders/delete/${folder.id}`, {
            method: "POST"
        });

        emit("folder-deleted", folder.id);
    } catch (err: any) {
        folderError.value = err?.data?.statusMessage || err?.statusMessage || "Could not delete folder";
    }
}

async function cloneFolder(folder: FolderItem) {
    const newName = prompt(t('dashboard.cloneFolderName'), `Copy of ${folder.name}`);

    if (!newName) {
        return;
    }

    try {
        const res = await $fetch<{ folder: FolderItem }>(`/api/folders/clone/${folder.id}`, {
            method: "POST",
            body: {
                name: newName
            }
        });

        emit("folder-created", res.folder);
        emit("select-folder", String(res.folder.id));
    } catch (err: any) {
        folderError.value = err?.data?.statusMessage || err?.statusMessage || "Could not duplicate folder";
    }
}

async function leaveFolder(folder: FolderItem) {
    if (!confirm(`Remove shared folder "${folder.name}" from your dashboard?`)) {
        return;
    }

    try {
        await $fetch(`/api/folders/leave/${folder.id}`, {
            method: "POST"
        });

        emit("folder-deleted", folder.id);
    } catch (err: any) {
        folderError.value = err?.data?.statusMessage || err?.statusMessage || "Could not remove shared folder";
    }
}
</script>
