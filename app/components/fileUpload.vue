<template>
  <div class="upload-root">
    <label
      class="upload-dropzone flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 px-4 text-center transition hover:bg-zinc-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      :class="{ 'border-blue-500 bg-blue-50 dark:bg-blue-950/30': dragging }"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop">
      <UploadCloud class="mb-2 h-7 w-7 text-zinc-500 dark:text-zinc-400" />
      <p class="max-w-full text-sm font-medium text-zinc-700 dark:text-zinc-200">
        {{ uploadItems.length ? t('dashboard.uploadFilesSelected', { count: uploadItems.length }) : t('dashboard.uploadFileModalDescription') }}
      </p>
      <p class="mt-1 max-w-full text-xs text-zinc-500 dark:text-zinc-400">
        {{ t('dashboard.uploadDropHint') }}
      </p>
      <input type="file" multiple class="hidden" @change="onFileChange" />
    </label>

    <div v-if="uploadItems.length" class="upload-list mt-3 max-h-44 space-y-2 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-neutral-700">
      <div v-for="item in uploadItems" :key="item.id" class="upload-file-row flex items-center gap-3 text-sm">
        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 items-center justify-between gap-2">
            <span class="upload-file-name text-zinc-800 dark:text-zinc-100">{{ item.file.name }}</span>
            <span class="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
              {{ fileStatusLabel(item) }}
            </span>
          </div>
          <div v-if="item.status === 'uploading' || item.status === 'done'" class="mt-1 h-1.5 overflow-hidden rounded bg-zinc-200 dark:bg-neutral-800">
            <div class="h-full bg-blue-500 transition-[width]" :style="{ width: `${item.progress}%` }"></div>
          </div>
          <p v-if="item.status === 'error'" class="mt-1 text-xs text-red-500">{{ item.error }}</p>
        </div>
        <Button v-if="!uploading" variant="ghost" class="h-8 w-8 px-0" @click.prevent="removeItem(item.id)">
          <X class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <div class="upload-actions mt-2 flex gap-2">
      <Button class="flex-1 bg-zinc-300 font-medium text-zinc-800 hover:bg-zinc-400" :disabled="pendingUploadCount === 0 || uploading"
      @click="upload">
        {{ uploading ? t('dashboard.uploadingFiles', { count: activeUploadCount, progress: uploadProgress }) : t('dashboard.uploadFileModalButton') }}
      </Button>
      <Button v-if="uploadItems.length && !uploading" variant="ghost" class="shrink-0" @click="clearItems">
        {{ t('dashboard.clearSelection') }}
      </Button>
    </div>

    <div v-if="uploading || uploadProgress > 0" class="mt-3">
      <div class="h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-neutral-800">
        <div class="h-full bg-blue-500 transition-[width]" :style="{ width: `${uploadProgress}%` }"></div>
      </div>
      <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{{ uploadProgress }}%</p>
    </div>

    <p v-if="error" class="text-red-500 text-sm mt-2">{{ error }}</p>

    <p v-if="response" class="text-green-600 text-sm mt-2">
      {{ response }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { UploadCloud, X } from "lucide-vue-next";
import { Button } from "@/components/ui/button";

const {t} = useI18n();
const props = defineProps<{ folderId?: string | null }>();
const emit = defineEmits<{
  (e: "uploaded"): void;
}>();

type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
}

const uploadItems = ref<UploadItem[]>([]);
const response = ref<string | null>(null);
const error = ref<string | null>(null);
const uploading = ref(false);
const uploadProgress = ref(0);
const dragging = ref(false);

const pendingUploadCount = computed(() =>
  uploadItems.value.filter((item) => item.status === "queued" || item.status === "error").length
);

const activeUploadCount = computed(() =>
  uploadItems.value.filter((item) => item.status === "uploading").length
);

