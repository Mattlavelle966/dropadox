<template>
    <div class="h-full">
        <div class="flex h-full grow bg-zinc-100 dark:bg-neutral-800/95">
            <DashboardSidebar :folders="folders" :selected-folder-id="selectedFolderId"
                @select-folder="selectFolder" @folder-created="addFolder" @folder-updated="updateFolder"
                @folder-deleted="removeFolder">
                <div class="border border-zinc-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white/80 flex flex-col gap-4">
                    <h1 class="border-b border-zinc-300 pb-3 text-2xl font-bold dark:border-neutral-700">{{t("view.fileDetails.title")}}</h1>
                    <img v-if="isImage" :src="previewUrl" :alt="upload.fileName"
                        class="max-h-[60vh] w-full object-contain bg-zinc-100 dark:bg-neutral-900" />
                    <video v-else-if="isVideo" :src="previewUrl" class="max-h-[60vh] w-full bg-black" controls />
                    <audio v-else-if="isAudio" :src="previewUrl" class="w-full" controls />
                    <iframe v-else-if="isPdf" :src="previewUrl" class="h-[70vh] w-full border border-zinc-300 bg-white [color-scheme:light] dark:border-zinc-300" />
                    <iframe v-else-if="isHtmlPreview" :src="previewUrl" class="h-[70vh] w-full border border-zinc-300 bg-white [color-scheme:light] dark:border-zinc-300" sandbox />
                    <div class="grid gap-2 border-y border-zinc-300 py-3 text-sm dark:border-neutral-700">
                        <p>{{t("view.fileDetails.fileId")}}: {{ upload.id }}</p>
                        <p>{{t("view.fileDetails.fileSize")}}: {{ upload.size }} bytes</p>
                        <p>{{t("view.fileDetails.fileName")}}: {{ upload.fileName }}</p>
                        <p>{{t("view.fileDetails.uploadedAt")}}: {{ new Date(upload.createdAt).toLocaleString() }}</p>
                    </div>
                    <Button @click="download" class="bg-blue-500 hover:bg-blue-400 cursor-pointer hover:scale-[101%]"
                        :disabled="downloading">
                        <Download />
                        {{t("common.words.download")}}
                    </Button>
                    <p v-if="downloadMessage"
                        class="border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                        {{ downloadMessage }}
                    </p>
                </div>
            </DashboardSidebar>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Download } from 'lucide-vue-next';
import { isAudioFile, isHtmlPreviewFile, isImageFile, isPdfFile, isVideoFile } from '~~/shared/utils/fileType';
const {t} = useI18n();
const { fileId } = useRoute().params;

let fileUpload;

try {
    fileUpload = await $fetch.raw(`/api/files/get/${fileId}`, {
        method: "post"
    });
} catch (err: any) {
    if (err?.statusCode === 401 || err?.status === 401) {
        await navigateTo("/login");
    } else {
        await navigateTo("/dashboard");
    }
}

if(!fileUpload){
    await navigateTo("/dashboard");
}


const upload = (fileUpload._data as any).upload;
const previewUrl = `/api/preview/${fileId}`;
const isImage = isImageFile(upload.fileName);
const isVideo = isVideoFile(upload.fileName);
const isAudio = isAudioFile(upload.fileName);
const isPdf = isPdfFile(upload.fileName);
const isHtmlPreview = isHtmlPreviewFile(upload.fileName);
const selectedFolderId = ref<string | null>(upload.folderId ? String(upload.folderId) : null);
const downloading = ref(false);
const downloadMessage = ref("");
let downloadMessageTimeout: ReturnType<typeof setTimeout> | null = null;

const folderData = await $fetch<{ folders: Array<{ id: number; name: string }> }>("/api/folders/list", {
    method: "POST"
});

const folders = ref(folderData.folders ?? []);

async function selectFolder(folderId: string | null) {
    await navigateTo({
        path: "/dashboard",
        query: folderId ? { folderId } : {}
    });
}

function addFolder(folder: { id: number; name: string; iconUrl?: string | null }) {
    folders.value = [...folders.value, folder];
}

function updateFolder(folder: { id: number; name: string; iconUrl?: string | null }) {
    folders.value = folders.value.map(existingFolder =>
        existingFolder.id === folder.id ? { ...existingFolder, ...folder } : existingFolder
    );
}

function removeFolder(folderId: number) {
    folders.value = folders.value.filter(folder => folder.id !== folderId);

    if (selectedFolderId.value === String(folderId)) {
        selectedFolderId.value = null;
        navigateTo("/dashboard");
    }
}

async function download() {
    if (downloading.value) {
        return;
    }

    downloading.value = true;
    downloadMessage.value = `Preparing download for "${upload.fileName || "file"}"...`;

    try {
        const a = document.createElement("a");
        a.href = `/api/download/${fileId}`;
        a.download = upload.fileName || "download";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        downloadMessage.value = `Download started for "${upload.fileName || "file"}".`;
    } catch (err) {
        console.error("Download error:", err);
        downloadMessage.value = "Download could not be started.";
    } finally {
        downloading.value = false;
        if (downloadMessageTimeout) {
            clearTimeout(downloadMessageTimeout);
        }
        downloadMessageTimeout = setTimeout(() => {
            downloadMessage.value = "";
        }, 3500);
    }
}

onBeforeUnmount(() => {
    if (downloadMessageTimeout) {
        clearTimeout(downloadMessageTimeout);
    }
});

useHead({
  title: t("common.siteName") + " - " + upload.fileName
})

</script>
