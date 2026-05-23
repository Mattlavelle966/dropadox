<template>
    <div ref="fileCard"
        class="relative bg-neutral-200 dark:bg-neutral-900/60 hover:dark:bg-blue-500/30 p-4 rounded-xl hover:bg-neutral-300 transition-colors duration-200 cursor-pointer"
        :key="fileId" @mouseenter="openPreview" @mouseleave="scheduleHidePreview" @focusin="openPreview"
        @focusout="scheduleHidePreview">
        <div class="flex justify-between dark:text-white/60" @click="openDetails">
            <div class="flex gap-4 items-center font-bold dark:text-white/80">
                <img v-if="isImage" :src="previewUrl" :alt="props.fileName"
                    class="h-10 w-10 rounded object-cover" loading="lazy" />
                <FileVideo v-else-if="isVideo" />
                <FileAudio v-else-if="isAudio" />
                <FileSpreadsheet v-else-if="isSpreadsheet" />
                <FileText v-else-if="isPdf" />
                <FileText v-else-if="isDocument || isText" />
                <File v-else />
                {{ props.fileName }}
            </div>

            <div class="flex gap-4">

                <NuxtLink :to="detailsLocation" class="cursor-pointer hover:text-blue-400" @click.stop>
                    <div class="ml-auto text-sm">
                        <Eye />
                    </div>
                </NuxtLink>

                <button @click="(e) => {e.stopPropagation(); download(); }" class="cursor-pointer hover:text-blue-400"
                    :disabled="downloading">
                    <Download />
                </button>

                <button @click="deleteFile" class="cursor-pointer hover:text-red-400" :disabled="deleting">
                    <Trash2 />
                </button>
            </div>
        </div>

        <p v-if="downloadMessage"
            class="absolute right-3 top-12 z-10 rounded-md bg-zinc-950 px-3 py-2 text-xs text-white shadow-lg dark:bg-white dark:text-zinc-950">
            {{ downloadMessage }}
        </p>

        <ClientOnly>
            <Teleport to="body">
                <div v-if="showPreview && canPreview" :style="previewStyle" @mouseenter="cancelHidePreview"
                    @mouseleave="scheduleHidePreview"
                    class="fixed z-[1000] overflow-hidden rounded-lg border border-zinc-300 bg-white text-zinc-950 shadow-2xl [color-scheme:light]">
                    <img v-if="isImage" :src="previewUrl" :alt="props.fileName"
                        class="max-h-72 w-full object-contain bg-white" loading="lazy" />
                    <video v-else-if="isVideo" :src="previewUrl" class="max-h-72 w-full bg-black" muted
                        preload="metadata" />
                    <div v-else-if="isAudio" class="p-3">
                        <audio :src="previewUrl" class="w-full" controls preload="metadata" />
                    </div>
                    <iframe v-else-if="isPdf" :src="previewUrl" class="h-72 w-full bg-white [color-scheme:light]" />
                    <iframe v-else :src="previewUrl" class="h-72 w-full bg-white [color-scheme:light]" sandbox />
                </div>
            </Teleport>
        </ClientOnly>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { File, FileAudio, FileSpreadsheet, FileText, FileVideo, Download, Eye, Trash2 } from 'lucide-vue-next';
import { isAudioFile, isDocumentFile, isImageFile, isPdfFile, isPreviewableFile, isSpreadsheetFile, isTextFile, isVideoFile } from '~~/shared/utils/fileType';

const props = defineProps<{ fileId: number; fileName: string; folderId?: string | null }>();
const emit = defineEmits<{
    (e: 'deleted', fileId: number): void
}>();
const deleting = ref(false);
const downloading = ref(false);
const downloadMessage = ref("");
const fileCard = ref<HTMLElement | null>(null);
const showPreview = ref(false);
const previewStyle = ref<Record<string, string>>({});
let hidePreviewTimeout: ReturnType<typeof setTimeout> | null = null;
let downloadMessageTimeout: ReturnType<typeof setTimeout> | null = null;
const previewUrl = computed(() => `/api/preview/${props.fileId}`);
const isImage = computed(() => isImageFile(props.fileName));
const isVideo = computed(() => isVideoFile(props.fileName));
const isAudio = computed(() => isAudioFile(props.fileName));
const isPdf = computed(() => isPdfFile(props.fileName));
const isDocument = computed(() => isDocumentFile(props.fileName));
const isSpreadsheet = computed(() => isSpreadsheetFile(props.fileName));
const isText = computed(() => isTextFile(props.fileName));
const canPreview = computed(() => isPreviewableFile(props.fileName));
const detailsLocation = computed(() => ({
    path: `/view/${props.fileId}`,
    query: props.folderId ? { folderId: props.folderId } : {}
}));

function updatePreviewPosition() {
    if (!showPreview.value || !fileCard.value) {
        return;
    }

    const padding = 16;
    const previewHeight = 304;
    const rowRect = fileCard.value.getBoundingClientRect();
    const width = Math.min(448, window.innerWidth - padding * 2);
    let left = Math.min(rowRect.left, window.innerWidth - width - padding);
    let top = rowRect.bottom + 8;

    if (top + previewHeight > window.innerHeight - padding) {
        top = rowRect.top - previewHeight - 8;
    }

    if (top < padding) {
        top = Math.max(padding, window.innerHeight - previewHeight - padding);
    }

    left = Math.max(padding, left);

    previewStyle.value = {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`
    };
}

function cancelHidePreview() {
    if (hidePreviewTimeout) {
        clearTimeout(hidePreviewTimeout);
        hidePreviewTimeout = null;
    }
}

async function openPreview() {
    if (!canPreview.value) {
        return;
    }

    cancelHidePreview();
    showPreview.value = true;
    await nextTick();
    updatePreviewPosition();
}

function scheduleHidePreview() {
    cancelHidePreview();
    hidePreviewTimeout = setTimeout(() => {
        showPreview.value = false;
    }, 120);
}

function openDetails() {
    navigateTo(detailsLocation.value);
}

async function download() {
    if (downloading.value) {
        return;
    }

    downloading.value = true;
    downloadMessage.value = `Preparing download for "${props.fileName || "file"}"...`;

    try {
        const a = document.createElement("a");
        a.href = `/api/download/${props.fileId}`;
        a.download = props.fileName || "download";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        downloadMessage.value = `Download started for "${props.fileName || "file"}".`;
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

onMounted(() => {
    window.addEventListener("resize", updatePreviewPosition);
    window.addEventListener("scroll", updatePreviewPosition, true);
});

onBeforeUnmount(() => {
    cancelHidePreview();
    if (downloadMessageTimeout) {
        clearTimeout(downloadMessageTimeout);
    }
    window.removeEventListener("resize", updatePreviewPosition);
    window.removeEventListener("scroll", updatePreviewPosition, true);
});

</script>
