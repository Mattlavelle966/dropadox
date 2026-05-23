<template>
    <div class="h-full">
        <div class="flex h-full grow bg-zinc-100 dark:bg-neutral-800/95">
            <DashboardSidebar :folders="folders" :selected-folder-id="selectedFolderId"
                @select-folder="selectFolder" @folder-created="addFolder" @folder-deleted="removeFolder">
                <div class="p-4 bg-white dark:bg-neutral-900/60 rounded-lg shadow-md flex flex-col gap-4 dark:text-white/80">
                    <h1 class="text-2xl font-bold mb-4">{{t("view.fileDetails.title")}}</h1>
                    <img v-if="isImage" :src="previewUrl" :alt="upload.fileName"
                        class="max-h-[60vh] w-full rounded object-contain bg-zinc-100 dark:bg-neutral-950" />
                    <video v-else-if="isVideo" :src="previewUrl" class="max-h-[60vh] w-full rounded bg-black" controls />
                    <audio v-else-if="isAudio" :src="previewUrl" class="w-full" controls />
                    <iframe v-else-if="isPdf" :src="previewUrl" class="h-[70vh] w-full rounded border border-zinc-200 bg-white [color-scheme:light] dark:border-zinc-200" />
                    <iframe v-else-if="isHtmlPreview" :src="previewUrl" class="h-[70vh] w-full rounded border border-zinc-200 bg-white [color-scheme:light] dark:border-zinc-200" sandbox />
                    <p>{{t("view.fileDetails.fileId")}}: {{ upload.id }}</p>
                    <p>{{t("view.fileDetails.fileSize")}}: {{ upload.size }} bytes</p>
                    <p>{{t("view.fileDetails.fileName")}}: {{ upload.fileName }}</p>
                    <p>{{t("view.fileDetails.uploadedAt")}}: {{ new Date(upload.createdAt).toLocaleString() }}</p>
                    <Button @click="download" class="bg-blue-500 hover:bg-blue-400 cursor-pointer hover:scale-[101%]">
                        <Download />
                        {{t("common.words.download")}}
                    </Button>
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

function addFolder(folder: { id: number; name: string }) {
    folders.value = [...folders.value, folder];
}

function removeFolder(folderId: number) {
    folders.value = folders.value.filter(folder => folder.id !== folderId);

    if (selectedFolderId.value === String(folderId)) {
        selectedFolderId.value = null;
        navigateTo("/dashboard");
    }
}

async function download() {
    try {
        const res = await fetch(`/api/download/${fileId}`, {
            method: "GET"
        });

        if (!res.ok) {
            console.error("Download failed:", res.status);
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
    } catch (err) {
        console.error("Download error:", err);
    }
}

useHead({
  title: t("common.siteName") + " - " + upload.fileName
})

</script>
