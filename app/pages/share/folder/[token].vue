<template>
  <div class="min-h-dvh bg-zinc-100 p-4 dark:bg-neutral-900">
    <main class="mx-auto flex max-w-3xl flex-col gap-4">
      <form v-if="passwordRequired" class="mt-16 flex flex-col gap-3 border border-zinc-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-950"
        @submit.prevent="unlockShare">
        <h1 class="text-xl font-bold text-zinc-900 dark:text-white">Password required</h1>
        <Input v-model="sharePassword" type="password" placeholder="Folder password" />
        <Button class="cursor-pointer" type="submit" :disabled="unlocking || !sharePassword">
          Unlock folder
        </Button>
        <p v-if="unlockError" class="text-sm text-red-500">{{ unlockError }}</p>
      </form>

      <template v-else>
      <header class="border-b border-zinc-300 pb-4 dark:border-neutral-700">
        <div class="flex items-center gap-3">
          <img v-if="folder.iconUrl" :src="folder.iconUrl" :alt="folder.name"
            class="h-12 w-12 object-cover" />
          <div v-else class="flex h-12 w-12 items-center justify-center bg-white dark:bg-neutral-800">
            <Folder class="h-6 w-6 text-zinc-500" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">{{ folder.name }}</h1>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ uploads.length }} files</p>
          </div>
        </div>
      </header>

      <div class="flex flex-col gap-3">
        <div v-for="upload in uploads" :key="upload.id"
          class="flex items-center justify-between gap-4 border border-zinc-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <img v-if="isImageFile(upload.fileName ?? '')" :src="publicPreviewUrl(upload)"
              :alt="upload.fileName" class="h-12 w-12 object-cover" loading="lazy" />
            <video v-else-if="isVideoFile(upload.fileName ?? '')" :src="publicPreviewUrl(upload)"
              class="h-20 w-32 bg-black" controls />
            <audio v-else-if="isAudioFile(upload.fileName ?? '')" :src="publicPreviewUrl(upload)" class="w-32" controls />
            <iframe v-else-if="isPdfFile(upload.fileName ?? '')" :src="publicPreviewUrl(upload)" class="h-20 w-32 border border-zinc-300 bg-white [color-scheme:light] dark:border-zinc-300" />
            <iframe v-else-if="isHtmlPreviewFile(upload.fileName ?? '')" :src="publicPreviewUrl(upload)" class="h-20 w-32 border border-zinc-300 bg-white [color-scheme:light] dark:border-zinc-300" sandbox />
            <File v-else class="h-8 w-8 shrink-0" />
            <div class="min-w-0">
            <p class="truncate font-medium">{{ upload.fileName }}</p>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ upload.size ?? 0 }} bytes</p>
            </div>
          </div>

          <div class="flex shrink-0 flex-col items-end gap-2">
            <Button class="cursor-pointer" @click="download(upload)" :disabled="downloadingFileId === upload.id">
              <Download />
              Download
            </Button>
            <p v-if="downloadMessage && downloadingFileId === upload.id"
              class="max-w-56 border border-blue-200 bg-blue-50 px-3 py-2 text-right text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
              {{ downloadMessage }}
            </p>
          </div>
        </div>

        <p v-if="uploads.length === 0" class="text-zinc-500 dark:text-zinc-400">This folder is empty.</p>
      </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Download, File, Folder } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isAudioFile, isHtmlPreviewFile, isImageFile, isPdfFile, isVideoFile } from "~~/shared/utils/fileType";

const route = useRoute();
const token = String(route.params.token);

type PublicFolderData = {
  folder: { id: number; name: string; iconUrl?: string | null };
  uploads: Array<{ id: number; fileName?: string; size?: number }>;
};

const folderData = ref<PublicFolderData | null>(null);
const passwordRequired = ref(false);
const sharePassword = ref("");
const unlocking = ref(false);
const unlockError = ref("");
const downloadingFileId = ref<number | null>(null);
const downloadMessage = ref("");
let downloadMessageTimeout: ReturnType<typeof setTimeout> | null = null;

await loadFolder();

const folder = computed(() => folderData.value?.folder ?? { id: 0, name: "Shared folder", iconUrl: null });
const uploads = computed(() => folderData.value?.uploads ?? []);

async function loadFolder() {
  try {
    folderData.value = await $fetch<PublicFolderData>(`/api/public/folders/${token}`);
    passwordRequired.value = false;
    unlockError.value = "";
  } catch (err: any) {
    if (err?.statusCode === 401 || err?.data?.statusCode === 401) {
      passwordRequired.value = true;
      return;
    }

    throw err;
  }
}

async function unlockShare() {
  if (!sharePassword.value || unlocking.value) {
    return;
  }

  unlocking.value = true;
  unlockError.value = "";

  try {
    await $fetch(`/api/public/folders/${token}/unlock`, {
      method: "POST",
      body: {
        password: sharePassword.value
      }
    });
    sharePassword.value = "";
    await loadFolder();
  } catch (err: any) {
    unlockError.value = err?.data?.statusMessage || err?.statusMessage || "Could not unlock folder.";
  } finally {
    unlocking.value = false;
  }
}

function publicPreviewUrl(upload: { id: number }) {
  return `/api/public/preview/${token}/${upload.id}`;
}

async function download(upload: { id: number; fileName?: string }) {
  if (downloadingFileId.value === upload.id) {
    return;
  }

  downloadingFileId.value = upload.id;
  downloadMessage.value = `Preparing download for "${upload.fileName || "file"}"...`;

  try {
    const a = document.createElement("a");
    a.href = `/api/public/download/${token}/${upload.id}`;
    a.download = upload.fileName || "download";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    downloadMessage.value = `Download started for "${upload.fileName || "file"}".`;
  } catch {
    downloadMessage.value = "Download could not be started.";
  } finally {
    const fileId = upload.id;
    if (downloadMessageTimeout) {
      clearTimeout(downloadMessageTimeout);
    }
    downloadMessageTimeout = setTimeout(() => {
      if (downloadingFileId.value === fileId) {
        downloadingFileId.value = null;
        downloadMessage.value = "";
      }
    }, 3500);
  }
}

onBeforeUnmount(() => {
  if (downloadMessageTimeout) {
    clearTimeout(downloadMessageTimeout);
  }
});

useHead({
  title: computed(() => `Dropadox - ${folder.value.name}`)
});
</script>
