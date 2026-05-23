<template>
  <div class="h-full bg-zinc-300 dark:bg-neutral-800 flex flex-col">
    <main class="flex flex-col items-center justify-center flex-1 px-6 text-center dark:text-white/80">

      <h2 class="text-4xl font-extrabold drop-shadow-md mb-6">
        {{ t("signUp.text") }}
      </h2>

      <div class="w-full max-w-sm bg-white/60 dark:bg-neutral-700/50 p-6 rounded-xl shadow-md backdrop-blur">

        <p v-if="submissionError" class="text-red-500 font-medium mb-2">
          {{ submissionError }}
        </p>

        <div class="flex flex-col space-y-4">

          <!-- name -->
          <div class="text-left">
            <Input
              v-model="state.name"
              :placeholder="t('signUp.name')"
              required
            />
            <p v-if="nameError" class="text-red-500 text-sm mt-1">{{ nameError }}</p>
          </div>

          <!-- email -->
          <div class="text-left">
            <Input
              v-model="state.email"
              type="email"
              :placeholder="t('signIn.email')"
            />
            <p v-if="emailError" class="text-red-500 text-sm mt-1">{{ emailError }}</p>
          </div>

          <!-- password -->
          <div class="text-left">
            <Input
              v-model="state.password"
              type="password"
              :placeholder="t('signIn.password')"
            />
            <p v-if="passwordError" class="text-red-500 text-sm mt-1">{{ passwordError }}</p>
          </div>

          <div class="text-left rounded-lg border border-zinc-300 bg-white/70 p-3 dark:border-neutral-600 dark:bg-neutral-800/60">
            <div class="mb-2 flex items-center justify-between gap-3 text-sm">
              <span>{{ t("signUp.challenge.title") }}</span>
              <span :class="challengePassed ? 'text-green-600' : 'text-zinc-500 dark:text-zinc-300'">
                {{ challengePassed ? t("signUp.challenge.passed") : t("signUp.challenge.attempts", { count: attemptsLeft }) }}
              </span>
            </div>
            <div class="relative h-5 overflow-hidden rounded bg-zinc-200 dark:bg-neutral-700">
              <div class="absolute top-0 h-full bg-green-500/70"
                :style="{ left: `${targetStart}%`, width: `${targetEnd - targetStart}%` }"></div>
              <div class="absolute top-0 h-full w-1 bg-zinc-950 dark:bg-white"
                :style="{ left: `${markerPosition}%` }"></div>
            </div>
            <div class="mt-2 flex gap-2">
              <Button class="flex-1 cursor-pointer" type="button" :disabled="challengePassed || attemptsLeft <= 0" @click="hitChallenge">
                {{ t("signUp.challenge.hit") }}
              </Button>
              <Button class="cursor-pointer" type="button" variant="ghost" @click="startChallenge">
                {{ t("signUp.challenge.reset") }}
              </Button>
            </div>
            <p class="mt-2 text-xs text-zinc-600 dark:text-zinc-300">{{ t("signUp.challenge.instructions") }}</p>
            <p v-if="challengeError" class="mt-1 text-sm text-red-500">{{ challengeError }}</p>
          </div>

          <Button
            @click="signUp"
            :disabled="!challengePassed"
            class="w-full bg-black text-white hover:bg-black/80 mt-2 py-3 rounded-xl cursor-pointer"
          >
            {{ t("signUp.buttonText") }}
          </Button>
        </div>

      </div>
    </main>

    <Footer />
  </div>
</template>

<script lang="ts" setup>
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const { t } = useI18n();
const router = useRouter();

const state = reactive({
  name: "",
  email: "",
  password: "",
});

const emailError = ref("");
const passwordError = ref("");
const nameError = ref("");
const submissionError = ref("");
const challengeError = ref("");
const challengeId = ref("");
const challengeToken = ref("");
const attemptsLeft = ref(50);
const targetStart = ref(35);
const targetEnd = ref(47);
const markerPosition = ref(0);
const markerDirection = ref(1);
const challengePassed = computed(() => Boolean(challengeToken.value));
let animationFrame = 0;
let lastFrame = 0;

function animateMarker(timestamp = performance.now()) {
  const delta = lastFrame ? Math.min(timestamp - lastFrame, 50) : 16;
  lastFrame = timestamp;
  markerPosition.value += markerDirection.value * delta * 0.055;

  if (markerPosition.value >= 100) {
    markerPosition.value = 100;
    markerDirection.value = -1;
  }

  if (markerPosition.value <= 0) {
    markerPosition.value = 0;
    markerDirection.value = 1;
  }

  if (!challengePassed.value) {
    animationFrame = requestAnimationFrame(animateMarker);
  }
}

async function startChallenge() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }

  challengeError.value = "";
  challengeToken.value = "";
  markerPosition.value = 0;
  markerDirection.value = 1;
  lastFrame = 0;

  const challenge = await $fetch<{
    challengeId: string;
    targetStart: number;
    targetEnd: number;
    attemptsLeft: number;
  }>("/api/challenge/start");

  challengeId.value = challenge.challengeId;
  targetStart.value = challenge.targetStart;
  targetEnd.value = challenge.targetEnd;
  attemptsLeft.value = challenge.attemptsLeft;
  animationFrame = requestAnimationFrame(animateMarker);
}

async function hitChallenge() {
  if (!challengeId.value || challengePassed.value) {
    return;
  }

  try {
    const result = await $fetch<{
      passed: boolean;
      attemptsLeft: number;
      challengeToken?: string;
    }>("/api/challenge/attempt", {
      method: "POST",
      body: {
        challengeId: challengeId.value,
        position: markerPosition.value
      }
    });

    attemptsLeft.value = result.attemptsLeft;

    if (result.passed && result.challengeToken) {
      challengeToken.value = result.challengeToken;
      challengeError.value = "";
      cancelAnimationFrame(animationFrame);
      return;
    }

    challengeError.value = attemptsLeft.value > 0
      ? t("signUp.challenge.miss")
      : t("signUp.challenge.failed");
  } catch (err: any) {
    challengeError.value = err?.data?.statusMessage || err?.statusMessage || t("signUp.challenge.failed");
  }
}

function handleChallengeKeydown(event: KeyboardEvent) {
  if (event.code === "Space" && !challengePassed.value) {
    event.preventDefault();
    hitChallenge();
  }
}

async function signUp() {
  emailError.value = "";
  passwordError.value = "";
  nameError.value = "";
  submissionError.value = "";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(state.email)) {
    emailError.value = t("signIn.validation.validEmail");
  }

  if (state.password.length < 6) {
    passwordError.value = t("signUp.validation.passwordRequired");
  }

  if (state.name.length < 1) {
    nameError.value = t("signUp.validation.nameRequired");
  }

  if (emailError.value || passwordError.value || nameError.value) {
    return;
  }

  try {
    await $fetch("/api/register", {
      method: "POST",
      body: {
        username: state.name,
        email: state.email,
        password: state.password,
        challengeToken: challengeToken.value,
      },
    });

    router.push("/login");
  } catch (err: any) {
    submissionError.value = err?.data?.statusMessage || err?.statusMessage || err?.statusText || t("signUp.error.submissionFailed");
  }
}

useHead({
  title: t("common.siteName") + " - " + t("common.nav.signup")
})

onMounted(() => {
  startChallenge();
  window.addEventListener("keydown", handleChallengeKeydown);
});

onBeforeUnmount(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }

  window.removeEventListener("keydown", handleChallengeKeydown);
});
</script>
