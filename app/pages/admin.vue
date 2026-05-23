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
        <h2 class="text-lg font-semibold">{{ t("admin.blacklistedIps") }}</h2>
        <div class="overflow-hidden rounded-lg border border-zinc-300 bg-white dark:border-neutral-700 dark:bg-neutral-950">
          <div v-if="blacklistedIps.length === 0" class="p-3 text-sm text-zinc-500 dark:text-zinc-400">
            {{ t("admin.noBlacklistedIps") }}
          </div>
          <div v-for="ip in blacklistedIps" :key="ip.id"
            class="flex items-center justify-between gap-4 border-b border-zinc-200 p-3 last:border-b-0 dark:border-neutral-800">
            <div class="min-w-0">
              <p class="truncate font-medium">{{ ip.ipAddress }}</p>
              <p class="truncate text-sm text-zinc-500 dark:text-zinc-400">
                {{ ip.reason }} · {{ ip.createdAt }}
              </p>
            </div>
            <Button variant="ghost" class="cursor-pointer text-red-600 hover:text-red-600" @click="deleteBlacklistedIp(ip)">
              {{ t("admin.removeIp") }}
            </Button>
          </div>
        </div>
      </section>

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
                <div class="mt-2 flex flex-col gap-1">
                  <div class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{{ t("admin.storage") }}: {{ formatBytes(user.storageUsedBytes) }} / {{ formatBytes(user.storageMaxBytes) }}</span>
                    <span>{{ storagePercent(user).toFixed(storagePercent(user) % 1 === 0 ? 0 : 1) }}%</span>
                  </div>
                  <div class="h-1.5 w-64 max-w-full overflow-hidden bg-zinc-200 dark:bg-neutral-800">
                    <div class="h-full bg-blue-500" :style="{ width: `${storagePercent(user)}%` }"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <label class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                {{ t("admin.storageGb") }}
                <input type="number" min="1" step="1" :value="bytesToGb(user.storageMaxBytes)"
                  class="h-9 w-24 border border-zinc-300 bg-white px-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                  @change="updateUserStorage(user, $event)" />
              </label>
              <Button variant="ghost" class="cursor-pointer text-red-600 hover:text-red-600"
                :disabled="user.role === 'admin'" @click="deleteUser(user)">
                {{ t("admin.deleteUser") }}
              </Button>
            </div>
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
  storageUsedBytes: number;
  storageMaxBytes: number;
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

type BlacklistedIp = {
  id: number;
  ipAddress: string;
  reason: string;
  createdAt: string;
}

const { data, error, refresh } = await useFetch<{
  users: AdminUser[];
  folders: AdminFolder[];
  blacklistedIps: BlacklistedIp[];
  totals: { users: number; folders: number; rootFiles: number; blacklistedIps: number };
}>("/api/admin/overview");

if (error.value?.statusCode === 401) {
  await navigateTo("/login");
}

if (error.value?.statusCode === 403) {
  await navigateTo("/dashboard");
}

const users = computed(() => data.value?.users ?? []);
const folders = computed(() => data.value?.folders ?? []);
const blacklistedIps = computed(() => data.value?.blacklistedIps ?? []);
const totals = computed(() => data.value?.totals ?? { users: 0, folders: 0, rootFiles: 0, blacklistedIps: 0 });

function initials(value = "") {
  return value.trim().slice(0, 2).toUpperCase() || "??";
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function bytesToGb(bytes: number) {
  return Math.round(bytes / 1_000_000_000);
}

function storagePercent(user: AdminUser) {
  return user.storageMaxBytes > 0
    ? Math.min(100, Math.round((user.storageUsedBytes / user.storageMaxBytes) * 1000) / 10)
    : 0;
}

async function updateUserStorage(user: AdminUser, event: Event) {
  const input = event.target as HTMLInputElement;
  const storageGb = Number(input.value);

  if (!Number.isFinite(storageGb) || storageGb <= 0) {
    input.value = String(bytesToGb(user.storageMaxBytes));
    return;
  }

  await $fetch(`/api/admin/users/storage/${user.id}`, {
    method: "POST",
    body: {
      storageMaxBytes: Math.round(storageGb * 1_000_000_000)
    }
  });
  await refresh();
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

async function deleteBlacklistedIp(ip: BlacklistedIp) {
  if (!confirm(t("admin.confirmDeleteIp", { ip: ip.ipAddress }))) {
    return;
  }

  await $fetch(`/api/admin/blacklist/delete/${ip.id}`, {
    method: "POST"
  });
  await refresh();
}

useHead({
  title: t("common.siteName") + " - " + t("admin.title")
});
</script>
