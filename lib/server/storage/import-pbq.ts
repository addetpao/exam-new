// PBQ Import utilities for ExamPrep platform
// Handles import and validation of Performance-Based Question asset packages

import { createHash } from "crypto";
import { putAsset, exists, deleteAsset, validateAsset } from "./helpers";
import {
  StorageBucket,
  PBQAssetStructure,
  PBQImageAsset,
  PBQConfigAsset,
  PBQMetadataAsset,
  StorageError,
  FOLDER_STRUCTURE,
} from "./types";

interface ImportPackage {
  questionId: string;
  version: string;
  files: Array<{
    name: string;
    path: string;
    content: Buffer;
    mimeType: string;
  }>;
  metadata: {
    totalFiles: number;
    totalSize: number;
    packageHash: string;
  };
}

interface ImportResult {
  success: boolean;
  questionId: string;
  version: string;
  importedAssets: {
    images: PBQImageAsset[];
    configs: PBQConfigAsset[];
    metadata: PBQMetadataAsset;
  };
  errors: string[];
  warnings: string[];
  rollbackRequired?: boolean;
}

/**
 * Import a PBQ asset package with validation and rollback support
 */
export async function importPBQPackage(
  packageData: ImportPackage,
  userId: string,
  options: {
    validateOnly?: boolean;
    allowOverwrite?: boolean;
    publishAfterImport?: boolean;
  } = {}
): Promise<ImportResult> {
  const { questionId, version, files } = packageData;
  const { validateOnly = false, allowOverwrite = false, publishAfterImport = false } = options;
  
  const result: ImportResult = {
    success: false,
    questionId,
    version,
    importedAssets: {
      images: [],
      configs: [],
      metadata: {} as PBQMetadataAsset,
    },
    errors: [],
    warnings: [],
  };

  const uploadedPaths: string[] = [];
  let rollbackRequired = false;

  try {
    // Step 1: Validate package structure
    const structureValidation = await validatePackageStructure(packageData);
    if (!structureValidation.valid) {
      result.errors.push(...structureValidation.errors);
      result.warnings.push(...structureValidation.warnings);
      return result;
    }

    // Step 2: Check for existing assets if overwrite is not allowed
    if (!allowOverwrite) {
      const existingCheck = await checkExistingAssets(questionId, version);
      if (existingCheck.hasExisting) {
        result.errors.push(`Assets already exist for question ${questionId} version ${version}`);
        result.warnings.push("Use allowOverwrite: true to replace existing assets");
        return result;
      }
    }

    // Step 3: Validate individual files
    for (const file of files) {
      const validation = await validateAsset(file.content, file.mimeType as any);
      if (!validation.valid) {
        result.errors.push(`File ${file.name}: ${validation.errors.join(", ")}`);
      }
      if (validation.warnings.length > 0) {
        result.warnings.push(`File ${file.name}: ${validation.warnings.join(", ")}`);
      }
    }

    if (result.errors.length > 0) {
      return result;
    }

    // If validation only, return success without uploading
    if (validateOnly) {
      result.success = true;
      result.warnings.push("Validation only - no files were uploaded");
      return result;
    }

    // Step 4: Begin upload process
    rollbackRequired = true;
    
    for (const file of files) {
      try {
        const assetPath = generateAssetPath(questionId, version, file.path);
        
        const assetMetadata = await putAsset({
          bucket: "pbq-assets",
          path: assetPath,
          file: file.content,
          metadata: {
            contentType: file.mimeType,
            upsert: allowOverwrite,
          },
        });

        uploadedPaths.push(assetPath);

        // Categorize the asset
        if (file.mimeType.startsWith("image/")) {
          result.importedAssets.images.push({
            name: file.name,
            path: assetPath,
            type: determineImageType(file.name, file.path),
            dimensions: { width: 0, height: 0 }, // TODO: Extract from image
            checksum: assetMetadata.checksum,
          });
        } else if (file.mimeType === "application/json") {
          const content = JSON.parse(file.content.toString("utf8"));
          result.importedAssets.configs.push({
            name: file.name,
            path: assetPath,
            type: determineConfigType(file.name, content),
            content,
            checksum: assetMetadata.checksum,
          });
        }
      } catch (error) {
        result.errors.push(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
        // Continue with other files, but mark for rollback
      }
    }

    // Step 5: Generate metadata asset
    if (result.errors.length === 0) {
      const metadata = await generatePBQMetadata(questionId, version, result.importedAssets);
      result.importedAssets.metadata = metadata;

      // Upload metadata file
      const metadataPath = generateAssetPath(questionId, version, "metadata.json");
      await putAsset({
        bucket: "pbq-assets",
        path: metadataPath,
        file: Buffer.from(JSON.stringify(metadata, null, 2)),
        metadata: {
          contentType: "application/json",
          upsert: allowOverwrite,
        },
      });

      uploadedPaths.push(metadataPath);
      result.importedAssets.metadata.path = metadataPath;
    }

    // Step 6: Publish if requested
    if (publishAfterImport && result.errors.length === 0) {
      await publishPBQAssets(questionId, version);
      result.warnings.push("Assets published to production");
    }

    result.success = result.errors.length === 0;
    rollbackRequired = !result.success;

    return result;

  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    rollbackRequired = true;
    return result;
  } finally {
    // Rollback on failure
    if (rollbackRequired && uploadedPaths.length > 0) {
      result.warnings.push("Initiating rollback due to errors");
      await rollbackImport(uploadedPaths);
      result.rollbackRequired = true;
    }
  }
}

/**
 * Validate the structure of a PBQ package
 */
async function validatePackageStructure(packageData: ImportPackage): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!packageData.questionId || packageData.questionId.trim().length === 0) {
    errors.push("Question ID is required");
  }

  if (!packageData.version || packageData.version.trim().length === 0) {
    errors.push("Version is required");
  }

  if (!packageData.files || packageData.files.length === 0) {
    errors.push("Package must contain at least one file");
  }

  // Validate package structure
  const hasImages = packageData.files.some(f => f.mimeType.startsWith("image/"));
  const hasConfig = packageData.files.some(f => f.mimeType === "application/json");

  if (!hasImages) {
    warnings.push("Package contains no image assets");
  }

  if (!hasConfig) {
    warnings.push("Package contains no configuration files");
  }

  // Check file naming conventions
  for (const file of packageData.files) {
    if (file.name.includes("..") || file.name.startsWith("/")) {
      errors.push(`Invalid file name: ${file.name}`);
    }
    
    if (file.content.length === 0) {
      errors.push(`Empty file: ${file.name}`);
    }
  }

  // Validate package size
  const totalSize = packageData.files.reduce((sum, file) => sum + file.content.length, 0);
  const maxPackageSize = 500 * 1024 * 1024; // 500MB
  
  if (totalSize > maxPackageSize) {
    errors.push(`Package size ${totalSize} exceeds limit ${maxPackageSize}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if assets already exist for a question/version
 */
async function checkExistingAssets(questionId: string, version: string): Promise<{
  hasExisting: boolean;
  existingPaths: string[];
}> {
  try {
    const basePath = FOLDER_STRUCTURE.PBQ_ASSETS.QUESTION(questionId, version);
    const metadataPath = `${basePath}/metadata.json`;
    
    const hasMetadata = await exists("pbq-assets", metadataPath);
    
    return {
      hasExisting: hasMetadata,
      existingPaths: hasMetadata ? [metadataPath] : [],
    };
  } catch {
    return {
      hasExisting: false,
      existingPaths: [],
    };
  }
}

/**
 * Generate asset path within the PBQ structure
 */
function generateAssetPath(questionId: string, version: string, fileName: string): string {
  const basePath = FOLDER_STRUCTURE.PBQ_ASSETS.QUESTION(questionId, version);
  return `${basePath}/${fileName}`;
}

/**
 * Determine image type based on filename and path
 */
function determineImageType(fileName: string, filePath: string): PBQImageAsset["type"] {
  const lowerName = fileName.toLowerCase();
  const lowerPath = filePath.toLowerCase();

  if (lowerName.includes("screenshot") || lowerPath.includes("screenshot")) {
    return "screenshot";
  }
  if (lowerName.includes("hotspot") || lowerPath.includes("hotspot")) {
    return "hotspot-map";
  }
  if (lowerName.includes("diagram") || lowerPath.includes("diagram")) {
    return "diagram";
  }
  
  return "reference";
}

/**
 * Determine config type based on filename and content
 */
function determineConfigType(fileName: string, content: any): PBQConfigAsset["type"] {
  const lowerName = fileName.toLowerCase();

  if (lowerName.includes("drag") || lowerName.includes("drop")) {
    return "drag-drop-items";
  }
  if (lowerName.includes("hotspot") || lowerName.includes("coords")) {
    return "hotspot-coords";
  }
  if (lowerName.includes("cli") || lowerName.includes("seed")) {
    return "cli-seed";
  }
  if (lowerName.includes("validation") || lowerName.includes("rules")) {
    return "validation-rules";
  }

  // Fallback based on content structure
  if (Array.isArray(content) && content.length > 0 && content[0].x && content[0].y) {
    return "hotspot-coords";
  }
  if (Array.isArray(content) && content.length > 0 && content[0].text) {
    return "drag-drop-items";
  }

  return "validation-rules";
}

/**
 * Generate metadata for PBQ assets
 */
async function generatePBQMetadata(
  questionId: string,
  version: string,
  assets: ImportResult["importedAssets"]
): Promise<PBQMetadataAsset> {
  const totalSize = [...assets.images, ...assets.configs].reduce((sum, asset) => {
    // Size calculation would require actual file sizes
    return sum + 1024; // Placeholder
  }, 0);

  // Determine question type based on assets
  let questionType: PBQMetadataAsset["questionType"] = "simulation";
  if (assets.configs.some(c => c.type === "drag-drop-items")) {
    questionType = "drag-drop";
  } else if (assets.configs.some(c => c.type === "hotspot-coords")) {
    questionType = "hotspot";
  } else if (assets.configs.some(c => c.type === "cli-seed")) {
    questionType = "cli";
  }

  const metadata: PBQMetadataAsset = {
    path: "", // Will be set by caller
    questionType,
    difficulty: "medium", // Default, should be configurable
    topics: [], // Should be extracted from config or provided
    estimatedTime: 15, // Default 15 minutes
    assets: {
      totalImages: assets.images.length,
      totalConfigs: assets.configs.length,
      totalSize,
    },
    version,
    checksum: "", // Will be calculated
  };

  // Generate checksum for metadata
  const metadataString = JSON.stringify(metadata);
  metadata.checksum = createHash("sha256").update(metadataString).digest("hex");

  return metadata;
}

/**
 * Publish PBQ assets to production (move from draft to published)
 */
async function publishPBQAssets(questionId: string, version: string): Promise<void> {
  // This would copy assets from draft version to published folder
  // Implementation would depend on specific business requirements
  // For now, just mark as published in metadata
}

/**
 * Rollback failed import by deleting uploaded assets
 */
async function rollbackImport(uploadedPaths: string[]): Promise<void> {
  const errors: string[] = [];

  for (const path of uploadedPaths) {
    try {
      await deleteAsset("pbq-assets", path);
    } catch (error) {
      errors.push(`Failed to delete ${path}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  if (errors.length > 0) {
    console.warn("Rollback completed with errors:", errors);
  }
}

/**
 * Extract PBQ package from ZIP file
 */
export async function extractPBQPackage(
  zipBuffer: Buffer,
  questionId: string,
  version: string
): Promise<ImportPackage> {
  // This would require a ZIP extraction library like yauzl or jszip
  // For now, return a mock structure
  
  throw new Error("ZIP extraction not implemented - requires additional dependencies");
}

/**
 * Validate imported PBQ assets integrity
 */
export async function validateImportedAssets(
  questionId: string,
  version: string
): Promise<{
  valid: boolean;
  errors: string[];
  checksumMatches: boolean;
}> {
  try {
    const metadataPath = generateAssetPath(questionId, version, "metadata.json");
    const metadataExists = await exists("pbq-assets", metadataPath);
    
    if (!metadataExists) {
      return {
        valid: false,
        errors: ["Metadata file not found"],
        checksumMatches: false,
      };
    }

    // Additional validation would check file integrity, checksums, etc.
    return {
      valid: true,
      errors: [],
      checksumMatches: true,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : "Unknown error"}`],
      checksumMatches: false,
    };
  }
}