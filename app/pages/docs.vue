<template>
  <div class="min-h-full bg-zinc-100 dark:bg-neutral-900 dark:text-white/80">
    <main class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header class="border-b border-zinc-300 pb-8 dark:border-neutral-700">
        <p class="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">Dropadox API v1</p>
        <h1 class="text-3xl font-extrabold text-zinc-950 md:text-4xl dark:text-white">Automate your cloud backups</h1>
        <p class="mt-3 max-w-3xl text-zinc-600 dark:text-zinc-400">
          Upload, list, and download files from scripts or backup tools. API keys use the same account storage and permissions as the dashboard.
        </p>
      </header>

      <section id="api-keys" class="border border-zinc-300 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-950">
        <div class="flex items-start gap-3">
          <KeyRound class="mt-1 h-5 w-5 shrink-0 text-blue-600" />
          <div class="min-w-0 flex-1">
            <h2 class="text-xl font-bold text-zinc-950 dark:text-white">API keys</h2>
            <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Treat keys like passwords. Each key grants access to your files and is only displayed once.
            </p>

            <template v-if="isLoggedIn">
              <form class="mt-4 flex flex-col gap-2 sm:flex-row" @submit.prevent="createApiKey">
                <Input v-model="keyName" maxlength="80" placeholder="Key name, e.g. Laptop backup" class="sm:max-w-sm" />
                <Button type="submit" class="cursor-pointer" :disabled="creatingKey || !keyName.trim()">
                  {{ creatingKey ? "Creating…" : "Generate API key" }}
                </Button>
              </form>

              <p v-if="keyError" class="mt-3 text-sm text-red-600 dark:text-red-400">{{ keyError }}</p>

              <div v-if="newApiKey" class="mt-4 border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                <p class="font-semibold text-amber-900 dark:text-amber-200">Copy this key now—it cannot be shown again.</p>
                <div class="mt-2 flex flex-col gap-2 sm:flex-row">
                  <code class="min-w-0 flex-1 overflow-x-auto bg-white px-3 py-2 text-sm text-zinc-900 dark:bg-neutral-900 dark:text-zinc-100">{{ newApiKey }}</code>
                  <Button type="button" variant="outline" class="cursor-pointer" @click="copyText(newApiKey)">Copy</Button>
                </div>
              </div>

              <div class="mt-5">
                <h3 class="font-semibold text-zinc-900 dark:text-white">Your keys</h3>
                <div v-if="apiKeys.length" class="mt-2 divide-y divide-zinc-200 border border-zinc-200 dark:divide-neutral-800 dark:border-neutral-800">
                  <div v-for="key in apiKeys" :key="key.id" class="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-medium text-zinc-900 dark:text-white">{{ key.name }}</span>
                        <span v-if="key.revokedAt" class="bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-neutral-800 dark:text-zinc-400">Revoked</span>
                      </div>
                      <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <code>{{ key.keyPrefix }}…</code> · Created {{ formatDate(key.createdAt) }}<template v-if="key.lastUsedAt"> · Last used {{ formatDate(key.lastUsedAt) }}</template>
                      </p>
                    </div>
                    <Button v-if="!key.revokedAt" type="button" variant="ghost" class="cursor-pointer justify-start text-red-600 hover:text-red-600"
                      @click="revokeApiKey(key)">
                      Revoke
                    </Button>
                  </div>
                </div>
                <p v-else class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No API keys yet.</p>
              </div>
            </template>

            <div v-else class="mt-4 flex flex-wrap items-center gap-3">
              <NuxtLink to="/login"><Button class="cursor-pointer">Log in to generate a key</Button></NuxtLink>
              <NuxtLink to="/signup" class="text-sm font-medium text-blue-600 hover:text-blue-500">Create an account</NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div class="min-w-0 space-y-8">
          <article id="authentication">
            <h2 class="text-2xl font-bold text-zinc-950 dark:text-white">Authentication</h2>
            <p class="mt-2 text-zinc-600 dark:text-zinc-400">
              Send your key in the <code>Authorization</code> header. All automation routes are under <code>/api/v1</code> and return JSON unless downloading a file.
            </p>
            <pre class="mt-3 overflow-x-auto bg-zinc-950 p-4 text-sm text-zinc-100"><code>Authorization: Bearer ddx_your_api_key</code></pre>
          </article>

          <article id="quick-start">
            <h2 class="text-2xl font-bold text-zinc-950 dark:text-white">Quick start</h2>
            <p class="mt-2 text-zinc-600 dark:text-zinc-400">Upload a file to the root of your account:</p>
            <pre class="mt-3 overflow-x-auto bg-zinc-950 p-4 text-sm text-zinc-100"><code>{{ uploadExample }}</code></pre>
            <p class="mt-4 text-zinc-600 dark:text-zinc-400">Add <code>-F "folderId=123"</code> to upload into a folder.</p>
          </article>

          <article id="endpoints">
            <h2 class="text-2xl font-bold text-zinc-950 dark:text-white">Endpoints</h2>
            <div class="mt-3 overflow-x-auto border border-zinc-300 dark:border-neutral-700">
              <table class="w-full min-w-[42rem] text-left text-sm">
                <thead class="bg-zinc-200 text-zinc-800 dark:bg-neutral-800 dark:text-zinc-200">
                  <tr><th class="p-3">Method</th><th class="p-3">Path</th><th class="p-3">Purpose</th></tr>
                </thead>
                <tbody class="divide-y divide-zinc-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
                  <tr v-for="endpoint in endpoints" :key="`${endpoint.method}-${endpoint.path}`">
                    <td class="p-3 font-mono font-semibold">{{ endpoint.method }}</td>
                    <td class="p-3 font-mono">{{ endpoint.path }}</td>
                    <td class="p-3 text-zinc-600 dark:text-zinc-400">{{ endpoint.description }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article id="backup-example">
            <h2 class="text-2xl font-bold text-zinc-950 dark:text-white">Simple backup flow</h2>
            <ol class="mt-3 list-decimal space-y-2 pl-5 text-zinc-600 dark:text-zinc-400">
              <li>Call <code>GET /api/v1/folders</code> and choose or create a destination folder.</li>
              <li>Upload each changed file with <code>POST /api/v1/files</code>.</li>
              <li>Store the returned file ID so you can download or remove that version later.</li>
              <li>Periodically call <code>GET /api/v1/files?folderId=ID</code> to verify what is stored.</li>
            </ol>
            <pre class="mt-4 overflow-x-auto bg-zinc-950 p-4 text-sm text-zinc-100"><code>{{ listExample }}</code></pre>
          </article>

          <article id="errors">
            <h2 class="text-2xl font-bold text-zinc-950 dark:text-white">Errors and safety</h2>
            <p class="mt-2 text-zinc-600 dark:text-zinc-400">
              Successful creates return <code>201</code>. Invalid keys return <code>401</code>, missing resources return <code>404</code>, rate limits return <code>429</code>, and storage-limit errors return <code>413</code>. Revoke a key immediately if it is exposed.
            </p>
          </article>
        </div>

        <nav class="hidden self-start border-l border-zinc-300 pl-5 text-sm lg:sticky lg:top-6 lg:block dark:border-neutral-700" aria-label="Documentation sections">
          <p class="mb-3 font-semibold text-zinc-900 dark:text-white">On this page</p>
          <a v-for="item in navItems" :key="item.href" :href="item.href" class="block py-1.5 text-zinc-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400">{{ item.label }}</a>
        </nav>
      </section>

      <Footer />
    </main>
  </div>
</template>

<script setup lang="ts">
import { KeyRound } from "lucide-vue-next";
import Footer from "~/components/Footer.vue";

type ApiKeyItem = {
  id: number;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
};

const { data: session } = await useFetch<{ authenticated: boolean; id?: number }>("/api/verifyToken", { method: "POST" });
const isLoggedIn = computed(() => Boolean(session.value?.authenticated && session.value?.id));
const apiKeys = ref<ApiKeyItem[]>([]);
const keyName = ref("");
const newApiKey = ref("");
const keyError = ref("");
const creatingKey = ref(false);
const origin = useRequestURL().origin;

if (isLoggedIn.value) {
  const { data } = await useFetch<{ keys: ApiKeyItem[] }>("/api/api-keys");
  apiKeys.value = data.value?.keys ?? [];
}

const endpoints = [
  { method: "GET", path: "/api/v1/storage", description: "Read used, available, and maximum storage in bytes." },
  { method: "GET", path: "/api/v1/folders", description: "List folders available to the account." },
  { method: "POST", path: "/api/v1/folders", description: "Create a folder from JSON: { name, parentId? }." },
  { method: "GET", path: "/api/v1/files?folderId=ID", description: "List root files, or files in one folder when folderId is supplied." },
  { method: "POST", path: "/api/v1/files", description: "Upload multipart field file, with optional folderId." },
  { method: "GET", path: "/api/v1/files/:fileId", description: "Download a file by ID." },
  { method: "DELETE", path: "/api/v1/files/:fileId", description: "Delete a file by ID." }
];

const navItems = [
  { href: "#api-keys", label: "API keys" },
  { href: "#authentication", label: "Authentication" },
  { href: "#quick-start", label: "Quick start" },
  { href: "#endpoints", label: "Endpoints" },
  { href: "#backup-example", label: "Backup flow" },
  { href: "#errors", label: "Errors and safety" }
];

const uploadExample = `curl -X POST "${origin}/api/v1/files" \\
  -H "Authorization: Bearer $DROPADOX_API_KEY" \\
  -F "file=@./backup.zip"`;

const listExample = `curl "${origin}/api/v1/files?folderId=123" \\
  -H "Authorization: Bearer $DROPADOX_API_KEY"`;

async function createApiKey() {
  if (!keyName.value.trim() || creatingKey.value) return;
  creatingKey.value = true;
  keyError.value = "";
  newApiKey.value = "";

  try {
    const result = await $fetch<{ key: ApiKeyItem; apiKey: string }>("/api/api-keys", {
      method: "POST",
      body: { name: keyName.value.trim() }
    });
    apiKeys.value = [result.key, ...apiKeys.value];
    newApiKey.value = result.apiKey;
    keyName.value = "";
  } catch (error: any) {
    keyError.value = error?.data?.statusMessage || error?.statusMessage || "Could not create API key.";
  } finally {
    creatingKey.value = false;
  }
}

async function revokeApiKey(key: ApiKeyItem) {
  if (!confirm(`Revoke “${key.name}”? Programs using it will stop working immediately.`)) return;
  keyError.value = "";

  try {
    await $fetch(`/api/api-keys/${key.id}`, { method: "DELETE" });
    key.revokedAt = new Date().toISOString();
    apiKeys.value = [...apiKeys.value];
    if (newApiKey.value.startsWith(key.keyPrefix)) newApiKey.value = "";
  } catch (error: any) {
    keyError.value = error?.data?.statusMessage || error?.statusMessage || "Could not revoke API key.";
  }
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(new Date(value));
}

useHead({ title: "Dropadox - API documentation" });
</script>
