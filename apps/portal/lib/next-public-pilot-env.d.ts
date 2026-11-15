/** Build-time UI opt-in only. Server-side session and staging pilot gates remain authoritative. */
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_WMS_PILOT_UI_ENABLED?: string;
  }
}
