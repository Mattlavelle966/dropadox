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

          <div class="flex flex-wrap items-center gap-2 text-sm">
            <label class="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
              {{ t('dashboard.filterType') }}
              <select v-model="itemFilter"
                class="h-9 border border-zinc-300 bg-white px-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white">
                <option value="all">{{ t('dashboard.filterAll') }}</option>
                <option value="folders">{{ t('dashboard.filterFolders') }}</option>
                <option value="files">{{ t('dashboard.filterFiles') }}</option>
              </select>
            </label>
            <label class="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
              {{ t('dashboard.fileKind') }}
              <select v-model="fileKindFilter"
                class="h-9 border border-zinc-300 bg-white px-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white">
                <option value="all">{{ t('dashboard.filterAll') }}</option>
                <option value="image">{{ t('dashboard.kindImage') }}</option>
                <option value="video">{{ t('dashboard.kindVideo') }}</option>
                <option value="audio">{{ t('dashboard.kindAudio') }}</option>
                <option value="document">{{ t('dashboard.kindDocument') }}</option>
                <option value="other">{{ t('dashboard.kindOther') }}</option>
              </select>
            </label>
            <label class="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
              {{ t('dashboard.sortBy') }}
              <select v-model="sortBy"
                class="h-9 border border-zinc-300 bg-white px-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white">
                <option value="name">{{ t('dashboard.columnName') }}</option>
                <option value="type">{{ t('dashboard.columnType') }}</option>
                <option value="date">{{ t('dashboard.columnDate') }}</option>
                <option value="size">{{ t('dashboard.columnSize') }}</option>
              </select>
            </label>
            <Button variant="ghost" class="h-9 cursor-pointer rounded-none" @click="toggleSortDirection">
              <ArrowDownUp class="mr-2 h-4 w-4" />
              {{ sortDirection === 'asc' ? t('dashboard.ascending') : t('dashboard.descending') }}
            </Button>
          </div>

          <section class="min-w-0 overflow-x-auto border border-zinc-300 bg-white dark:border-neutral-700 dark:bg-neutral-950">
            <div class="dashboard-table-row grid border-b border-zinc-300 bg-zinc-200/70 px-3 py-2 text-xs font-semibold uppercase text-zinc-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-zinc-300"
              :style="tableGridStyle">
              <span class="resizable-header">{{ t('dashboard.columnName') }}<span class="column-resizer" @pointerdown="startColumnResize('name', $event)"></span></span>
              <span class="resizable-header">{{ t('dashboard.columnType') }}<span class="column-resizer" @pointerdown="startColumnResize('type', $event)"></span></span>
              <span class="people-col resizable-header">{{ t('dashboard.columnPeople') }}<span class="column-resizer" @pointerdown="startColumnResize('people', $event)"></span></span>
              <span class="size-col resizable-header">{{ t('dashboard.columnSize') }}<span class="column-resizer" @pointerdown="startColumnResize('size', $event)"></span></span>
              <span class="date-col resizable-header">{{ t('dashboard.columnDate') }}<span class="column-resizer" @pointerdown="startColumnResize('date', $event)"></span></span>
              <span class="resizable-header text-right">{{ t('dashboard.columnActions') }}<span class="column-resizer" @pointerdown="startColumnResize('actions', $event)"></span></span>
            </div>

            <div v-for="item in tableRows" :key="item.key"
              class="dashboard-table-row grid items-center border-b border-zinc-200 px-3 py-2 text-sm last:border-b-0 hover:bg-zinc-100 dark:border-neutral-800 dark:hover:bg-neutral-900/80"
              :style="tableGridStyle"
              @mouseenter="item.kind === 'file' && openFilePreview(item.file, $event)"
              @mousemove="item.kind === 'file' && moveFilePreview($event)"
              @mouseleave="scheduleHidePreview">
              <button v-if="item.kind === 'folder'"
                class="flex min-w-0 items-center gap-3 text-left font-medium text-zinc-950 dark:text-white"
                @click="selectFolder(String(item.folder.id))">
                <img v-if="item.folder.iconUrl" :src="item.folder.iconUrl" :alt="item.name"
                  class="h-8 w-8 object-cover" />
                <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center bg-zinc-300 text-zinc-950 dark:bg-neutral-700 dark:text-white">
                  <Folder class="h-4 w-4" />
                </span>
                <span class="truncate">{{ item.name }}</span>
                <span v-if="item.folder.shared" class="shrink-0 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  {{ t('dashboard.shared') }}
                </span>
              </button>
              <NuxtLink v-else class="flex min-w-0 items-center gap-3 font-medium text-zinc-950 dark:text-white"
                :to="fileDetailsLocation(item.file)">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center bg-zinc-300 text-zinc-950 dark:bg-neutral-700 dark:text-white">
                  <component :is="fileIcon(item.name)" class="h-4 w-4" />
                </span>
                <span class="truncate">{{ item.name }}</span>
              </NuxtLink>

              <span class="truncate text-zinc-600 dark:text-zinc-300">{{ item.typeLabel }}</span>
              <div class="people-col min-w-0">
                <div v-if="item.people.length" class="flex min-w-0 items-center gap-2">
                  <div class="flex shrink-0 -space-x-2">
                    <template v-for="person in item.people.slice(0, 3)" :key="`${item.key}-${person.id}-${person.role}`">
                      <img v-if="person.avatarUrl" :src="person.avatarUrl" :alt="person.name"
                        class="h-7 w-7 rounded-full border border-white object-cover dark:border-neutral-950" />
                      <span v-else
                        class="flex h-7 w-7 items-center justify-center rounded-full border border-white bg-zinc-300 text-[10px] font-bold text-zinc-700 dark:border-neutral-950 dark:bg-neutral-700 dark:text-white">
                        {{ initials(person.name || person.email) }}
                      </span>
                    </template>
                  </div>
                  <span class="truncate text-xs text-zinc-600 dark:text-zinc-300">{{ peopleLabel(item.people) }}</span>
                </div>
                <span v-else class="text-xs text-zinc-500 dark:text-zinc-400">--</span>
              </div>
              <span class="size-col truncate text-zinc-600 dark:text-zinc-300">{{ item.sizeLabel }}</span>
              <span class="date-col truncate text-zinc-600 dark:text-zinc-300">{{ item.dateLabel }}</span>

              <div class="dashboard-table-actions flex justify-end gap-1">
                <DropdownMenu v-if="item.kind === 'folder'">
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" class="h-8 w-8 rounded-none px-0 cursor-pointer">
                      <MoreHorizontal class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem v-if="item.folder.canManage" @click="openFolderSettings(item.folder)">
                      {{ t('dashboard.folderSettings') }}
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="cloneFolder(item.folder)">
                      {{ t('dashboard.cloneFolder') }}
                    </DropdownMenuItem>
                    <DropdownMenuItem v-if="item.folder.canManage" @click="openMoveDialog('folder', item.folder)">
                      {{ t('dashboard.move') }}
                    </DropdownMenuItem>
                    <DropdownMenuItem v-if="item.folder.canManage" class="text-red-600 focus:text-red-600" @click="deleteFolder(item.folder)">
                      {{ t('dashboard.deleteFolder') }}
                    </DropdownMenuItem>
                    <DropdownMenuItem v-if="item.folder.shared" class="text-red-600 focus:text-red-600" @click="leaveFolder(item.folder)">
                      {{ t('dashboard.leaveSharedFolder') }}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <template v-else>
                  <NuxtLink :to="fileDetailsLocation(item.file)">
                    <Button variant="ghost" class="h-8 w-8 rounded-none px-0 cursor-pointer">
                      <Eye class="h-4 w-4" />
                    </Button>
                  </NuxtLink>
                  <Button variant="ghost" class="h-8 w-8 rounded-none px-0 cursor-pointer" @click="downloadFile(item.file)">
                    <Download class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" class="h-8 w-8 rounded-none px-0 cursor-pointer" @click="openMoveDialog('file', item.file)">
                    <FolderInput class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" class="h-8 w-8 rounded-none px-0 cursor-pointer text-red-600 hover:text-red-600"
                    @click="deleteFile(item.file)">
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </template>
              </div>
            </div>
          </section>

          <p v-if="tableRows.length === 0"
            class="border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-neutral-700 dark:text-zinc-400">
            {{ t('dashboard.emptyFolder') }}
          </p>
        </div>

        <ClientOnly>
          <Teleport to="body">
            <div v-if="previewFile && canPreviewFile(previewFile.fileName)" :style="previewStyle"
              @mouseenter="cancelHidePreview" @mouseleave="scheduleHidePreview"
              class="fixed z-[1000] overflow-hidden border border-zinc-300 bg-white text-zinc-950 shadow-2xl [color-scheme:light]">
              <img v-if="isImageFile(previewFile.fileName)" :src="previewUrl(previewFile)" :alt="previewFile.fileName"
                class="max-h-[var(--preview-height)] w-full object-contain bg-white" loading="lazy" />
              <video v-else-if="isVideoFile(previewFile.fileName)" :src="previewUrl(previewFile)"
                class="max-h-[var(--preview-height)] w-full bg-black" muted preload="metadata" />
              <div v-else-if="isAudioFile(previewFile.fileName)" class="p-3">
                <audio :src="previewUrl(previewFile)" class="w-full" controls preload="metadata" />
              </div>
              <iframe v-else-if="isPdfFile(previewFile.fileName)" :src="previewUrl(previewFile)"
                class="h-[var(--preview-height)] w-full bg-white [color-scheme:light]" />
              <iframe v-else :src="previewUrl(previewFile)"
                class="h-[var(--preview-height)] w-full bg-white [color-scheme:light]" sandbox />
            </div>
          </Teleport>
        </ClientOnly>

        <Dialog v-model:open="showMoveDialog">
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{{ t('dashboard.move') }}</DialogTitle>
            </DialogHeader>

            <div class="flex flex-col gap-4">
              <label class="flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                {{ t('dashboard.moveDestination') }}
                <select v-model="moveTargetFolderId"
                  class="h-9 border border-zinc-300 bg-white px-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white">
                  <option value="">{{ t('dashboard.myFiles') }}</option>
                  <option v-for="folder in moveDestinationFolders" :key="folder.id" :value="String(folder.id)">
                    {{ folderPathLabel(folder) }}
                  </option>
                </select>
              </label>
              <p v-if="moveError" class="text-sm text-red-500">{{ moveError }}</p>
              <Button class="cursor-pointer" @click="moveSelectedItem">
                {{ t('dashboard.moveHere') }}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardSidebar>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onBeforeUnmount, onMounted } from 'vue';
