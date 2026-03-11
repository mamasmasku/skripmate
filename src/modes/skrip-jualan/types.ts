export type ProductDisplayType = 'dipegang' | 'dikenakan' | 'digunakan' | 'ditunjuk';

export interface SkripJualanConfig {
  namaProduk: string;
  durasiSkrip: string;
  tone: string;
  jumlahSkrip: number;
  manualHook: string;
  selectedRumus: string[]; // empty = AI pilih
  selectedCTACategory: string;
  soraEnabled: boolean;
  // Sora settings (only used if soraEnabled)
  soraCharacter: string;
  soraSegmentDuration: string;
  soraCharacterAppearance: string;
  soraDialogStrategy: string;
  productDisplayType: ProductDisplayType;
}

export interface ParsedSkrip {
  index: number;
  hookNumber: string;
  rumusName: string;
  hook: string;
  story: string;
  produk: string;
  bukti: string;
  cta: string;
  caption: string;
  hashtags: string;
  soraPrompt?: string;
}

export type CopiedKey =
  | `hook-${number}`
  | `story-${number}`
  | `produk-${number}`
  | `bukti-${number}`
  | `cta-${number}`
  | `caption-${number}`
  | `hashtag-${number}`
  | `full-${number}`
  | `sora-${number}`;