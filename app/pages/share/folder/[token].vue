<template>
  <div class="min-h-dvh bg-zinc-100 p-6 dark:bg-neutral-900">
    <main class="mx-auto flex max-w-3xl flex-col gap-4">
      <header class="border-b border-zinc-300 pb-4 dark:border-neutral-700">
        <div class="flex items-center gap-3">
          <img v-if="folder.iconUrl" :src="folder.iconUrl" :alt="folder.name"
            class="h-12 w-12 rounded-md object-cover" />
          <div v-else class="flex h-12 w-12 items-center justify-center rounded-md bg-white dark:bg-neutral-800">
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
          class="flex items-center justify-between gap-4 rounded-md bg-white p-4 shadow-sm dark:bg-neutral-800 dark:text-white">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <img v-if="isImageFile(upload.fileName ?? '')" :src="publicPreviewUrl(upload)"
              :alt="upload.fileName" class="h-12 w-12 rounded object-cover" loading="lazy" />
            <video v-else-if="isVideoFile(upload.fileName ?? '')" :src="publicPreviewUrl(upload)"
              class="h-20 w-32 rounded bg-black" controls />
            <audio v-else-if="isAudioFile(upload.fileName ?? '')" :src="publicPreviewUrl(upload)" class="w-32" controls />
            <iframe v-else-if="isPdfFile(upload.fileName ?? '')" :src="publicPreviewUrl(upload)" class="h-20 w-32 rounded border border-zinc-200 bg-white [color-scheme:light] dark:border-zinc-200" />
            <iframe v-else-if="isHtmlPreviewFile(upload.fileName ?? '')" :src="publicPreviewUrl(upload)" class="h-20 w-32 rounded border border-zinc-200 bg-white [color-scheme:light] dark:border-zinc-200" sandbox />
            <File v-else class="h-8 w-8 shrink-0" />
            <div class="min-w-0">
            <p class="truncate font-medium">{{ upload.fileName }}</p>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ upload.size ?? 0 }} bytes</p>
            </div>
          </div>

          <Button class="cursor-pointer" @click="download(upload)">
            <Download />
            Download
          </Button>
        </div>

        <p v-if="uploads.length === 0" class="text-zinc-500 dark:text-zinc-400">This folder is empty.</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Download, File, Folder } from "lucide-vue-next";
import { isAudioFile, isHtmlPreviewFile, isImageFile, isPdfFile, isVideoFile } from "~~/shared/utils/fileType";

const route = useRoute();
const token = String(route.params.token);

const data = await $fetch<{
  folder: { id: number; name: string; iconUrl?: string | null };
  uploads: Array<{ id: number; fileName?: string; size?: number }>;
}>(`/api/public/folders/${token}`);

const folder = data.folder;
const uploads = data.uploads;

function publicPreviewUrl(upload: { id: number }) {
  return `/api/public/preview/${token}/${upload.id}`;
}

async function download(upload: { id: number; fileName?: string }) {
  const res = await fetch(`/api/public/download/${token}/${upload.id}`);

  if (!res.ok) {
    return;
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = upload.fileName || "download";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

useHead({
  title: `Dropadox - ${folder.name}`
});
</script>
