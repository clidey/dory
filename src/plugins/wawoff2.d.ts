declare module 'wawoff2/decompress.js' {
  export default function decompress(buffer: Uint8Array): Promise<Uint8Array>;
}
