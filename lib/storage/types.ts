export type UploadDriver = "local" | "r2";

export type UploadFolder =
  | "avatars"
  | "banners"
  | "clans"
  | "news"
  | "store"
  | "general"
  | "demos";

export type StoredObject = {
  key: string;
  publicPath: string;
  contentType: string;
  size: number;
};

export interface StorageDriver {
  write(key: string, buffer: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
  exists(key: string): Promise<boolean>;
  checkWritable(): Promise<{ ok: boolean; error?: string }>;
}
