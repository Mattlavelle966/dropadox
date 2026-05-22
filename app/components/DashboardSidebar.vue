<template>
    <aside class="w-64 bg-zinc-300 dark:bg-neutral-900 dark:text-white flex flex-col p-4 space-y-6">
        <nav class="flex flex-col space-y-2">
            <Button variant="ghost" 
            class="justify-start hover:bg-zinc-400/30 cursor-pointer" 
            @click="emit('select-folder', null)"
            :class="{ 'bg-zinc-400/30': props.selectedFolderId === null }">
        
                <Folder class="w-4 h-4 mr-2" />
                {{ t('dashboard.myFiles') }}
            </Button>

            <div v-for="folder in props.folders" :key="folder.id"
                class="flex items-center rounded-md hover:bg-zinc-400/30"
                :class="{ 'bg-zinc-400/30': props.selectedFolderId === String(folder.id) }">
                <Button variant="ghost"
                    class="min-w-0 flex-1 justify-start cursor-pointer hover:bg-transparent"
                    @click="emit('select-folder', String(folder.id))">
                    <Folder class="w-4 h-4 mr-2" />
                    <span class="truncate">{{ folder.name }}</span>
                    <span v-if="folder.shared" class="ml-1 text-xs opacity-60">{{ t('dashboard.shared') }}</span>
                </Button>

                <DropdownMenu v-if="!folder.shared">
                    <DropdownMenuTrigger as-child>
                        <Button variant="ghost" class="h-9 w-9 px-0 cursor-pointer hover:bg-zinc-400/30">
                            <MoreHorizontal class="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem @click="openShareFolder(folder)">
                            {{ t('dashboard.shareFolder') }}
                        </DropdownMenuItem>
                        <DropdownMenuItem class="text-red-600 focus:text-red-600" @click="deleteFolder(folder)">
                            {{ t('dashboard.deleteFolder') }}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </nav>

        <div class="mt-auto text-sm text-black/80 dark:text-white/50">
            © {{ new Date().getFullYear() }} {{ t('common.siteName') }}
        </div>
    </aside>

    <div class="flex-1 flex flex-col w-full">

        <header class="p-4 border-b dark:border-b-neutral-800 flex items-center gap-4">
            <div class="flex-1">
                <Input v-model="search" :placeholder="t('dashboard.searchFiles')"
                    class="text-zinc-300 border-zinc-300 bg-white dark:bg-neutral-800 dark:focus-visible:ring-neutral-300 focus-visible:ring-zinc-300" />
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <Button class="cursor-pointer" variant="default">{{ t('common.words.new') }}
                        <ChevronDown />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem @click="showUploadFile = true">{{ t('dashboard.uploadFile') }}</DropdownMenuItem>
                    <DropdownMenuItem @click="showCreateFolder = true">{{ t('dashboard.newFolder') }}</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>

        <main class="flex flex-col w-full gap-4 p-4 overflow-y-auto">
            <slot />
        </main>

        <Dialog v-model:open="showUploadFile">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{{ t('dashboard.uploadFileModalTitle') }}</DialogTitle>
                </DialogHeader>

                <fileUpload :folder-id="props.selectedFolderId" @uploaded="emit('uploaded')" />
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

        <Dialog v-model:open="showShareFolder">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{{ t('dashboard.shareFolder') }}</DialogTitle>
                </DialogHeader>

                <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-2">
                        <Button class="cursor-pointer" @click="createPublicShare">
                            {{ t('dashboard.createPublicLink') }}
                        </Button>
                        <div v-if="publicShareUrl" class="flex gap-2">
                            <Input :model-value="publicShareUrl" readonly />
                            <Button class="cursor-pointer" @click="copyPublicShareUrl">
                                {{ t('dashboard.copyLink') }}
                            </Button>
                        </div>
                    </div>

                    <div class="flex flex-col gap-2">
                        <Input v-model="userSearch" :placeholder="t('dashboard.searchUsers')" @input="searchUsers" />
                        <p v-if="shareError" class="text-sm text-red-500">{{ shareError }}</p>

                        <div class="flex flex-col gap-2">
                            <button v-for="user in userResults" :key="user.id"
                                class="rounded-md border border-zinc-300 p-2 text-left text-sm hover:bg-zinc-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                @click="shareWithUser(user)">
                                <span class="font-medium">{{ user.name }}</span>
                                <span class="block opacity-70">{{ user.email }}</span>
                            </button>
                        </div>

                        <p v-if="shareMessage" class="text-sm text-green-600">{{ shareMessage }}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { Folder, ChevronDown, MoreHorizontal } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
