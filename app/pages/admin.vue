<template>
  <div class="h-full overflow-y-auto bg-zinc-100 p-6 dark:bg-neutral-900 dark:text-white">
    <main class="mx-auto flex max-w-6xl flex-col gap-6">
      <header class="flex items-center justify-between gap-4 border-b border-zinc-300 pb-4 dark:border-neutral-700">
        <div>
          <h1 class="text-2xl font-bold">{{ t("admin.title") }}</h1>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ t("admin.description") }}</p>
        </div>
        <div class="flex gap-3 text-sm text-zinc-600 dark:text-zinc-300">
          <span>{{ t("admin.users") }}: {{ totals.users }}</span>
          <span>{{ t("admin.folders") }}: {{ totals.folders }}</span>
        </div>
      </header>

      <section class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold">{{ t("admin.users") }}</h2>
        <div class="overflow-hidden rounded-lg border border-zinc-300 bg-white dark:border-neutral-700 dark:bg-neutral-950">
          <div v-for="user in users" :key="user.id"
            class="flex items-center justify-between gap-4 border-b border-zinc-200 p-3 last:border-b-0 dark:border-neutral-800">
            <div class="flex min-w-0 items-center gap-3">
              <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.username"
                class="h-10 w-10 rounded-full object-cover" />
              <div v-else
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-neutral-800 dark:text-white">
                {{ initials(user.username || user.email) }}
              </div>
              <div class="min-w-0">
                <p class="truncate font-medium">{{ user.username }}</p>
                <p class="truncate text-sm text-zinc-500 dark:text-zinc-400">{{ user.email }}</p>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">
                  {{ user.role }} · {{ user.folderCount }} {{ t("admin.folders").toLowerCase() }}
                </p>
              </div>
            </div>
            <Button variant="ghost" class="cursor-pointer text-red-600 hover:text-red-600"
              :disabled="user.role === 'admin'" @click="deleteUser(user)">
              {{ t("admin.deleteUser") }}
            </Button>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold">{{ t("admin.folders") }}</h2>
        <div class="overflow-hidden rounded-lg border border-zinc-300 bg-white dark:border-neutral-700 dark:bg-neutral-950">
          <div v-for="folder in folders" :key="folder.id"
            class="flex items-center justify-between gap-4 border-b border-zinc-200 p-3 last:border-b-0 dark:border-neutral-800">
            <div class="flex min-w-0 items-center gap-3">
              <img v-if="folder.iconUrl" :src="folder.iconUrl" :alt="folder.name"
                class="h-10 w-10 rounded-md object-cover" />
              <div v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-200 dark:bg-neutral-800">
                <Folder class="h-5 w-5 opacity-70" />
              </div>
              <div class="min-w-0">
                <p class="truncate font-medium">{{ folder.name }}</p>
                <p class="truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {{ folder.ownerName }} · {{ folder.ownerEmail }}
                </p>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">
                  {{ folder.fileCount }} {{ t("admin.files") }}
                  <span v-if="folder.published"> · {{ t("admin.published") }} · {{ folder.likes }} {{ t("admin.likes") }}</span>
                </p>
              </div>
            </div>
            <Button variant="ghost" class="cursor-pointer text-red-600 hover:text-red-600" @click="deleteFolder(folder)">
              {{ t("admin.deleteFolder") }}
            </Button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Folder } from "lucide-vue-next";

const { t } = useI18n();

type AdminUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  folderCount: number;
  avatarUrl?: string | null;
}

type AdminFolder = {
  id: number;
  name: string;
  ownerName: string;
  ownerEmail: string;
  fileCount: number;
  iconUrl?: string | null;
  published: boolean;
  likes: number;
}

const { data, error, refresh } = await useFetch<{
  users: AdminUser[];
  folders: AdminFolder[];
  totals: { users: number; folders: number; rootFiles: number };
}>("/api/admin/overview");

if (error.value?.statusCode === 401) {
  await navigateTo("/login");
}

if (error.value?.statusCode === 403) {
  await navigateTo("/dashboard");
}

const users = computed(() => data.value?.users ?? []);
const folders = computed(() => data.value?.folders ?? []);
const totals = computed(() => data.value?.totals ?? { users: 0, folders: 0, rootFiles: 0 });

function initials(value = "") {
  return value.trim().slice(0, 2).toUpperCase() || "??";
}

async function deleteUser(user: AdminUser) {
  if (!confirm(t("admin.confirmDeleteUser", { email: user.email }))) {
    return;
  }

  await $fetch(`/api/admin/users/delete/${user.id}`, {
    method: "POST"
  });
  await refresh();
}

async function deleteFolder(folder: AdminFolder) {
  if (!confirm(t("admin.confirmDeleteFolder", { name: folder.name }))) {
    return;
  }

  await $fetch(`/api/admin/folders/delete/${folder.id}`, {
    method: "POST"
  });
  await refresh();
}

useHead({
  title: t("common.siteName") + " - " + t("admin.title")
});
</script>
