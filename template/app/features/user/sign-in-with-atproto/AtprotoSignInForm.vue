<template>
  <form
    class="space-y-3"
    @submit.prevent="submit"
  >
    <UFormField
      :label="t('login.handleLabel')"
      name="handle"
      required
    >
      <UInput
        v-model="handle"
        type="text"
        :placeholder="t('login.handlePlaceholder')"
        autocapitalize="none"
        autocorrect="off"
        spellcheck="false"
        size="lg"
        class="w-full"
      />
    </UFormField>

    <p class="text-sm text-dimmed text-pretty -mt-2">
      {{ t('login.handleHint') }}
    </p>

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
      size="lg"
      color="neutral"
      :loading="pending"
      :disabled="pending || !handle.trim()"
    >
      {{ t('login.continue') }}
    </UButton>
  </form>
</template>

<script setup lang="ts">
import { errorMessage } from '#shared/api'

const { t } = useI18n()

const handle = ref('')
const error = ref('')
const pending = ref(false)

const submit = async () => {
  error.value = ''
  pending.value = true

  try {
    const { url } = await $fetch<{ url: string }>('/api/atproto/authorize', {
      method: 'POST',
      body: { handle: handle.value },
    })

    // Their PDS, not ours. `pending` is left standing on purpose so the button
    // cannot be pressed twice while the browser is on its way out.
    await navigateTo(url, { external: true })
  } catch (e) {
    error.value = t(errorMessage(e, 'errors.atprotoLoginFailed'))
    pending.value = false
  }
}
</script>
