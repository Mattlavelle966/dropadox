<template>
  <div class="h-full dark:bg-neutral-800 pt-10">
    <div
      class="max-w-md mx-auto p-6 bg-white dark:bg-neutral-900 shadow-lg rounded-2xl border border-neutral-200 dark:border-neutral-800">
      <h1 class="text-2xl font-bold tracking-tight mb-6 text-neutral-900 dark:text-white">
        {{ $t('settings.title') }}
      </h1>

      <div class="space-y-4">
        <div class="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
            {{ $t('settings.profileImage.label') }}
          </h3>
          <div class="flex items-center gap-4">
            <img v-if="avatarUrl && showAvatar" :src="avatarUrl" alt="Profile image"
              class="h-16 w-16 rounded-full object-cover" @error="showAvatar = false" />
            <div v-else
              class="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 text-lg font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
              {{ avatarInitials }}
            </div>
            <div class="flex flex-1 flex-col gap-2">
              <Input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp"
                @change="uploadAvatar" />
              <Button v-if="avatarUrl" variant="ghost" class="cursor-pointer justify-start text-red-600 hover:text-red-600"
                @click="removeAvatar">
                {{ $t('settings.profileImage.remove') }}
              </Button>
            </div>
          </div>
          <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {{ $t('settings.profileImage.description') }}
          </p>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
            {{ $t('settings.colorProfile.label') }}
          </h3>

          <p v-if="updateError" class="text-red-500 text-sm mb-2">
            {{ updateError }}
          </p>

          <div class="flex items-center gap-4 dark:text-white/60">
            <RadioGroup v-model="color" class="flex flex-col gap-6">
              
              <div class="flex items-center space-x-2">
                <RadioGroupItem id="dark" value="dark" />
                <Label for="dark">{{ $t('settings.colorProfile.dark') }}</Label>
              </div>

              <div class="flex items-center space-x-2">
                <RadioGroupItem id="light" value="light" />
                <Label for="light">{{ $t('settings.colorProfile.light') }}</Label>
              </div>

              <div class="flex items-center space-x-2">
                <RadioGroupItem id="system" value="system" />
                <Label for="system">{{ $t('settings.colorProfile.system') }}</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div class="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <div class="flex items-start gap-3">
            <input
              id="search-visible"
              v-model="searchVisible"
              type="checkbox"
              class="mt-1 h-4 w-4"
            />
            <div>
              <Label for="search-visible" class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {{ $t('settings.privacy.searchVisibleLabel') }}
              </Label>
              <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {{ $t('settings.privacy.searchVisibleDescription') }}
              </p>
            </div>
          </div>
        </div>

        <Button @click="updateSettings"
          class="w-full bg-black text-white hover:bg-black/80 py-3 rounded-xl font-medium transition">
          {{ $t('settings.updateButton') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
const router = useRouter()
const { t } = useI18n()
const updateError = ref("")

const color = ref('light')
const searchVisible = ref(true)
const avatarUrl = ref("")
const showAvatar = ref(true)

const { data: settingsData, error: settingsError } = await useFetch<{
  settings: { colorMode: string; searchVisible: boolean; avatarUrl?: string | null };
}>("/api/userSettings");

if (settingsError.value?.statusCode === 401) {
  await navigateTo("/login");
}

if (settingsData.value?.settings) {
  color.value = settingsData.value.settings.colorMode ?? "light";
  searchVisible.value = settingsData.value.settings.searchVisible !== false;
  avatarUrl.value = settingsData.value.settings.avatarUrl ? `${settingsData.value.settings.avatarUrl}?v=${Date.now()}` : "";
}

const avatarInitials = computed(() => {
  const sessionName = "";
  return sessionName.slice(0, 2).toUpperCase() || "ME";
});

async function uploadAvatar(event: Event) {
  updateError.value = ""
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  try {
    const form = new FormData();
    form.append("avatar", file);
    const res = await $fetch<{ avatarUrl: string }>("/api/users/avatar", {
      method: "POST",
      body: form
    });

    avatarUrl.value = res.avatarUrl;
    showAvatar.value = true;
    window.dispatchEvent(new Event("user-avatar-updated"));
  } catch (err: any) {
    updateError.value = err?.data?.statusMessage || err?.statusMessage || t('settings.profileImage.error');
  } finally {
    input.value = "";
  }
}

async function removeAvatar() {
  updateError.value = ""

  try {
    await $fetch("/api/users/avatar/remove", {
      method: "POST"
    });
    avatarUrl.value = "";
    showAvatar.value = false;
    window.dispatchEvent(new Event("user-avatar-updated"));
  } catch (err: any) {
    updateError.value = err?.data?.statusMessage || err?.statusMessage || t('settings.profileImage.error');
  }
}

async function updateSettings() {
  updateError.value = ""
  try {
    await $fetch('/api/userSettings', {
      method: 'POST',
      body: {
        color_mode: color.value,
        search_visible: searchVisible.value
      }
    })
    await router.push('/dashboard')
  } catch {
    updateError.value = t('settings.errorUpdating')
  }
}

useHead({
  title: t("common.siteName") + " - " + t("settings.title")
})
</script>
