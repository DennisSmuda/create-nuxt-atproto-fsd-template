<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-default">
    <div class="w-full max-w-sm">
      <h1
        class="font-display text-3xl font-extrabold tracking-tighter text-highlighted text-balance text-center mb-8"
      >
        {{ t('login.title') }}
      </h1>

      <div class="rounded-xl bg-elevated border border-default p-6">
        <div class="w-full space-y-6">
          <UAlert
            v-if="error"
            :title="error"
            color="error"
            variant="soft"
            size="sm"
          />

          <AtprotoSignInForm />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtprotoSignInForm } from '~/features/user/sign-in-with-atproto'

const { t } = useI18n()
const route = useRoute()

useSeoMeta({
  title: () => t('meta.title.login'),
})

const error = ref(
  route.query.atproto === 'failed'
    ? t('errors.atprotoLoginFailed')
    : route.query.atproto === 'not-allowed'
      ? t('errors.signupNotAllowed')
      : '',
)
</script>
