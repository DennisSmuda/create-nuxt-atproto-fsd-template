<template>
  <div class="min-h-screen bg-default">
    <header class="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
      <p class="font-display text-xl font-bold tracking-tight text-highlighted">
        {{ t('meta.title.home') }}
      </p>
      <SignOutButton />
    </header>

    <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1
        class="font-display text-4xl font-extrabold tracking-tighter text-highlighted text-balance mb-4"
      >
        {{ t('home.signedInAs', { label: accountLabel(user) }) }}
      </h1>
      <p class="text-toned text-pretty">
        {{ t('home.nextSteps') }}
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { accountLabel } from '#shared/entities/user'
import { SignOutButton } from '~/features/user/sign-out'

definePageMeta({
  middleware: 'auth',
})

const { t } = useI18n()
const { data } = useAuth()
const user = computed(() => data.value?.user ?? null)

useSeoMeta({
  title: () => t('meta.title.home'),
})
</script>