import DashboardSidebar from "@/components/DashboardSidebar.vue"; // make sure to import it
import { ArrowDownUp, ArrowUp, Download, Eye, File as FileIcon, FileArchive, FileAudio, FileImage, FileSpreadsheet, FileText, FileVideo, Folder, FolderInput, MoreHorizontal, Trash2 } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isAudioFile, isDocumentFile, isImageFile, isPdfFile, isPreviewableFile, isSpreadsheetFile, isTextFile, isVideoFile } from '~~/shared/utils/fileType';

const {t} = useI18n();
const route = useRoute();
const initialFolderId = typeof route.query.folderId === "string" ? route.query.folderId : null;

type FolderItem = {
  id: number;
  userId?: string | null;
  name: string;
  parentId?: string | null;
  shared?: boolean;
  accessRole?: string;
  canManage?: boolean;
  iconUrl?: string | null;
  owners?: PersonMetadata[];
  sharedUsers?: PersonMetadata[];
}

type PersonMetadata = {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatarUrl?: string | null;
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
const itemFilter = ref<"all" | "folders" | "files">("all");
const fileKindFilter = ref<"all" | "image" | "video" | "audio" | "document" | "other">("all");
const sortBy = ref<"name" | "type" | "date" | "size">("name");
const sortDirection = ref<"asc" | "desc">("asc");
const previewFile = ref<any | null>(null);
const previewStyle = ref<Record<string, string>>({});
const showMoveDialog = ref(false);
const moveKind = ref<"file" | "folder" | null>(null);
const moveItem = ref<any | null>(null);
const moveTargetFolderId = ref("");
const moveError = ref("");
const tableColumnWidths = ref({
  name: 320,
  type: 112,
  people: 180,
  size: 96,
  date: 160,
  actions: 132
});
let hidePreviewTimeout: ReturnType<typeof setTimeout> | null = null;
let resizingColumn: {
  key: keyof typeof tableColumnWidths.value;
  startX: number;
  startWidth: number;
} | null = null;

const filteredUploads = computed(() => {
  if (!searchQuery.value) return userUploads.value;
  return userUploads.value.filter(file =>
    (file.fileName ?? '').toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});
const tableGridStyle = computed(() => ({
  "--name-col": `${tableColumnWidths.value.name}px`,
  "--type-col": `${tableColumnWidths.value.type}px`,
  "--people-col": `${tableColumnWidths.value.people}px`,
  "--size-col": `${tableColumnWidths.value.size}px`,
  "--date-col": `${tableColumnWidths.value.date}px`,
  "--actions-col": `${tableColumnWidths.value.actions}px`
}));
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
const moveDestinationFolders = computed(() => {
  if (!moveKind.value || !moveItem.value) {
    return folders.value;
  }

  if (moveKind.value === "file") {
    return folders.value;
  }

  const blockedIds = new Set<string>([String(moveItem.value.id)]);
  const queue = [String(moveItem.value.id)];

  while (queue.length) {
    const parentId = queue.shift();

    for (const folder of folders.value) {
      if (String(folder.parentId) === parentId) {
        blockedIds.add(String(folder.id));
        queue.push(String(folder.id));
      }
    }
  }

  return folders.value.filter(folder =>
    !blockedIds.has(String(folder.id)) &&
    folder.canManage &&
    String(folder.userId) === String(moveItem.value.userId)
  );
});
const tableRows = computed(() => {
  const folderRows = filteredVisibleFolders.value.map(folder => ({
    key: `folder-${folder.id}`,
    kind: "folder" as const,
    folder,
    file: null,
    name: folder.name,
    typeLabel: t('dashboard.folderType'),
    size: -1,
    sizeLabel: "--",
    date: folder.createdAt ?? "",
    dateLabel: formatDate(folder.createdAt),
    fileKind: "folder",
    people: folderPeople(folder)
  }));
  const fileRows = filteredUploads.value.map(file => ({
    key: `file-${file.id}`,
    kind: "file" as const,
    folder: null,
    file,
    name: file.fileName ?? "",
    typeLabel: fileTypeLabel(file.fileName ?? ""),
    size: Number(file.size ?? 0),
    sizeLabel: formatBytes(Number(file.size ?? 0)),
    date: file.createdAt ?? "",
    dateLabel: formatDate(file.createdAt),
    fileKind: fileKind(file.fileName ?? ""),
    people: file.uploader ? [file.uploader] : []
  }));

  return [...folderRows, ...fileRows]
    .filter(item => itemFilter.value === "all" || itemFilter.value === `${item.kind}s`)
    .filter(item => item.kind === "folder" || fileKindFilter.value === "all" || item.fileKind === fileKindFilter.value)
    .sort((a, b) => compareRows(a, b));
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

function loadColumnWidths() {
  if (!import.meta.client) {
    return;
  }

  try {
    const stored = window.localStorage.getItem("dashboard-table-column-widths");

    if (!stored) {
      return;
    }

    tableColumnWidths.value = {
      ...tableColumnWidths.value,
      ...JSON.parse(stored)
    };
  } catch {
    window.localStorage.removeItem("dashboard-table-column-widths");
  }
}

function saveColumnWidths() {
  if (import.meta.client) {
    window.localStorage.setItem("dashboard-table-column-widths", JSON.stringify(tableColumnWidths.value));
  }
}

function startColumnResize(key: keyof typeof tableColumnWidths.value, event: PointerEvent) {
  resizingColumn = {
    key,
    startX: event.clientX,
    startWidth: tableColumnWidths.value[key]
  };
  window.addEventListener("pointermove", resizeColumn);
  window.addEventListener("pointerup", stopColumnResize, { once: true });
}

function resizeColumn(event: PointerEvent) {
  if (!resizingColumn) {
    return;
  }

  const minimums = {
    name: 200,
    type: 84,
    people: 128,
    size: 76,
    date: 116,
    actions: 104
  };
  const nextWidth = Math.max(minimums[resizingColumn.key], resizingColumn.startWidth + event.clientX - resizingColumn.startX);
  tableColumnWidths.value = {
    ...tableColumnWidths.value,
    [resizingColumn.key]: Math.round(nextWidth)
  };
}

function stopColumnResize() {
  saveColumnWidths();
  window.removeEventListener("pointermove", resizeColumn);
  resizingColumn = null;
}

function initials(value = "") {
  return value.trim().slice(0, 2).toUpperCase() || "??";
}

function uniquePeople(people: PersonMetadata[] = []) {
  const seen = new Set<number>();
  return people.filter((person) => {
    if (seen.has(person.id)) {
      return false;
    }

    seen.add(person.id);
    return true;
  });
}

function folderPeople(folder: FolderItem) {
  return uniquePeople([
    ...(folder.owners ?? []),
    ...(folder.sharedUsers ?? [])
  ]);
}

function peopleLabel(people: PersonMetadata[] = []) {
  const unique = uniquePeople(people);
  const first = unique[0];

  if (!first) {
    return "--";
  }

  return unique.length === 1 ? first.name : `${first.name} +${unique.length - 1}`;
}

function folderPathLabel(folder: FolderItem) {
  const path: string[] = [folder.name];
  let cursor = folder.parentId
    ? folders.value.find(item => String(item.id) === String(folder.parentId)) ?? null
    : null;

  while (cursor) {
    path.unshift(cursor.name);
    cursor = cursor.parentId
      ? folders.value.find(item => String(item.id) === String(cursor?.parentId)) ?? null
      : null;
  }

  return path.join(" / ");
}

function fileKind(fileName: string) {
  if (isImageFile(fileName)) return "image";
  if (isVideoFile(fileName)) return "video";
  if (isAudioFile(fileName)) return "audio";
  if (isPdfFile(fileName) || isDocumentFile(fileName) || isSpreadsheetFile(fileName) || isTextFile(fileName)) return "document";
  return "other";
}

function fileTypeLabel(fileName: string) {
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toUpperCase() : "";
  return extension || t('dashboard.fileType');
}

function fileIcon(fileName: string) {
  if (isImageFile(fileName)) return FileImage;
  if (isVideoFile(fileName)) return FileVideo;
  if (isAudioFile(fileName)) return FileAudio;
  if (isSpreadsheetFile(fileName)) return FileSpreadsheet;
  if (isPdfFile(fileName) || isDocumentFile(fileName) || isTextFile(fileName)) return FileText;
  if (/\.(zip|tar|gz|rar|7z)$/i.test(fileName)) return FileArchive;
  return FileIcon;
}

function previewUrl(file: any) {
  return `/api/preview/${file.id}`;
}

function canPreviewFile(fileName?: string | null) {
  return isPreviewableFile(fileName ?? "");
}

function updatePreviewPosition(event: MouseEvent) {
  const padding = 16;
  const availableWidth = window.innerWidth - padding * 2;
  const width = Math.min(384, availableWidth, Math.max(240, Math.round(window.innerWidth * 0.32)));
  const previewHeight = Math.min(256, Math.max(176, Math.round(window.innerHeight * 0.38)));
  let left = event.clientX + 16;
  let top = event.clientY + 16;

  if (left + width > window.innerWidth - padding) {
    left = event.clientX - width - 16;
  }

  if (top + previewHeight > window.innerHeight - padding) {
    top = event.clientY - previewHeight - 16;
  }

  previewStyle.value = {
    left: `${Math.max(padding, left)}px`,
    top: `${Math.max(padding, top)}px`,
    width: `${width}px`,
    "--preview-height": `${previewHeight}px`
  };
}

function openFilePreview(file: any, event: MouseEvent) {
  if (!canPreviewFile(file?.fileName)) {
    return;
  }

  cancelHidePreview();
  previewFile.value = file;
  updatePreviewPosition(event);
}

function moveFilePreview(event: MouseEvent) {
  if (previewFile.value) {
    updatePreviewPosition(event);
  }
}

function cancelHidePreview() {
  if (hidePreviewTimeout) {
    clearTimeout(hidePreviewTimeout);
    hidePreviewTimeout = null;
  }
}

function scheduleHidePreview() {
  cancelHidePreview();
  hidePreviewTimeout = setTimeout(() => {
    previewFile.value = null;
  }, 120);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "--";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleString();
}

function compareRows(a: any, b: any) {
  if (a.kind !== b.kind) {
    return a.kind === "folder" ? -1 : 1;
  }

  const direction = sortDirection.value === "asc" ? 1 : -1;
  const aValue = sortBy.value === "size" ? a.size : sortBy.value === "date" ? a.date : sortBy.value === "type" ? a.typeLabel : a.name;
  const bValue = sortBy.value === "size" ? b.size : sortBy.value === "date" ? b.date : sortBy.value === "type" ? b.typeLabel : b.name;

  if (typeof aValue === "number" && typeof bValue === "number") {
    return (aValue - bValue) * direction;
  }

  return String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: "base" }) * direction;
}

function toggleSortDirection() {
  sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
}

function fileDetailsLocation(file: any) {
  return {
    path: `/view/${file.id}`,
    query: selectedFolderId.value ? { folderId: selectedFolderId.value } : {}
  };
}

function downloadFile(file: any) {
  const a = document.createElement("a");
  a.href = `/api/download/${file.id}`;
  a.download = file.fileName || "download";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function deleteFile(file: any) {
  if (!confirm(`Delete "${file.fileName}"? This cannot be undone.`)) {
    return;
  }

  await $fetch(`/api/files/delete/${file.id}`, {
    method: "POST"
  });
  removeUpload(file.id);
}

function openMoveDialog(kind: "file" | "folder", item: any) {
  moveKind.value = kind;
  moveItem.value = item;
  moveTargetFolderId.value = kind === "file"
    ? String(item.folderId ?? "")
    : String(item.parentId ?? "");
  moveError.value = "";
  showMoveDialog.value = true;
}

async function moveSelectedItem() {
  if (!moveKind.value || !moveItem.value) {
    return;
  }

  moveError.value = "";

  try {
    if (moveKind.value === "file") {
      await $fetch(`/api/files/move/${moveItem.value.id}`, {
        method: "POST",
        body: {
          folderId: moveTargetFolderId.value || null
        }
      });
    } else {
      await $fetch(`/api/folders/move/${moveItem.value.id}`, {
        method: "POST",
        body: {
          parentId: moveTargetFolderId.value || null
        }
      });
    }

    showMoveDialog.value = false;
    moveKind.value = null;
    moveItem.value = null;
    await refreshDashboard();
  } catch (err: any) {
    moveError.value = err?.data?.statusMessage || err?.statusMessage || "Could not move item";
  }
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
  loadColumnWidths();
  dashboardRefreshTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      refreshDashboard();
    }
  }, 5000);

  window.addEventListener("focus", refreshDashboard);
  document.addEventListener("visibilitychange", onVisibilityChange);
});

