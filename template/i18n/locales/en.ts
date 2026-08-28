export default {
  meta: {
    title: {
      home: 'Home',
      login: 'Log In',
      atmosphereSignIn: 'Signing In',
      atmosphereRegister: 'Finish Signing Up',
    },
  },
  common: {
    name: 'Name',
    namePlaceholder: 'Enter your name',
    loading: 'Loading…',
    logOut: 'Log Out',
  },
  login: {
    title: 'Welcome!',
    continue: 'Continue',
    handleLabel: 'Your Atmosphere Handle',
    handleHint: 'e.g. alice.bsky.social',
    handlePlaceholder: 'you.bsky.social',
  },
  register: {
    createAccount: 'Create account',
  },
  atmosphere: {
    signingIn: 'Signing you in…',
    backToLogin: 'Back to login',
    finishTitle: 'One more thing',
    signedInAs: "Signed in as {'@'}{handle}",
  },
  home: {
    signedInAs: 'Signed in as {label}',
    nextSteps:
      'Start building on top of the auth in server/domain/user and the FSD layers in app/ and server/.',
  },
  validation: {
    nameRequired: 'Name is required',
    nameTooLong: 'Name must be 80 characters or fewer',
  },
  errors: {
    unauthorized: 'Unauthorized',
    notFound: 'Not found',
    userNotFound: 'User not found',
    handleRequired: 'An Atmosphere handle is required',
    atprotoHandleNotFound: 'We could not find that Atmosphere handle',
    atprotoLoginFailed: 'Atmosphere sign-in did not complete. Please try again.',
    atprotoAlreadyLinked: 'This Atmosphere account already has an account here',
    signupNotAllowed: 'Sign-ups are invite-only right now.',
    invalidTicket: 'This sign-in link has expired. Please try again.',
    tooManyRequests: 'Too many attempts. Please wait a moment and try again.',
    registrationFailed: 'An error occurred during registration',
    accountCreatedLoginFailed: 'Account created but login failed. Please try logging in.',
    accountNotSettled: 'This account cannot be deleted yet.',
  },
}
