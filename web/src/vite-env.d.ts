/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "mock" uses the built-in sample data; anything else uses the API. */
  readonly VITE_DATA_SOURCE?: string
  /** Address of the API when it is not served from the web app's own address. */
  readonly VITE_API_URL?: string
}
