<template>
  <div class="h-full">
    <div class="flex h-full grow bg-zinc-100 dark:bg-neutral-800/95">

      <DashboardSidebar v-model:search="searchQuery" :folders="folders" :selected-folder-id="selectedFolderId"
        @select-folder="selectFolder" @folder-created="addFolder" @folder-deleted="removeFolder" @uploaded="refreshUploads">
        <FileCard v-for="fileUpload in filteredUploads" :key="fileUpload.id" :file-id="fileUpload.id"
          :file-name="getFileName(fileUpload.filePath ?? '')" :folder-id="selectedFolderId" @deleted="removeUpload" />
      </DashboardSidebar>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import DashboardSidebar from "@/components/DashboardSidebar.vue"; // make sure to import it
import { getFileName } from '~~/shared/utils/getFileName';

const {t} = useI18n();
const route = useRoute();
const initialFolderId = typeof route.query.folderId === "string" ? route.query.folderId : null;

// --- Auth check ---
const token = useCookie("token").value;

if (!token) {
  await navigateTo("/login");
}

const { data } = await useFetch("/api/files/fromUser", {
  method: "POST",
  body: {
    token,
    folderId: initialFolderId
  }
});

const { data: folderData } = await useFetch("/api/folders/list", {
  method: "POST",
  body: { token }
});

const userUploads = ref(data.value?.userUploads ?? []);
const folders = ref(folderData.value?.folders ?? []);
const selectedFolderId = ref<string | null>(initialFolderId);

const searchQuery = ref("");

const filteredUploads = computed(() => {
  if (!searchQuery.value) return userUploads.value;
  return userUploads.value.filter(file =>
    getFileName(file.filePath ?? '').toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

function removeUpload(fileId: number) {
  userUploads.value = userUploads.value.filter(file => file.id !== fileId);
}

async function refreshUploads() {
  const data = await $fetch<{ userUploads: any[] }>("/api/files/fromUser", {
    method: "POST",
    body: {
      token,
      folderId: selectedFolderId.value
    }
  });

  userUploads.value = data.userUploads;
}

async function selectFolder(folderId: string | null) {
  selectedFolderId.value = folderId;
  await navigateTo({
    path: "/dashboard",
    query: folderId ? { folderId } : {}
  }, { replace: true });
  await refreshUploads();
}

function addFolder(folder: { id: number; name: string }) {
  folders.value = [...folders.value, folder];
}

async function removeFolder(folderId: number) {
  folders.value = folders.value.filter(folder => folder.id !== folderId);

  if (selectedFolderId.value === String(folderId)) {
    selectedFolderId.value = null;
    await refreshUploads();
  }
}

useHead({
  title: t("common.siteName") + " - " + t("dashboard.title")
})
</script>
