// Storage types for ExamPrep platform
// Defines interfaces for storage operations and asset management

export type StorageBucket = "pbq-assets" | "content-media" | "temp-uploads";

export type MimeType = 
  | "image/png"
  | "image/jpeg" 
  | "image/gif"
  | "image/webp"
  | "image/svg+xml"
  | "application/json"
  | "text/plain"
  | "text/csv"
  | "application/pdf"
  | "video/mp4"
  | "application/zip";

export interface AssetMetadata {
  id: string;
  bucket: StorageBucket;
  path: string;
  name: string;
  mimeType: MimeType;
  size: number;
  checksum: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface UploadOptions {
  bucket: StorageBucket;
  path: string;
  file: File | Buffer;
  metadata?: {
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
  };
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds, default 3600 (1 hour)
  download?: boolean; // force download vs inline
  transform?: {
    width?: number;
    height?: number;
    format?: "webp" | "png" | "jpeg";
    quality?: number;
  };
}

export interface PBQAssetStructure {
  questionId: string;
  version: string;
  assets: {
    images: PBQImageAsset[];
    configs: PBQConfigAsset[];
    metadata: PBQMetadataAsset;
  };
}

export interface PBQImageAsset {
  name: string;
  path: string;
  type: "screenshot" | "diagram" | "reference" | "hotspot-map";
  dimensions: {
    width: number;
    height: number;
  };
  checksum: string;
}

export interface PBQConfigAsset {
  name: string;
  path: string;
  type: "drag-drop-items" | "hotspot-coords" | "cli-seed" | "validation-rules";
  content: Record<string, any>;
  checksum: string;
}

export interface PBQMetadataAsset {
  path: string;
  questionType: "drag-drop" | "hotspot" | "cli" | "simulation";
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  estimatedTime: number; // minutes
  assets: {
    totalImages: number;
    totalConfigs: number;
    totalSize: number; // bytes
  };
  version: string;
  publishedAt?: Date;
  checksum: string;
}

export interface StorageError extends Error {
  code: string;
  statusCode: number;
  details?: any;
}

export interface CleanupJobResult {
  processed: number;
  deleted: number;
  errors: Array<{
    path: string;
    error: string;
  }>;
  duration: number; // milliseconds
}

export interface AssetValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    mimeType: MimeType;
    size: number;
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

// Folder structure conventions
export const FOLDER_STRUCTURE = {
  PBQ_ASSETS: {
    BASE: "pbq",
    QUESTION: (questionId: string, version: string) => `pbq/${questionId}/${version}`,
    IMAGES: (questionId: string, version: string) => `pbq/${questionId}/${version}/images`,
    CONFIGS: (questionId: string, version: string) => `pbq/${questionId}/${version}/configs`,
    PUBLISHED: (questionId: string) => `pbq/${questionId}/published`,
  },
  CONTENT_MEDIA: {
    BASE: "content",
    POSTS: (postId: string) => `content/posts/${postId}`,
    GLOBAL: "content/global",
  },
  TEMP_UPLOADS: {
    USER: (userId: string) => userId,
    IMPORT: (userId: string, sessionId: string) => `${userId}/imports/${sessionId}`,
  },
} as const;

// File size limits (in bytes)
export const FILE_LIMITS = {
  PBQ_ASSET: 50 * 1024 * 1024, // 50MB
  CONTENT_MEDIA: 100 * 1024 * 1024, // 100MB
  TEMP_UPLOAD: 200 * 1024 * 1024, // 200MB
  IMPORT_PACKAGE: 500 * 1024 * 1024, // 500MB
} as const;

// Cache control settings
export const CACHE_CONTROL = {
  PUBLIC_ASSETS: "public, max-age=31536000, immutable", // 1 year for published assets
  PRIVATE_TEMP: "private, no-cache, no-store", // No caching for temp files
  CONTENT_MEDIA: "public, max-age=86400", // 1 day for content media
} as const;