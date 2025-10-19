/// <reference types="vite/client" />

// CSS module type declarations
declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.css?url' {
  const content: string;
  export default content;
}

// Other asset types
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}
