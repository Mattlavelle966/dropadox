<template>
  <div class="min-h-full bg-zinc-100 dark:bg-neutral-900 flex flex-col select-none">

    <main class="home-main mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 dark:text-white/80">
      <section class="home-hero flex min-h-36 flex-col justify-center border-b border-zinc-300 py-8 dark:border-neutral-700">
        <h2 class="text-3xl md:text-4xl font-extrabold text-zinc-950 dark:text-white">
          {{ t("index.h2") }}
        </h2>

        <p class="dark:text-white/60 mt-2 max-w-xl text-base text-zinc-600">
          {{ t("index.tagLine") }}
        </p>
      </section>

      <section class="flex w-full flex-col gap-3 py-4">
        <div class="published-header flex items-center justify-between gap-3 border-b border-zinc-300 pb-2 dark:border-neutral-700">
          <h3 class="text-lg font-bold text-zinc-900 dark:text-white">{{ t("index.publishedFolders") }}</h3>
          <span class="text-sm text-zinc-600 dark:text-zinc-400">{{ t("index.sortedByLikes") }}</span>
        </div>

        <div v-if="publishedFolders.length" class="published-grid flex flex-col">
          <article v-for="folder in publishedFolders" :key="folder.token"
            class="published-card flex min-w-0 flex-col border-x border-b border-zinc-300 bg-white p-4 first:border-t dark:border-neutral-700 dark:bg-neutral-950">
            <div class="flex min-w-0 items-start gap-3">
              <img v-if="folder.folder.iconUrl" :src="folder.folder.iconUrl" :alt="folder.folder.name"
                class="h-12 w-12 object-cover" />
              <div v-else class="flex h-12 w-12 shrink-0 items-center justify-center bg-zinc-200 dark:bg-neutral-800">
                <Folder class="h-6 w-6 opacity-70" />
              </div>
              <div class="min-w-0">
                <h4 class="truncate font-semibold text-zinc-900 dark:text-white">{{ folder.folder.name }}</h4>
                <div class="mt-1 flex min-w-0 items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <img v-if="folder.owner.avatarUrl" :src="folder.owner.avatarUrl" :alt="folder.owner.username"
                    class="h-5 w-5 shrink-0 object-cover" />
                  <span class="truncate">{{ folder.owner.username }}</span>
                </div>
              </div>
            </div>

            <div class="published-markdown mt-3 line-clamp-5 text-sm text-zinc-700 dark:text-zinc-300"
              v-html="folder.markdownHtml || renderSafeMarkdown(t('index.noDescription'))"></div>

            <div class="published-card-footer mt-4 flex items-center justify-between gap-3">
              <NuxtLink :to="folder.url" class="text-sm font-medium text-blue-600 hover:text-blue-500">
                {{ t("index.openFolder") }}
              </NuxtLink>
              <Button variant="ghost" class="h-9 cursor-pointer gap-2" @click="likeFolder(folder)">
                <Heart class="h-4 w-4" />
                {{ folder.likes }}
              </Button>
            </div>
          </article>
        </div>

        <p v-else class="border border-zinc-300 bg-white p-4 text-sm text-zinc-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-zinc-400">
          {{ t("index.noPublishedFolders") }}
        </p>
      </section>
    </main>

    <Footer />

  </div>
</template>
<script setup lang="ts">
import { Folder, Heart } from "lucide-vue-next";
import { renderSafeMarkdown } from "~~/shared/utils/markdown";
import Footer from "~/components/Footer.vue";

const {t} = useI18n();
type PublishedFolder = {
  token: string;
  url: string;
  markdownHtml: string;
  likes: number;
  folder: { id: number; name: string; iconUrl?: string | null };
  owner: { id: number; username: string; avatarUrl?: string | null };
}

const { data: publishedData } = await useFetch<{ folders: PublishedFolder[] }>("/api/public/published-folders");
const publishedFolders = ref<PublishedFolder[]>(publishedData.value?.folders ?? []);
const refreshingPublishedFolders = ref(false);
let publishedRefreshTimer: number | undefined;

async function refreshPublishedFolders() {
  if (refreshingPublishedFolders.value) {
    return;
  }

  try {
    refreshingPublishedFolders.value = true;
    const data = await $fetch<{ folders: PublishedFolder[] }>("/api/public/published-folders");
    publishedFolders.value = data.folders;
  } finally {
    refreshingPublishedFolders.value = false;
  }
}

async function likeFolder(folder: PublishedFolder) {
  const res = await $fetch<{ likes: number }>(`/api/public/published-folders/like/${folder.token}`, {
    method: "POST"
  });

  folder.likes = res.likes;
  publishedFolders.value = [...publishedFolders.value].sort((a, b) => b.likes - a.likes);
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") {
    refreshPublishedFolders();
  }
}

onMounted(() => {
  publishedRefreshTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      refreshPublishedFolders();
    }
  }, 5000);

  window.addEventListener("focus", refreshPublishedFolders);
  document.addEventListener("visibilitychange", onVisibilityChange);
});

onBeforeUnmount(() => {
  if (publishedRefreshTimer) {
    window.clearInterval(publishedRefreshTimer);
  }

  window.removeEventListener("focus", refreshPublishedFolders);
  document.removeEventListener("visibilitychange", onVisibilityChange);
});

useHead({
  title: t("common.siteName") + " - " + t("common.words.welcome")
})
</script>

<style scoped>
.home-main,
.published-grid,
.published-card {
  min-width: 0;
}

.published-markdown {
  overflow-wrap: anywhere;
}

.published-markdown :deep(h2),
.published-markdown :deep(h3),
.published-markdown :deep(h4) {
  margin: 0 0 0.35rem;
  font-weight: 700;
}

.published-markdown :deep(p) {
  margin: 0 0 0.4rem;
}

.published-markdown :deep(ul) {
  margin: 0 0 0.4rem 1rem;
  list-style: disc;
}

.published-markdown :deep(code) {
  border-radius: 0.25rem;
  background: rgb(228 228 231);
  padding: 0.05rem 0.25rem;
}

.published-markdown :deep(a) {
  color: rgb(37 99 235);
  font-weight: 600;
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .home-main {
    padding-inline: 0.75rem;
  }

  .published-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .published-card {
    padding: 0.875rem;
  }

  .published-card-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .published-card-footer :deep(a),
  .published-card-footer :deep(button) {
    width: 100%;
    justify-content: center;
  }
}
</style>
