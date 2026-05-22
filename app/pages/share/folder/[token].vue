<template>
  <div class="min-h-dvh bg-zinc-100 p-6 dark:bg-neutral-900">
    <main class="mx-auto flex max-w-3xl flex-col gap-4">
      <header class="border-b border-zinc-300 pb-4 dark:border-neutral-700">
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">{{ folder.name }}</h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ uploads.length }} files</p>
      </header>

      <div class="flex flex-col gap-3">
        <div v-for="upload in uploads" :key="upload.id"
          class="flex items-center justify-between rounded-md bg-white p-4 shadow-sm dark:bg-neutral-800 dark:text-white">
          <div class="min-w-0">
            <p class="truncate font-medium">{{ getFileName(upload.filePath ?? '') }}</p>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ upload.size ?? 0 }} bytes</p>
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
import { Download } from "lucide-vue-next";
import { getFileName } from "~~/shared/utils/getFileName";

const route = useRoute();
const token = String(route.params.token);

const data = await $fetch<{
  folder: { id: number; name: string };
  uploads: Array<{ id: number; filePath?: string; size?: number }>;
}>(`/api/public/folders/${token}`);

const folder = data.folder;
const uploads = data.uploads;

async function download(upload: { id: number; filePath?: string }) {
  const res = await fetch(`/api/public/download/${token}/${upload.id}`);

  if (!res.ok) {
    return;
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = getFileName(upload.filePath ?? "") || "download";
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
