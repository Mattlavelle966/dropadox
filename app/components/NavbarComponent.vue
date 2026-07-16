<template>
    <header
        class="w-full py-4 px-6 flex justify-between items-center max-h-[5dvh] dark:bg-neutral-950/91 dark:text-white shadow-lg">
        <div class="flex justify-center items-center gap-8">
        <NuxtLink class="mb-1" to="/">
                <h1 class="text-2xl font-black tracking-tight text-shadow-sm m-0 p-0">{{ t("common.siteName") }}</h1>
            </NuxtLink>

            <div class="flex justify-center items-center dark:text-white/80 hover:dark:text-white/50">
                <NuxtLink to="/dashboard">
                    {{ t("common.nav.dashboard") }}
                </NuxtLink>
            </div>
            <div class="flex justify-center items-center dark:text-white/80 hover:dark:text-white/50">
                <NuxtLink to="/docs">
                    {{ t("common.nav.docs") }}
                </NuxtLink>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <NuxtLink to="/signup" v-if="!isLoggedIn">
                <Button variant="default" class="m-2 pointer-events-auto cursor-pointer shadow-md">
                    {{ t("common.nav.signup") }}
                </Button>
            </NuxtLink>
            <NuxtLink to="/login" v-if="!isLoggedIn">
                <Button variant="default"
                    class="m-2 bg-blue-500 hover:bg-blue-400 text-white shadow-md hover:text-white pointer-events-auto cursor-pointer">
                    {{ t("common.nav.login") }}
                </Button>
            </NuxtLink>
            <NuxtLink to="/settings" v-if="isLoggedIn && !isDashboard">
                <div class="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-200 dark:hover:bg-neutral-800">
                    <img v-if="showAvatar" :src="avatarUrl" :alt="session?.username"
                        class="h-8 w-8 rounded-full object-cover" @error="showAvatar = false" />
                    <div v-else
                        class="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-neutral-800 dark:text-white">
                        {{ userInitials }}
                    </div>
                    <div class="hidden text-left text-xs leading-tight md:block">
                        <span class="block font-semibold">{{ session?.username }}</span>
                        <span class="block max-w-40 truncate opacity-70">{{ session?.emailAddress }}</span>
                    </div>
                </div>
            </NuxtLink>
            <NuxtLink to="/admin" v-if="isAdmin && !isDashboard">
                <Button variant="default" class="m-2 pointer-events-auto cursor-pointer shadow-md">
                    {{ t("common.nav.admin") }}
                </Button>
            </NuxtLink>
            <Button @click="logoff" variant="default"
                class="m-2 border-black bg-red-500 hover:bg-red-400 text-white shadow-md hover:text-white pointer-events-auto cursor-pointer"
                v-if="isLoggedIn && !isDashboard">
                {{ t("common.nav.logOut") }}
            </Button>
        </div>
    </header>

</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const { t } = useI18n();
const { data: session } = await useFetch("/api/verifyToken", {
    method: "POST"
});
const route = useRoute();
const isLoggedIn = computed(() => Boolean(session.value?.authenticated && session.value?.id));
const isAdmin = computed(() => session.value?.role === "admin");
const isDashboard = computed(() => route.path === "/dashboard");
const avatarVersion = ref(Date.now());
const showAvatar = ref(true);
const avatarUrl = computed(() => isLoggedIn.value ? `/api/users/avatar/${session.value?.id}?v=${avatarVersion.value}` : "");
const userInitials = computed(() => {
    const source = String(session.value?.username || session.value?.emailAddress || "?");
    return source.slice(0, 2).toUpperCase();
});
const router = useRouter()
async function logoff() {
    if (isLoggedIn.value) {
        await $fetch("/api/logout", {
            method: "POST"
        });
        session.value = { authenticated: false };
        await router.push('/')
    }
}

function refreshAvatar() {
    showAvatar.value = true;
    avatarVersion.value = Date.now();
}

onMounted(() => {
    window.addEventListener("user-avatar-updated", refreshAvatar);
});

onBeforeUnmount(() => {
    window.removeEventListener("user-avatar-updated", refreshAvatar);
});
</script>
