<template>
  <div class="h-full">
    <div class="flex h-full grow bg-zinc-100 dark:bg-neutral-800/95">

      <DashboardSidebar v-model:search="searchQuery" :folders="folders" :selected-folder-id="selectedFolderId"
        @select-folder="selectFolder" @folder-created="addFolder" @folder-updated="updateFolder"
        @folder-deleted="removeFolder" @uploaded="refreshUploads"
        v-slot="{ openFolderSettings, deleteFolder, cloneFolder, leaveFolder }">
        <div class="flex flex-col gap-4">
          <header class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-300 pb-3 dark:border-neutral-700">
            <div class="min-w-0">
              <h1 class="truncate text-2xl font-semibold text-zinc-950 dark:text-white">{{ currentTitle }}</h1>
              <div class="mt-1 flex flex-wrap items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                <button class="hover:text-zinc-950 dark:hover:text-white" @click="selectFolder(null)">
                  {{ t('dashboard.myFiles') }}
                </button>
                <template v-for="folder in breadcrumbFolders" :key="folder.id">
                  <span>/</span>
                  <button class="max-w-48 truncate hover:text-zinc-950 dark:hover:text-white"
                    @click="selectFolder(String(folder.id))">
                    {{ folder.name }}
                  </button>
                </template>
              </div>
            </div>
            <Button v-if="currentParentId" variant="ghost" class="cursor-pointer" @click="selectFolder(currentParentId)">
              <ArrowUp class="mr-2 h-4 w-4" />
              {{ t('dashboard.upFolder') }}
            </Button>
          </header>

          <section class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            <div v-for="folder in filteredVisibleFolders" :key="folder.id"
              class="group flex min-h-32 flex-col justify-between rounded-md border border-zinc-300 bg-white p-3 shadow-sm transition hover:border-zinc-400 dark:border-neutral-700 dark:bg-neutral-950 dark:hover:border-neutral-500">
              <button class="flex min-w-0 flex-1 flex-col items-start gap-3 text-left" @click="selectFolder(String(folder.id))">
                <img v-if="folder.iconUrl" :src="folder.iconUrl" :alt="folder.name"
                  class="h-12 w-12 rounded-md object-cover" />
                <span v-else class="flex h-12 w-12 items-center justify-center rounded-md bg-zinc-200 dark:bg-neutral-800">
                  <Folder class="h-6 w-6 opacity-70" />
                </span>
                <span class="line-clamp-2 break-words font-medium text-zinc-950 dark:text-white">{{ folder.name }}</span>
                <span v-if="folder.shared" class="text-xs text-zinc-500 dark:text-zinc-400">{{ t('dashboard.shared') }}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" class="h-8 w-8 self-end px-0 cursor-pointer">
                    <MoreHorizontal class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem v-if="folder.canManage" @click="openFolderSettings(folder)">
                    {{ t('dashboard.folderSettings') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="cloneFolder(folder)">
                    {{ t('dashboard.cloneFolder') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem v-if="folder.canManage" class="text-red-600 focus:text-red-600" @click="deleteFolder(folder)">
                    {{ t('dashboard.deleteFolder') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem v-if="folder.shared" class="text-red-600 focus:text-red-600" @click="leaveFolder(folder)">
                    {{ t('dashboard.leaveSharedFolder') }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </section>

          <section class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            <FileCard v-for="fileUpload in filteredUploads" :key="fileUpload.id" :file-id="fileUpload.id"
              :file-name="fileUpload.fileName ?? ''" :folder-id="selectedFolderId" @deleted="removeUpload" />
          </section>

          <p v-if="filteredVisibleFolders.length === 0 && filteredUploads.length === 0"
            class="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-neutral-700 dark:text-zinc-400">
            {{ t('dashboard.emptyFolder') }}
          </p>
        </div>
      </DashboardSidebar>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onBeforeUnmount, onMounted } from 'vue';
import DashboardSidebar from "@/components/DashboardSidebar.vue"; // make sure to import it
import { ArrowUp, Folder, MoreHorizontal } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const {t} = useI18n();
const route = useRoute();
const initialFolderId = typeof route.query.folderId === "string" ? route.query.folderId : null;

type FolderItem = {
  id: number;
  name: string;
  parentId?: string | null;
  shared?: boolean;
  accessRole?: string;
  canManage?: boolean;
  iconUrl?: string | null;
}

const { data, error: uploadsError } = await useFetch("/api/files/fromUser", {
  method: "POST",
  body: {
    folderId: initialFolderId
  }
});

if (uploadsError.value?.statusCode === 401) {
  await navigateTo("/login");
}

const { data: folderData, error: foldersError } = await useFetch("/api/folders/list", {
  method: "POST"
});

if (foldersError.value?.statusCode === 401) {
  await navigateTo("/login");
}

const userUploads = ref(data.value?.userUploads ?? []);
const folders = ref<FolderItem[]>(folderData.value?.folders ?? []);
const selectedFolderId = ref<string | null>(initialFolderId);
const refreshingDashboard = ref(false);
let dashboardRefreshTimer: number | undefined;

const searchQuery = ref("");

const filteredUploads = computed(() => {
  if (!searchQuery.value) return userUploads.value;
  return userUploads.value.filter(file =>
    (file.fileName ?? '').toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});
const selectedFolder = computed(() => {
  if (!selectedFolderId.value) return null;
  return folders.value.find(folder => String(folder.id) === selectedFolderId.value) ?? null;
});
const currentParentId = computed(() => selectedFolder.value?.parentId ? String(selectedFolder.value.parentId) : null);
const currentTitle = computed(() => selectedFolder.value?.name ?? t('dashboard.myFiles'));
const visibleFolders = computed(() => {
  const parentId = selectedFolderId.value;
  return folders.value.filter(folder => {
    const folderParentId = folder.parentId ? String(folder.parentId) : null;
    return folderParentId === parentId;
  });
});
const filteredVisibleFolders = computed(() => {
  if (!searchQuery.value) return visibleFolders.value;
  const normalizedSearch = searchQuery.value.toLowerCase();
  return visibleFolders.value.filter(folder => folder.name.toLowerCase().includes(normalizedSearch));
});
const breadcrumbFolders = computed(() => {
  const path: FolderItem[] = [];
  let cursor = selectedFolder.value;

  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parentId
      ? folders.value.find(folder => String(folder.id) === String(cursor?.parentId)) ?? null
      : null;
  }

  return path;
});

function removeUpload(fileId: number) {
  userUploads.value = userUploads.value.filter(file => file.id !== fileId);
}

async function refreshUploads() {
  const data = await $fetch<{ userUploads: any[] }>("/api/files/fromUser", {
    method: "POST",
    body: {
      folderId: selectedFolderId.value
    }
  });

  userUploads.value = data.userUploads;
}

async function refreshFolders() {
  const data = await $fetch<{ folders: FolderItem[] }>("/api/folders/list", {
    method: "POST"
  });

  folders.value = data.folders;

  if (selectedFolderId.value && !data.folders.some(folder => String(folder.id) === selectedFolderId.value)) {
    selectedFolderId.value = null;
    await navigateTo({
      path: "/dashboard",
      query: {}
    }, { replace: true });
  }
}

async function refreshDashboard() {
  if (refreshingDashboard.value) {
    return;
  }

  try {
    refreshingDashboard.value = true;
    await refreshFolders();
    await refreshUploads();
  } catch (error) {
    // A stale auth cookie or transient request failure should not break the open dashboard.
  } finally {
    refreshingDashboard.value = false;
  }
}

async function selectFolder(folderId: string | null) {
  selectedFolderId.value = folderId;
  await navigateTo({
    path: "/dashboard",
    query: folderId ? { folderId } : {}
  }, { replace: true });
  await refreshUploads();
}

function addFolder(folder: FolderItem) {
  folders.value = [...folders.value, folder];
}

function updateFolder(folder: FolderItem) {
  folders.value = folders.value.map(existingFolder =>
    existingFolder.id === folder.id ? { ...existingFolder, ...folder } : existingFolder
  );
}

async function removeFolder(folderId: number) {
  folders.value = folders.value.filter(folder => folder.id !== folderId);

  if (selectedFolderId.value === String(folderId)) {
    selectedFolderId.value = null;
    await refreshUploads();
  }
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") {
    refreshDashboard();
  }
}

onMounted(() => {
  dashboardRefreshTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      refreshDashboard();
    }
  }, 5000);

  window.addEventListener("focus", refreshDashboard);
  document.addEventListener("visibilitychange", onVisibilityChange);
});

onBeforeUnmount(() => {
  if (dashboardRefreshTimer) {
    window.clearInterval(dashboardRefreshTimer);
  }

  window.removeEventListener("focus", refreshDashboard);
  document.removeEventListener("visibilitychange", onVisibilityChange);
});

useHead({
  title: t("common.siteName") + " - " + t("dashboard.title")
})
</script>
