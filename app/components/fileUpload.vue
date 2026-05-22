<template>
  <div>
    <!-- File Input -->
    <label
      class="flex flex-col items-center justify-center w-full h-32 border border-dashed border-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-100 transition">
      <p class="text-zinc-600">
        {{ file ? file.name : t('dashboard.uploadFileModalDescription') }}
      </p>
      <input type="file" class="hidden" @change="onFileChange" />
    </label>

    <!-- Upload Button -->
    <Button class="w-full mt-2 bg-zinc-300 hover:bg-zinc-400 text-zinc-800 font-medium" :disabled="!file || uploading"
      @click="upload">
      {{ uploading ? `Uploading ${uploadProgress}%` : t('dashboard.uploadFileModalButton') }}
    </Button>

    <div v-if="uploading || uploadProgress > 0" class="mt-3">
      <div class="h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-neutral-800">
        <div class="h-full bg-blue-500 transition-[width]" :style="{ width: `${uploadProgress}%` }"></div>
      </div>
      <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{{ uploadProgress }}%</p>
    </div>

    <!-- Error -->
    <p v-if="error" class="text-red-500 text-sm mt-2">{{ error }}</p>

    <!-- Success / Verification -->
    <p v-if="response" class="text-green-600 text-sm mt-2">
      {{ t('dashboard.uploadFileSuccessMessage', { fileName: response.fileName || file?.name }) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
const {t} = useI18n();
const props = defineProps<{ folderId?: string | null }>();
const emit = defineEmits<{
  (e: "uploaded"): void;
}>();

const file = ref(null);
const response = ref(null);
const error = ref(null);
const uploading = ref(false);
const uploadProgress = ref(0);

function onFileChange(e) {
  file.value = e.target.files[0];
  response.value = null;
  error.value = null;
  uploadProgress.value = 0;
}

function uploadWithProgress(form) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        uploadProgress.value = Math.min(99, Math.round((event.loaded / event.total) * 100));
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
        uploadProgress.value = 100;
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

async function upload() {
  try {
    uploading.value = true;
    uploadProgress.value = 0;

    const form = new FormData();
    if (props.folderId) {
      form.append("folderId", props.folderId);
    }
    form.append("file", file.value);

    const data = await uploadWithProgress(form);

    response.value = data;
    error.value = null;
    emit("uploaded");
  } catch (err) {
    const data = err?.data;

    if (err?.status === 413 && data?.statusMessage === "MAXIMUM_STORAGE_REACHED") {
      error.value = "You have reached your maximum storage capacity";
    } else if (err?.status === 413 && data?.statusMessage === "FILE_TOO_LARGE") {
      error.value = "This file is too large to upload";
    } else {
      error.value = data?.statusMessage || "Upload failed";
    }

    response.value = null;
  } finally {
    uploading.value = false;
    file.value = null;
  }
}
</script>