const { t } = useI18n();
const showUploadFile = ref(false)
const showCreateFolder = ref(false)
const showShareFolder = ref(false)
const folderName = ref("")
const folderError = ref("")
const sharingFolder = ref<FolderItem | null>(null)
const publicShareUrl = ref("")
const userSearch = ref("")
const userResults = ref<Array<{ id: number; name: string; email: string }>>([])
const shareError = ref("")
const shareMessage = ref("")

type FolderItem = {
    id: number;
    name: string;
    shared?: boolean;
}

const props = defineProps<{
    modelValue?: string;
    folders?: FolderItem[];
    selectedFolderId?: string | null;
}>();
const emit = defineEmits<{
    (e: 'update:search', value: string): void;
    (e: 'select-folder', folderId: string | null): void;
    (e: 'folder-created', folder: FolderItem): void;
    (e: 'folder-deleted', folderId: number): void;
    (e: 'uploaded'): void;
}>();

const search = ref(props.modelValue ?? "");

// Keep v-model in sync
watch(search, (val: string) => emit("update:search", val));

async function createFolder() {
    folderError.value = "";

    try {
        const token = useCookie("token").value;
        const res = await $fetch<{ folder: { id: number; name: string } }>("/api/folders/create", {
            method: "POST",
            body: {
                token,
                name: folderName.value
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

function openShareFolder(folder: FolderItem) {
    sharingFolder.value = folder;
    publicShareUrl.value = "";
    userSearch.value = "";
    userResults.value = [];
    shareError.value = "";
    shareMessage.value = "";
    showShareFolder.value = true;
}

async function createPublicShare() {
    if (!sharingFolder.value) {
        return;
    }

    shareError.value = "";
    shareMessage.value = "";

    try {
        const token = useCookie("token").value;
        const res = await $fetch<{ url: string }>(`/api/folders/share/public/${sharingFolder.value.id}`, {
            method: "POST",
            body: { token }
        });

        publicShareUrl.value = `${window.location.origin}${res.url}`;
    } catch (err: any) {
        shareError.value = err?.data?.statusMessage || err?.statusMessage || "Could not create share link";
    }
}

async function copyPublicShareUrl() {
    if (!publicShareUrl.value) {
        return;
    }

    await navigator.clipboard.writeText(publicShareUrl.value);
    shareMessage.value = t('dashboard.linkCopied');
}

async function searchUsers() {
    shareError.value = "";
    shareMessage.value = "";

    if (userSearch.value.trim().length < 2) {
        userResults.value = [];
        return;
    }

    try {
        const token = useCookie("token").value;
        const res = await $fetch<{ users: Array<{ id: number; name: string; email: string }> }>("/api/users/search", {
            query: {
                token,
                q: userSearch.value
            }
        });

        userResults.value = res.users;
    } catch (err: any) {
        shareError.value = err?.data?.statusMessage || err?.statusMessage || "Could not search users";
    }
}

async function shareWithUser(user: { id: number; name: string; email: string }) {
    if (!sharingFolder.value) {
        return;
    }

    try {
        const token = useCookie("token").value;
        await $fetch(`/api/folders/share/user/${sharingFolder.value.id}`, {
            method: "POST",
            body: {
                token,
                userId: user.id
            }
        });

        shareMessage.value = `${t('dashboard.sharedWith')} ${user.email}`;
    } catch (err: any) {
        shareError.value = err?.data?.statusMessage || err?.statusMessage || "Could not share folder";
    }
}

async function deleteFolder(folder: FolderItem) {
    if (!confirm(`Delete folder "${folder.name}" and all files inside it? This cannot be undone.`)) {
        return;
    }

    try {
        const token = useCookie("token").value;
        await $fetch(`/api/folders/delete/${folder.id}`, {
            method: "POST",
            body: { token }
        });

        emit("folder-deleted", folder.id);
    } catch (err: any) {
        folderError.value = err?.data?.statusMessage || err?.statusMessage || "Could not delete folder";
    }
}
</script>
