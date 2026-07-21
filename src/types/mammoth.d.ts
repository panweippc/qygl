declare module 'mammoth' {
  interface ConvertToHtmlOptions {
    arrayBuffer: ArrayBuffer;
  }

  interface ConvertResult {
    value: string;
    messages: any[];
  }

  export function convertToHtml(options: ConvertToHtmlOptions): Promise<ConvertResult>;
}