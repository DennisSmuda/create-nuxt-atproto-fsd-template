<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-default">
    <div class="w-full max-w-sm">
      <h1
        class="font-display text-3xl font-extrabold tracking-tighter text-highlighted text-balance text-center mb-8"
      >
        {{ t('register.title') }}
      </h1>

      <div class="rounded-xl bg-elevated border border-default p-6 sm:p-8">
        <div class="w-full space-y-6">
          <p class="text-center text-base text-toned">
            {{ t('register.haveAccount') }}
            <NuxtLink
              to="/login"
              class="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
            >
              {{ t('register.logIn') }}
            </NuxtLink>
          </p>

          <form
            v-if="passwordAuth"
            class="space-y-5"
            @submit.prevent="handleRegister"
          >
            <UFormField
              :label="t('common.name')"
              name="name"
              required
            >
              <UInput
                v-model="name"
                type="text"
                :placeholder="t('common.namePlaceholder')"
                autocomplete="name"
                :maxlength="NAME_MAX_LENGTH"
                size="lg"
                class="w-full"
              />
            </UFormField>

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
              :hint="t('validation.passwordHint')"
            >
              <UInput
                v-model="password"
                type="password"
                :placeholder="t('common.choosePassword')"
                autocomplete="new-password"
                :minlength="PASSWORD_MIN_LENGTH"
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
              {{ t('register.createAccount') }}
            </UButton>
          </form>

          <AtprotoSignInForm v-else />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { errorMessage } from '#shared/api'
import {
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateName,
  validatePassword,
} from '#shared/entities/user'
import { AtprotoSignInForm } from '~/features/user/sign-in-with-atproto'

const { signIn } = useAuth()
const { t } = useI18n()

useSeoMeta({
  title: () => t('meta.title.register'),
})

const passwordAuth = useRuntimeConfig().public.passwordAuth

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

const handleRegister = async () => {
  const invalid = validateName(name.value) ?? validatePassword(password.value)
  if (invalid) {
    error.value = t(invalid)
    return
  }

  error.value = ''
  pending.value = true

  try {
    await $fetch('/api/register', {
      method: 'POST',
      body: {
        name: name.value,
        email: email.value,
        password: password.value,
      },
    })

    const result = await signIn('credentials', {
      email: email.value,
      password: password.value,
      redirect: false,
    })

    if (result?.error) {
      error.value = t('errors.accountCreatedLoginFailed')
    } else {
      navigateTo('/')
    }
  } catch (e) {
    error.value = t(errorMessage(e, 'errors.registrationFailed'))
  } finally {
    pending.value = false
  }
}
</script>
