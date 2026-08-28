<template>
  <UButton
    variant="ghost"
    class="shrink-0"
    color="neutral"
    @click="handleLogout"
  >
    <UIcon name="i-lucide-log-out" />
    <span class="">
      {{ t('common.logOut') }}
    </span>
  </UButton>
</template>

<script setup lang="ts">
const { signOut } = useAuth()
const { t } = useI18n()

const handleLogout = async () => {
  await signOut({ callbackUrl: '/login' })
}
</script>
