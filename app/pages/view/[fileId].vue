<template>
    <div class="h-full">
        <div class="flex h-full grow bg-zinc-100 dark:bg-neutral-800/95">
            <DashboardSidebar :folders="folders" :selected-folder-id="selectedFolderId"
                @select-folder="selectFolder" @folder-created="addFolder" @folder-deleted="removeFolder">
                <div class="p-4 bg-white dark:bg-neutral-900/60 rounded-lg shadow-md flex flex-col gap-2 dark:text-white/80">
                    <h1 class="text-2xl font-bold mb-4">{{t("view.fileDetails.title")}}</h1>
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