function newItemId(file: File) {
  const randomId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${file.name}-${file.size}-${file.lastModified}-${randomId}`;
}

function addFiles(files: FileList | File[]) {
  const nextFiles = Array.from(files);

  if (nextFiles.length === 0) {
    return;
  }

  uploadItems.value = [
    ...uploadItems.value,
    ...nextFiles.map((file) => ({
      id: newItemId(file),
      file,
      progress: 0,
      status: "queued" as const
    }))
  ];

  response.value = null;
  error.value = null;
  uploadProgress.value = 0;
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;

  if (input.files) {
    addFiles(input.files);
  }

  input.value = "";
}

function onDrop(event: DragEvent) {
  dragging.value = false;

  if (event.dataTransfer?.files) {
    addFiles(event.dataTransfer.files);
  }
}

function removeItem(itemId: string) {
  uploadItems.value = uploadItems.value.filter((item) => item.id !== itemId);
}

function clearItems() {
  uploadItems.value = [];
  response.value = null;
  error.value = null;
  uploadProgress.value = 0;
}

function fileStatusLabel(item: UploadItem) {
  if (item.status === "uploading") {
    return `${item.progress}%`;
  }

  if (item.status === "done") {
    return t('dashboard.uploadDone');
  }

  if (item.status === "error") {
    return t('dashboard.uploadFailed');
  }

  return t('dashboard.uploadQueued');
}

function uploadWithProgress(item: UploadItem) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();

    if (props.folderId) {
      form.append("folderId", props.folderId);
    }

    form.append("file", item.file);

    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        item.progress = Math.min(99, Math.round((event.loaded / event.total) * 100));
        updateOverallProgress();
      }
    };

    xhr.onload = () => {
      let data = null;

      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        item.progress = 100;
        updateOverallProgress();
        resolve(data);
        return;
      }

      reject({
        status: xhr.status,
        data
      });
    };

    xhr.onerror = () => reject({
      status: xhr.status,
      data: null
    });

    xhr.send(form);
  });
}

function uploadErrorMessage(err: any) {
  const data = err?.data;

  if (err?.status === 413 && data?.statusMessage === "MAXIMUM_STORAGE_REACHED") {
    return "You have reached your maximum storage capacity";
  }

  if (err?.status === 413 && data?.statusMessage === "FILE_TOO_LARGE") {
    return "This file is too large to upload";
  }

  return data?.statusMessage || "Upload failed";
}

function updateOverallProgress() {
  if (uploadItems.value.length === 0) {
    uploadProgress.value = 0;
    return;
  }

  const totalProgress = uploadItems.value.reduce((total, item) => total + item.progress, 0);
  uploadProgress.value = Math.round(totalProgress / uploadItems.value.length);
}

async function upload() {
  const queue = uploadItems.value.filter((item) => item.status === "queued" || item.status === "error");

  if (queue.length === 0) {
    return;
  }

  let cursor = 0;
  let uploadedCount = 0;
  let failedCount = 0;

  try {
    uploading.value = true;
    response.value = null;
    error.value = null;
    uploadProgress.value = 0;

    const worker = async () => {
      while (cursor < queue.length) {
        const item = queue[cursor];
        cursor += 1;

        item.status = "uploading";
        item.progress = 0;
        item.error = undefined;
        updateOverallProgress();

        try {
          await uploadWithProgress(item);
          item.status = "done";
          item.progress = 100;
          uploadedCount += 1;
          emit("uploaded");
        } catch (err) {
          item.status = "error";
          item.error = uploadErrorMessage(err);
          item.progress = 0;
          failedCount += 1;
        }

        updateOverallProgress();
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(3, queue.length) }, () => worker())
    );

    if (uploadedCount > 0) {
      response.value = t('dashboard.uploadFilesSuccessMessage', { count: uploadedCount });
    }

    if (failedCount > 0) {
      error.value = t('dashboard.uploadFilesFailedMessage', { count: failedCount });
    } else {
      uploadItems.value = [];
    }

  } finally {
    uploading.value = false;
    updateOverallProgress();
  }
}
</script>

<style scoped>
.upload-root {
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
}

.upload-dropzone,
.upload-list,
.upload-file-row {
  max-width: 100%;
  min-width: 0;
}

.upload-list {
  overflow-x: hidden;
}

.upload-file-name {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 480px) {
  .upload-dropzone {
    height: 8rem;
    padding-inline: 0.75rem;
  }

  .upload-file-row {
    align-items: flex-start;
    gap: 0.5rem;
  }

  .upload-actions {
    flex-direction: column;
  }

  .upload-actions :deep(button) {
    width: 100%;
  }
}
</style>
