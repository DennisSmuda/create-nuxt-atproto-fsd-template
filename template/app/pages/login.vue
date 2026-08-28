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
          <div class="flex flex-col text-center">
            <p
              v-if="passwordAuth"
              class="text-base text-toned"
            >
              {{ t('login.noAccount') }}
              <NuxtLink
                to="/register"
                class="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
              >
                {{ t('login.signUp') }}
              </NuxtLink>
            </p>
          </div>

          <template v-if="passwordAuth">
            <form
              class="space-y-5"
              @submit.prevent="handleLogin"
            >
              <UFormField
                :label="t('common.email')"
                name="email"
                required
              >
                <UInput
                  v-model="email"
                  type="email"
                  :placeholder="t('common.emailPlaceholder')"
                  autocomplete="email"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="t('common.password')"
                name="password"
                required
              >
                <UInput
                  v-model="password"
                  type="password"
                  :placeholder="t('login.passwordPlaceholder')"
                  autocomplete="current-password"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UAlert
                v-if="error"
                :title="error"
                color="error"
                variant="soft"
                size="sm"
              />

              <UButton
                type="submit"
                block
                size="xl"
                color="primary"
                :loading="pending"
                :disabled="pending"
              >
                {{ t('login.continue') }}
              </UButton>
            </form>

            <div class="flex items-center gap-3">
              <span class="h-px flex-1 bg-[var(--ui-border)]" />
              <span class="text-xs font-semibold uppercase tracking-widest text-dimmed">
                {{ t('login.or') }}
              </span>
              <span class="h-px flex-1 bg-[var(--ui-border)]" />
            </div>
          </template>

          <UAlert
            v-else-if="error"
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
import { errorMessage } from '#shared/api'
import { AtprotoSignInForm } from '~/features/user/sign-in-with-atproto'

const { signIn } = useAuth()
const { t } = useI18n()
const route = useRoute()

useSeoMeta({
  title: () => t('meta.title.login'),
})

const passwordAuth = useRuntimeConfig().public.passwordAuth

const email = ref('')
const password = ref('')
const pending = ref(false)
const error = ref(
  route.query.atproto === 'failed'
    ? t('errors.atprotoLoginFailed')
    : route.query.atproto === 'not-allowed'
      ? t('errors.signupNotAllowed')
      : '',
)

const handleLogin = async () => {
  error.value = ''
  pending.value = true

  try {
    const result = await signIn('credentials', {
      email: email.value,
      password: password.value,
      redirect: false,
    })

    if (result?.error) {
      error.value = t('errors.invalidCredentials')
    } else {
      navigateTo('/')
    }
  } catch (e) {
    error.value = t(errorMessage(e, 'errors.loginFailed'))
  } finally {
    pending.value = false
  }
}
</script>
