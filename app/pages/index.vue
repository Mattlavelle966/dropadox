<template>
  <div class="min-h-full bg-zinc-300 dark:bg-neutral-800 flex flex-col select-none">

    <main class="flex flex-1 flex-col px-4 dark:text-white/80">
      <section class="flex min-h-[34vh] flex-col items-center justify-center text-center">
        <h2 class="text-4xl md:text-6xl font-extrabold drop-shadow-md text-shadow-xs text-blue-500 dark:text-white/80">
          {{ t("index.h2") }}
        </h2>

        <p class="dark:text-white/60 mt-4 text-lg max-w-xl">
          {{ t("index.tagLine") }}
        </p>
      </section>

      <section class="mx-auto flex w-full max-w-5xl flex-col gap-3 pb-8">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-xl font-bold text-zinc-900 dark:text-white">{{ t("index.publishedFolders") }}</h3>
          <span class="text-sm text-zinc-600 dark:text-zinc-400">{{ t("index.sortedByLikes") }}</span>
        </div>

        <div v-if="publishedFolders.length" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article v-for="folder in publishedFolders" :key="folder.token"
            class="flex min-h-56 flex-col justify-between rounded-lg border border-zinc-300 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            <div class="flex items-start gap-3">
              <img v-if="folder.folder.iconUrl" :src="folder.folder.iconUrl" :alt="folder.folder.name"
                class="h-12 w-12 rounded-md object-cover" />
              <div v-else class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-zinc-200 dark:bg-neutral-800">
                <Folder class="h-6 w-6 opacity-70" />
              </div>
              <div class="min-w-0">
                <h4 class="truncate font-semibold text-zinc-900 dark:text-white">{{ folder.folder.name }}</h4>
                <div class="mt-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <img v-if="folder.owner.avatarUrl" :src="folder.owner.avatarUrl" :alt="folder.owner.username"
                    class="h-5 w-5 rounded-full object-cover" />
                  <span>{{ folder.owner.username }}</span>
                </div>
              </div>
            </div>

            <p class="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
              {{ folder.markdown || t("index.noDescription") }}
            </p>

            <div class="mt-4 flex items-center justify-between gap-3">
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

        <p v-else class="rounded-lg border border-zinc-300 bg-white p-4 text-sm text-zinc-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-zinc-400">
          {{ t("index.noPublishedFolders") }}
        </p>
      </section>
    </main>

    <Footer />

  </div>
</template>
<script setup lang="ts">
import { Folder, Heart } from "lucide-vue-next";
import Footer from "~/components/Footer.vue";

const {t} = useI18n();
type PublishedFolder = {
  token: string;
  url: string;
  markdown: string;
  likes: number;
  folder: { id: number; name: string; iconUrl?: string | null };
  owner: { id: number; username: string; email: string; avatarUrl?: string | null };
}

const { data: publishedData } = await useFetch<{ folders: PublishedFolder[] }>("/api/public/published-folders");
const publishedFolders = ref<PublishedFolder[]>(publishedData.value?.folders ?? []);

async function likeFolder(folder: PublishedFolder) {
  const res = await $fetch<{ likes: number }>(`/api/public/published-folders/like/${folder.token}`, {
    method: "POST"
  });

  folder.likes = res.likes;
  publishedFolders.value = [...publishedFolders.value].sort((a, b) => b.likes - a.likes);
}

useHead({
  title: t("common.siteName") + " - " + t("common.words.welcome")
})
</script>
