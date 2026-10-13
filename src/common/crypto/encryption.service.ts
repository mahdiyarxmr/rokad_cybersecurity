import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { normalizePersianDigits } from '../utils/jalali.util';
import { resolveSecret } from '../security/security-policy';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptionKey: Buffer;
  private readonly blindIndexKey: Buffer;
  private readonly auditPepper: string;

  constructor(private readonly configService: ConfigService) {
    const encKeyHex = resolveSecret(
      'APP_ENCRYPTION_KEY',
      this.configService.get<string>('APP_ENCRYPTION_KEY'),
      { minLength: 64 },
    );
    const blindKeyHex = resolveSecret(
      'APP_BLIND_INDEX_KEY',
      this.configService.get<string>('APP_BLIND_INDEX_KEY'),
      { minLength: 64 },
    );
    this.auditPepper = resolveSecret(
      'AUDIT_HASH_PEPPER',
      this.configService.get<string>('AUDIT_HASH_PEPPER'),
      { minLength: 32 },
    );

    this.encryptionKey = /^[0-9a-fA-F]{64}$/.test(encKeyHex)
      ? Buffer.from(encKeyHex, 'hex')
      : crypto.createHash('sha256').update(encKeyHex).digest();
    this.blindIndexKey = /^[0-9a-fA-F]{64}$/.test(blindKeyHex)
      ? Buffer.from(blindKeyHex, 'hex')
      : crypto.createHash('sha256').update(blindKeyHex).digest();
  }

  /**
   * Encrypt sensitive string using authenticated AES-256-GCM.
   * Output format: hex(iv):hex(authTag):hex(ciphertext)
   */
  encrypt(plaintext: string | null | undefined): string | null {
    if (!plaintext) return null;

    try {
      // 12-byte IV is standard and optimal for GCM
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (err: any) {
      this.logger.error(`Encryption failed: ${err.message}`);
      throw new Error('خطا در رمزنگاری داده‌های حساس');
    }
  }

  /**
   * Decrypt AES-256-GCM ciphertext.
   * Input format: hex(iv):hex(authTag):hex(ciphertext)
   */
  decrypt(ciphertext: string | null | undefined): string | null {
    if (!ciphertext) return null;

    // Check if ciphertext is in expected format (iv:tag:data)
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      // If not encrypted (e.g. legacy plain text), return as-is for backward compatibility
      return ciphertext;
    }

    try {
      const [ivHex, tagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(tagHex, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (err: any) {
      this.logger.error(`Decryption failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Compute deterministic HMAC-SHA256 blind index using APP_BLIND_INDEX_KEY.
   * Allows fast exact-match lookups in PostgreSQL without decrypting rows.
   */
  blindIndex(value: string | null | undefined): string | null {
    if (!value) return null;

    // Normalize Persian/Arabic digits and whitespace for canonical matching
    const normalized = normalizePersianDigits(value.trim());

    return crypto
      .createHmac('sha256', this.blindIndexKey)
      .update(normalized)
      .digest('hex');
  }

  /**
   * Compute immutable chained SHA-256 hash for Audit Log records
   */
  computeAuditHash(data: {
    id: string;
    tenantId: string;
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    timestamp: string;
    previousHash?: string | null;
    payload?: any;
  }): string {
    const rawPayload = data.payload ? JSON.stringify(data.payload) : '';
    const chainContent = [
      data.id,
      data.tenantId,
      data.userId || 'SYSTEM',
      data.action,
      data.entity,
      data.entityId || '',
      data.timestamp,
      data.previousHash || 'GENESIS_BLOCK_ROKAD_2026',
      rawPayload,
      this.auditPepper,
    ].join('|');

    return crypto.createHash('sha256').update(chainContent).digest('hex');
  }
}
