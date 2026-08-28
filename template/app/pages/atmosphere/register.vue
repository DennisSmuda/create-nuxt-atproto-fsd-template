<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-default">
    <div class="w-full max-w-sm">
      <div class="rounded-xl bg-elevated border border-default p-6 sm:p-8">
        <p
          v-if="loading"
          class="text-center text-toned"
        >
          {{ t('common.loading') }}
        </p>

        <!-- No usable ticket means there is nothing to sign up *as*. -->
        <div
          v-else-if="!handle"
          class="space-y-6"
        >
          <UAlert
            :title="t('errors.invalidTicket')"
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
        </div>

        <div
          v-else
          class="w-full space-y-6"
        >
          <div class="flex flex-col text-center">
            <h1
              class="font-display text-3xl font-extrabold tracking-tighter text-highlighted text-balance"
            >
              {{ t('atmosphere.finishTitle') }}
            </h1>
            <p class="mt-2 text-base text-toned">
              {{ t('atmosphere.signedInAs', { handle }) }}
            </p>
          </div>

          <form
            class="space-y-5"
            @submit.prevent="submit"
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
              :disabled="pending || !name.trim()"
            >
              {{ t('register.createAccount') }}
            </UButton>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { errorMessage } from '#shared/api'
import { NAME_MAX_LENGTH } from '#shared/entities/user'
import { readAtprotoTicket } from '~/features/user/sign-in-with-atproto'

const { signIn } = useAuth()
const { t } = useI18n()

useSeoMeta({
  title: () => t('meta.title.atmosphereRegister'),
})

// Only readable on the client — a fragment never reaches the server — so this
// is filled in on mount and everything that needs it waits for `loading`.
const ticket = ref('')

// Asked for rather than read off the URL: what is shown reads as "this is the
// identity the account you are about to open will belong to", and only the
// ticket can say that.
const handle = ref('')
const loading = ref(true)

const name = ref('')
const error = ref('')
const pending = ref(false)

onMounted(async () => {
  ticket.value = readAtprotoTicket()

  if (!ticket.value) {
    loading.value = false
    return
  }

  try {
    // In the body, not the query: a ticket is a bearer credential, and a query
    // string is exactly what `readAtprotoTicket` keeps it out of.
    const pendingSignup = await $fetch<{ handle: string; displayName: string | null }>(
      '/api/atproto/pending',
      {
        method: 'POST',
        body: { ticket: ticket.value },
      },
    )
    handle.value = pendingSignup.handle
    // A guess at what to call them, which is why the field stays editable.
    name.value = (
      pendingSignup.displayName ??
      pendingSignup.handle.split('.')[0] ??
      ''
    ).slice(0, NAME_MAX_LENGTH)
  } catch {
    // Unknown, expired or already spent all mean the same thing here.
    handle.value = ''
  } finally {
    loading.value = false
  }
})

const submit = async () => {
  if (!ticket.value) {
    error.value = t('errors.invalidTicket')
    return
  }

  error.value = ''
  pending.value = true

  try {
    // Creating the account spends the signup ticket, so a failure past this
    // point cannot be retried from this page: the error says start again.
    const { ticket: signinTicket } = await $fetch<{ ticket: string }>(
      '/api/atproto/register',
      {
        method: 'POST',
        body: { ticket: ticket.value, name: name.value },
      },
    )

    const result = await signIn('atproto', { ticket: signinTicket, redirect: false })

    if (result?.error) {
      error.value = t('errors.accountCreatedLoginFailed')
      return
    }

    await navigateTo('/', { replace: true })
  } catch (e) {
    error.value = t(errorMessage(e, 'errors.registrationFailed'))
  } finally {
    pending.value = false
  }
}
</script>
