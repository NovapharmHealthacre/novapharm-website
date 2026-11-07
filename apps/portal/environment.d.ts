declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_COGNITO_STAGING_VERIFICATION_ENABLED?: string;
    readonly NEXT_PUBLIC_COGNITO_PORTAL_SESSION_ENABLED?: string;
  }
}
