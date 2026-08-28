export default defineNuxtRouteMiddleware((_to) => {
  const { status } = useAuth()

  if (status.value === 'unauthenticated') {
    return navigateTo('/login')
  }
})
