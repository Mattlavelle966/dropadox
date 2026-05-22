<template>
    <div class="bg-neutral-200 dark:bg-neutral-900/60 hover:dark:bg-blue-500/30 p-4 rounded-xl hover:bg-neutral-300 transition-colors duration-200 cursor-pointer"
        :key="fileId">
        <div class="flex justify-between dark:text-white/60" @click="openDetails">
            <div class="flex gap-4 items-center font-bold dark:text-white/80">
                <File />
                {{ props.fileName }}
            </div>

            <div class="flex gap-4">

                <NuxtLink :to="detailsLocation" class="cursor-pointer hover:text-blue-400" @click.stop>
                    <div class="ml-auto text-sm">
                        <Eye />
                    </div>
                </NuxtLink>

                <button @click="(e) => {e.stopPropagation(); download(); }" class="cursor-pointer hover:text-blue-400">
                    <Download />
                </button>

                <button @click="deleteFile" class="cursor-pointer hover:text-red-400" :disabled="deleting">
                    <Trash2 />
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { File, Download, Eye, Trash2 } from 'lucide-vue-next';

const props = defineProps<{ fileId: number; fileName: string; folderId?: string | null }>();
const emit = defineEmits<{
    (e: 'deleted', fileId: number): void
}>();
const deleting = ref(false);
const detailsLocation = computed(() => ({
    path: `/view/${props.fileId}`,
    query: props.folderId ? { folderId: props.folderId } : {}
}));

function openDetails() {
    navigateTo(detailsLocation.value);
}

async function download() {
    try {
        const res = await fetch(`/api/download/${props.fileId}`, {
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
        a.download = props.fileName || "download";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Download error:", err);
    }
}

async function deleteFile(event: MouseEvent) {
    event.stopPropagation();

    if (deleting.value) {
        return;
    }

    if (!confirm(`Delete "${props.fileName}"? This cannot be undone.`)) {
        return;
    }

    deleting.value = true;

    try {
        const res = await fetch(`/api/files/delete/${props.fileId}`, {
            method: "POST",
            headers: {
                "content-type": "application/json"
            }
        });

        if (!res.ok) {
            console.error("Delete failed:", res.status);
            return;
        }

        emit("deleted", props.fileId);
    } catch (err) {
        console.error("Delete error:", err);
    } finally {
        deleting.value = false;
    }
}

</script>
