import {
  Injectable,
  OnModuleInit,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { assertContainedPath, isBlockedUpload, safeBasename } from '../security/security-policy';

export interface UploadResult {
  fileKey: string;
  fileUrl: string;
  fileSizeMb: number;
  mimeType: string;
  originalName: string;
}

const MIME_MAP: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  zip: 'application/zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageDriver: string;
  private verifiedUploadDir: string | null = null;
  private minioClient: any = null;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.storageDriver = this.configService.get<string>('STORAGE_DRIVER', 'disk').toLowerCase();
    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME', 'rokad-storage');
  }

  /**
   * Resilient upload directory resolver.
   * Tests candidates (custom UPLOAD_DIR, ./uploads, /tmp/rokad-uploads)
   * to guarantee write permissions and avoid broken symlinks or ENOENT.
   */
  public getUploadDir(): string {
    if (this.verifiedUploadDir) {
      return this.verifiedUploadDir;
    }

    const customDir = this.configService.get<string>('UPLOAD_DIR');
    const candidates = [
      customDir,
      '/app/uploads',
      '/usr/src/app/uploads',
      path.resolve(process.cwd(), 'uploads'),
      '/tmp/rokad-uploads',
      path.join(os.tmpdir(), 'rokad-uploads'),
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      try {
        // Check if candidate is a broken symlink
        let isBrokenSymlink = false;
        try {
          const lstat = fs.lstatSync(candidate);
          if (lstat.isSymbolicLink() && !fs.existsSync(candidate)) {
            isBrokenSymlink = true;
          }
        } catch {
          // Path doesn't exist yet, which is fine
        }

        if (isBrokenSymlink) {
          this.logger.warn(`Candidate ${candidate} is a broken symlink, skipping.`);
          continue;
        }

        if (!fs.existsSync(candidate)) {
          fs.mkdirSync(candidate, { recursive: true });
        }

        // Test write permission with a probe file
        const probeFile = path.join(candidate, `.probe-${Date.now()}`);
        fs.writeFileSync(probeFile, 'ok');
        fs.unlinkSync(probeFile);

        this.verifiedUploadDir = candidate;
        this.logger.log(`Verified active storage directory: ${candidate}`);
        return candidate;
      } catch (err: any) {
        this.logger.warn(`Storage candidate ${candidate} unusable: ${err.message}. Trying next candidate.`);
      }
    }

    // Absolute fallback: system temp directory
    const tempFallback = path.join(os.tmpdir(), 'rokad-uploads');
    try {
      fs.mkdirSync(tempFallback, { recursive: true });
    } catch {}
    this.verifiedUploadDir = tempFallback;
    return tempFallback;
  }

  async onModuleInit() {
    // 1. Initialize local disk storage
    try {
      const activeDir = this.getUploadDir();
      this.logger.log(`Local Disk Storage initialized at: ${activeDir}`);
    } catch (err: any) {
      this.logger.error(`Storage initialization warning: ${err.message}`);
    }

    // 2. Only attempt MinIO if explicitly configured
    if (this.storageDriver === 'minio') {
      try {
        const Minio = await import('minio');
        const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
        const port = parseInt(this.configService.get<string>('MINIO_PORT', '9000'), 10);
        const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';

        this.minioClient = new Minio.Client({
          endPoint: endpoint,
          port,
          useSSL,
          accessKey: this.configService.get<string>('MINIO_ROOT_USER', ''),
          secretKey: this.configService.get<string>('MINIO_ROOT_PASSWORD', ''),
        });

        const exists = await this.minioClient.bucketExists(this.bucketName);
        if (!exists) {
          await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        }
        this.logger.log(`MinIO storage bucket ready: '${this.bucketName}'`);
      } catch (err: any) {
        this.logger.warn(`MinIO connection unavailable (${err.message}). Defaulting to local disk storage.`);
        this.minioClient = null;
      }
    }
  }

  /**
   * Uploads file buffer directly to disk (or MinIO if explicitly configured)
   */
  async uploadFile(
    tenantId: string,
    moduleName: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ): Promise<UploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('فایل معتبری جهت آپلود ارسال نشده است');
    }
    if (isBlockedUpload(file.originalname, file.mimetype)) {
      throw new BadRequestException('این نوع فایل به‌دلیل ریسک امنیتی مجاز نیست');
    }

    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileId = randomUUID();
    const storedFilename = `${fileId}-${sanitizedFilename}`;
    const sanitizedModule = (moduleName || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileSizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(3));

    // If MinIO is active and initialized
    if (this.storageDriver === 'minio' && this.minioClient) {
      const fileKey = `tenants/${tenantId}/${sanitizedModule}/${storedFilename}`;
      try {
        await this.minioClient.putObject(
          this.bucketName,
          fileKey,
          file.buffer,
          file.size,
          {
            'Content-Type': file.mimetype,
            'x-amz-meta-tenant-id': tenantId,
            'x-amz-meta-original-name': encodeURIComponent(file.originalname),
          },
        );

        const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
        const port = this.configService.get<string>('MINIO_PORT', '9000');
        const fileUrl = `http://${endpoint}:${port}/${this.bucketName}/${fileKey}`;

        return {
          fileKey,
          fileUrl,
          fileSizeMb,
          mimeType: file.mimetype,
          originalName: file.originalname,
        };
      } catch (err: any) {
        this.logger.error(`MinIO upload failed: ${err.message}. Falling back to local disk.`);
      }
    }

    // Local Disk Storage Engine (Guaranteed Resilient)
    const baseDir = this.getUploadDir();
    const targetModuleDir = path.join(baseDir, sanitizedModule);

    try {
      if (!fs.existsSync(targetModuleDir)) {
        fs.mkdirSync(targetModuleDir, { recursive: true });
      }
    } catch (mkdirErr: any) {
      this.logger.warn(`Failed to create ${targetModuleDir}: ${mkdirErr.message}. Retrying at /tmp...`);
      const fallbackModuleDir = path.join('/tmp/rokad-uploads', sanitizedModule);
      fs.mkdirSync(fallbackModuleDir, { recursive: true });
      this.verifiedUploadDir = '/tmp/rokad-uploads';
    }

    const finalModuleDir = path.join(this.getUploadDir(), sanitizedModule);
    if (!fs.existsSync(finalModuleDir)) {
      fs.mkdirSync(finalModuleDir, { recursive: true });
    }

    const fullFilePath = path.join(finalModuleDir, storedFilename);
    await fs.promises.writeFile(fullFilePath, file.buffer);

    const fileKey = `${sanitizedModule}/${storedFilename}`;
    const fileUrl = `/api/v1/storage/files/${sanitizedModule}/${storedFilename}`;

    return {
      fileKey,
      fileUrl,
      fileSizeMb,
      mimeType: file.mimetype,
      originalName: file.originalname,
    };
  }

  /**
   * Resolves local file metadata and security validation for streaming.
   * Searches across possible storage roots to always find uploaded media.
   */
  getFileInfo(moduleName: string, filename: string): {
    fullPath: string;
    size: number;
    mimeType: string;
    originalName?: string;
  } {
    const safeModuleName = safeBasename(moduleName || 'general');
    const filenameVariants = [safeBasename(filename)];

    const searchRoots = [
      this.getUploadDir(),
      this.configService.get<string>('UPLOAD_DIR'),
      '/app/uploads',
      '/usr/src/app/uploads',
      path.resolve(process.cwd(), 'uploads'),
      '/tmp/rokad-uploads',
      path.join(os.tmpdir(), 'rokad-uploads'),
    ].filter(Boolean) as string[];

    let foundPath: string | null = null;
    let foundFilename: string = filenameVariants[0];

    for (const root of searchRoots) {
      for (const name of filenameVariants) {
        // 1. Check under module folder (e.g. uploads/messages/file.mp4)
        const modulePath = assertContainedPath(root, path.join(root, safeModuleName, name));
        if (fs.existsSync(modulePath) && fs.statSync(modulePath).isFile()) {
          foundPath = modulePath;
          foundFilename = name;
          break;
        }
      }
      if (foundPath) break;
    }

    if (!foundPath) {
      throw new NotFoundException('فایل مورد نظر یافت نشد');
    }

    const stat = fs.statSync(foundPath);
    const ext = path.extname(foundFilename).toLowerCase().replace('.', '');
    const mimeType = MIME_MAP[ext] || 'application/octet-stream';

    // Extract human-friendly original name by stripping the UUID prefix if present
    const originalName = foundFilename.replace(/^[0-9a-fA-F-]{36}-/, '');

    return {
      fullPath: foundPath,
      size: stat.size,
      mimeType,
      originalName,
    };
  }

  /**
   * Generates a download URL
   */
  async getPresignedDownloadUrl(fileKey: string, expirySeconds = 900): Promise<string> {
    if (this.storageDriver === 'minio' && this.minioClient) {
      try {
        return await this.minioClient.presignedGetObject(this.bucketName, fileKey, expirySeconds);
      } catch (err: any) {
        // Fallback
      }
    }
    return `/api/v1/storage/files/${fileKey}`;
  }

  /**
   * Generates a presigned upload URL or relative upload endpoint
   */
  async getPresignedUploadUrl(
    tenantId: string,
    moduleName: string,
    originalFilename: string,
    expirySeconds = 900,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileId = randomUUID();
    const storedFilename = `${fileId}-${sanitizedFilename}`;
    const sanitizedModule = (moduleName || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileKey = `${sanitizedModule}/${storedFilename}`;

    if (this.storageDriver === 'minio' && this.minioClient) {
      try {
        const uploadUrl = await this.minioClient.presignedPutObject(
          this.bucketName,
          `tenants/${tenantId}/${fileKey}`,
          expirySeconds,
        );
        return { uploadUrl, fileKey };
      } catch (err: any) {
        // Fallback
      }
    }

    return {
      uploadUrl: `/api/v1/storage/upload`,
      fileKey,
    };
  }

  /**
   * Deletes a file from storage
   */
  async deleteFile(fileKey: string): Promise<void> {
    if (this.storageDriver === 'minio' && this.minioClient) {
      try {
        await this.minioClient.removeObject(this.bucketName, fileKey);
        return;
      } catch (err: any) {
        this.logger.warn(`Failed to delete object from MinIO: ${err.message}`);
      }
    }

    const searchRoots = [
      this.getUploadDir(),
      path.resolve(process.cwd(), 'uploads'),
      '/tmp/rokad-uploads',
      path.join(os.tmpdir(), 'rokad-uploads'),
    ];

    const parts = fileKey.split('/').filter(Boolean).map((part) => safeBasename(part));
    for (const root of searchRoots) {
      try {
        const safePath = assertContainedPath(root, path.join(root, ...parts));
        if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
          await fs.promises.unlink(safePath);
          return;
        }
      } catch {
        // try the next root
      }
    }
  }
}
