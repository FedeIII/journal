/// <reference types="@remix-run/node" />

declare global {
  interface Window {
    ENV: {
      API_URL: string;
    };
  }
}

export {};
