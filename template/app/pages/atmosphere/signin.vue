<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-default">
    <div class="w-full max-w-sm space-y-6">
      <template v-if="error">
        <UAlert
          :title="error"
          color="error"
          variant="soft"
          size="sm"
        />
        <UButton
          block
          size="lg"
          color="primary"
          to="/login"
        >
          {{ t('atmosphere.backToLogin') }}
        </UButton>
      </template>

      <p
        v-else
        class="text-center text-toned"
      >
        {{ t('atmosphere.signingIn') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { readAtprotoTicket } from '~/features/user/sign-in-with-atproto'

const { signIn } = useAuth()
const { t } = useI18n()

useSeoMeta({
  title: () => t('meta.title.atmosphereSignIn'),
})

const error = ref('')

onMounted(async () => {
  const ticket = readAtprotoTicket()

  if (!ticket) {
    error.value = t('errors.invalidTicket')
    return
  }

  const result = await signIn('atproto', { ticket, redirect: false })

  if (result?.error) {
    error.value = t('errors.invalidTicket')
    return
  }

  // Replaced rather than pushed: the ticket is spent, so this URL is a dead end.
  await navigateTo('/', { replace: true })
})
</script>
