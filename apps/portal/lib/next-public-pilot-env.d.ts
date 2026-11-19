/** Build-time UI opt-in only. Server-side session and staging pilot gates remain authoritative. */
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_WMS_PILOT_UI_ENABLED?: string;
    /** Browser-exposed MapKit JS token, restricted to authorised domains. Build-time only. */
    NEXT_PUBLIC_APPLE_MAPS_TOKEN?: string;
  }
}