onBeforeUnmount(() => {
  cancelHidePreview();
  window.removeEventListener("pointermove", resizeColumn);
  window.removeEventListener("pointerup", stopColumnResize);
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

<style scoped>
.dashboard-table-row {
  grid-template-columns: var(--name-col, 320px) var(--type-col, 112px) var(--people-col, 180px) var(--size-col, 96px) var(--date-col, 160px) var(--actions-col, 132px);
  column-gap: 0.75rem;
  min-width: max-content;
}

.resizable-header {
  position: relative;
  min-width: 0;
  padding-right: 0.5rem;
}

.column-resizer {
  bottom: -0.5rem;
  cursor: col-resize;
  position: absolute;
  right: -0.375rem;
  top: -0.5rem;
  width: 0.75rem;
}

.column-resizer::after {
  background: rgb(161 161 170 / 0.75);
  content: "";
  display: block;
  height: 100%;
  margin-inline: auto;
  width: 1px;
}

@media (max-width: 900px) {
  .dashboard-table-row {
    grid-template-columns: var(--name-col, 320px) var(--type-col, 112px) var(--people-col, 180px) var(--size-col, 96px) var(--actions-col, 132px);
  }

  .date-col {
    display: none;
  }
}

@media (max-width: 640px) {
  .dashboard-table-row {
    grid-template-columns: minmax(0, 1fr) minmax(3.75rem, 0.24fr) 6.75rem;
    column-gap: 0.5rem;
  }

  .people-col,
  .size-col {
    display: none;
  }
}

@supports (-moz-appearance: none) {
  :global(.dark) .dashboard-table-actions :deep(svg) {
    color: white;
    stroke: currentColor;
  }
}
</style>
