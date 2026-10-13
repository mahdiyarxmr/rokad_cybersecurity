import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { BruteForceService } from '../../common/redis/brute-force.service';

@Injectable()
export class PasswordVaultService {
  private readonly logger = new Logger(PasswordVaultService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bruteForceService: BruteForceService,
  ) {}

  /**
   * Derive 32-byte AES key from master passphrase and salt using PBKDF2 (SHA-256)
   */
  private deriveAesKey(masterKey: string, salt: string): Buffer {
    return crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
  }

  /**
   * Encrypt private key with derived AES-256-GCM key
   */
  private encryptPrivateKey(privateKeyPem: string, aesKey: Buffer): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    let encrypted = cipher.update(privateKeyPem, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt private key with derived AES-256-GCM key
   */
  private decryptPrivateKey(encryptedRecord: string, aesKey: Buffer): string {
    const [ivHex, authTagHex, encryptedDataHex] = encryptedRecord.split(':');
    if (!ivHex || !authTagHex || !encryptedDataHex) {
      throw new BadRequestException('ساختار کلید خصوصی گاوصندوق نامعتبر است');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Encrypt plaintext password using school's RSA Public Key (OAEP SHA-256)
   */
  public encryptWithPublicKey(publicKeyPem: string, plaintext: string): string {
    const buffer = Buffer.from(plaintext, 'utf8');
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer,
    );
    return encrypted.toString('base64');
  }

  /**
   * Decrypt ciphertext password using school's RSA Private Key (OAEP SHA-256)
   */
  public decryptWithPrivateKey(privateKeyPem: string, ciphertextBase64: string): string {
    const buffer = Buffer.from(ciphertextBase64, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer,
    );
    return decrypted.toString('utf8');
  }

  /**
   * Ensure the tenant has an initialized RSA keypair and master key
   */
  async ensureTenantVault(
    tenantId: string,
    initialMasterKey?: string,
  ): Promise<{ publicKey: string; generatedMasterKey?: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        vaultPublicKey: true,
        vaultEncryptedPrivateKey: true,
      },
    });

    if (!tenant) throw new NotFoundException('مدرسه مورد نظر یافت نشد');

    if (tenant.vaultPublicKey && tenant.vaultEncryptedPrivateKey) {
      return { publicKey: tenant.vaultPublicKey };
    }

    // Generate new RSA-2048 keypair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    const masterKey = initialMasterKey?.trim() || `RokadVault@${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const aesKey = this.deriveAesKey(masterKey, salt);
    const vaultEncryptedPrivateKey = this.encryptPrivateKey(privateKey, aesKey);
    const vaultKeyHash = await argon2.hash(masterKey);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        vaultPublicKey: publicKey,
        vaultEncryptedPrivateKey,
        vaultKeySalt: salt,
        vaultKeyHash,
        vaultKeyUpdatedAt: new Date(),
      },
    });

    this.logger.log(`Initialized password vault for tenant: ${tenantId}`);
    return {
      publicKey,
      generatedMasterKey: initialMasterKey ? undefined : masterKey,
    };
  }

  /**
   * Setup or change master key for a tenant vault
   */
  async setupMasterKey(
    tenantId: string,
    newMasterKey: string,
    currentMasterKey?: string,
    isPlatformAdmin: boolean = false,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) throw new NotFoundException('مدرسه یافت نشد');

    if (!tenant.vaultPublicKey || !tenant.vaultEncryptedPrivateKey) {
      // First time setup
      await this.ensureTenantVault(tenantId, newMasterKey);
      return { success: true, message: 'گاوصندوق رمزها با موفقیت راه‌اندازی شد' };
    }

    // Change existing key: verify currentMasterKey unless caller is platform admin
    if (!isPlatformAdmin) {
      if (!currentMasterKey) {
        throw new BadRequestException('ورود کلید مستر قبلی الزامی است');
      }
      const isCurrentValid = await argon2.verify(tenant.vaultKeyHash || '', currentMasterKey);
      if (!isCurrentValid) {
        throw new UnauthorizedException('کلید مستر فعلی نادرست است');
      }
    }

    // Decrypt private key with old key
    let privateKeyPem: string;
    if (currentMasterKey && tenant.vaultKeySalt) {
      const oldAesKey = this.deriveAesKey(currentMasterKey, tenant.vaultKeySalt);
      privateKeyPem = this.decryptPrivateKey(tenant.vaultEncryptedPrivateKey, oldAesKey);
    } else {
      throw new BadRequestException('برای تغییر کلید مستر، وارد کردن کلید فعلی الزامی است');
    }

    // Re-encrypt private key with new key
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newAesKey = this.deriveAesKey(newMasterKey, newSalt);
    const newEncryptedPrivateKey = this.encryptPrivateKey(privateKeyPem, newAesKey);
    const newKeyHash = await argon2.hash(newMasterKey);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        vaultEncryptedPrivateKey: newEncryptedPrivateKey,
        vaultKeySalt: newSalt,
        vaultKeyHash: newKeyHash,
        vaultKeyUpdatedAt: new Date(),
      },
    });

    return { success: true, message: 'کلید مستر گاوصندوق با موفقیت به‌روزرسانی شد' };
  }

  /**
   * Encrypt a password for a given tenant (returns encrypted base64 string)
   */
  async encryptPasswordForTenant(tenantId: string, plaintext: string): Promise<string | null> {
    if (!plaintext) return null;
    try {
      let tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { vaultPublicKey: true },
      });

      let publicKey = tenant?.vaultPublicKey;
      if (!publicKey) {
        const vault = await this.ensureTenantVault(tenantId);
        publicKey = vault.publicKey;
      }

      return this.encryptWithPublicKey(publicKey, plaintext);
    } catch (err: any) {
      this.logger.error(`Failed to encrypt password for tenant ${tenantId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Reveal target user password using the school admin's master key
   */
  async revealPassword(
    adminUserId: string,
    targetUserId: string,
    masterKey: string,
    ipAddress?: string,
    userAgent?: string,
    reason?: string,
  ) {
    const adminUser = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      include: { tenant: true },
    });

    if (!adminUser) throw new NotFoundException('حساب کاربری مدیر یافت نشد');

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { tenant: true },
    });

    if (!targetUser) throw new NotFoundException('کاربر هدف یافت نشد');

    // Tenant boundary check
    if (!adminUser.isPlatformAdmin && adminUser.tenantId !== targetUser.tenantId) {
      throw new ForbiddenException('شما فقط مجاز به مشاهده رمز کاربران مرکز آموزشی خود هستید');
    }

    const tenant = targetUser.tenant;
    if (!tenant) throw new NotFoundException('مرکز آموزشی مربوطه یافت نشد');

    if (!tenant.vaultEncryptedPrivateKey || !tenant.vaultKeySalt || !tenant.vaultKeyHash) {
      throw new BadRequestException('گاوصندوق رمز عبور برای این مرکز آموزشی فعال نشده است');
    }

    // Brute-force protection on master key
    const bruteForceIdentifier = `vault:${adminUserId}`;
    await this.bruteForceService.checkLoginAllowed(bruteForceIdentifier, ipAddress);

    // Verify master key hash
    const isMasterKeyValid = await argon2.verify(tenant.vaultKeyHash, masterKey);
    if (!isMasterKeyValid) {
      await this.bruteForceService.recordFailedAttempt(bruteForceIdentifier, ipAddress);
      throw new UnauthorizedException('کلید امنیتی مستر مدیر نادرست است');
    }

    // Reset brute-force counter on success
    await this.bruteForceService.recordLoginSuccess(bruteForceIdentifier, ipAddress);

    const encryptedPassword = targetUser.encryptedPassword;
    if (!encryptedPassword) {
      throw new BadRequestException(
        'نسخه رمزنگاری‌شده این رمز در گاوصندوق موجود نیست. رمز را بازنشانی کنید؛ بازیابی از روی شناسه کاربر انجام نمی‌شود.',
      );
    }

    // Decrypt RSA private key with master key
    const aesKey = this.deriveAesKey(masterKey, tenant.vaultKeySalt);
    const privateKeyPem = this.decryptPrivateKey(tenant.vaultEncryptedPrivateKey, aesKey);

    // Decrypt user password
    const plaintextPassword = this.decryptWithPrivateKey(privateKeyPem, encryptedPassword);

    // Record immutable Audit Log
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: adminUser.id,
          action: 'PASSWORD_VAULT_REVEAL',
          entity: 'User',
          entityId: targetUser.id,
          newValues: {
            targetUserName: `${targetUser.firstName} ${targetUser.lastName}`,
            targetUserRole: targetUser.role,
            targetUsername: targetUser.username || targetUser.phone,
            reason: reason || 'مشاهده مستقیم توسط مدیر مدرسه در پنل کاربری',
          },
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Failed to create audit log for password reveal: ${auditErr.message}`);
    }

    return {
      plaintextPassword,
      username: targetUser.username || targetUser.phone,
      fullName: `${targetUser.firstName} ${targetUser.lastName}`,
      role: targetUser.role,
      schoolName: tenant.name,
    };
  }

  /**
   * Count members whose password envelope is already stored.
   * Plaintext is never guessed from usernames or national IDs.
   */
  async backfillTenantPasswords(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) throw new NotFoundException('مدرسه یافت نشد');

    await this.ensureTenantVault(tenantId);

    const users = await this.prisma.user.findMany({
      where: { tenantId },
    });

    let alreadyEncrypted = 0;
    let unrecovered = 0;

    for (const user of users) {
      if (user.encryptedPassword) alreadyEncrypted++;
      else unrecovered++;
    }

    this.logger.log(
      `Tenant ${tenantId} vault coverage: Total=${users.length}, AlreadyEncrypted=${alreadyEncrypted}, Missing=${unrecovered}`,
    );

    return {
      total: users.length,
      recovered: 0,
      alreadyEncrypted,
      unrecovered,
    };
  }

  /**
   * Get vault status for a tenant
   */
  async getVaultStatus(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        vaultPublicKey: true,
        vaultKeyUpdatedAt: true,
      },
    });

    if (!tenant) throw new NotFoundException('مدرسه یافت نشد');

    const totalUsers = await this.prisma.user.count({
      where: { tenantId },
    });

    const encryptedUsers = await this.prisma.user.count({
      where: {
        tenantId,
        encryptedPassword: { not: null },
      },
    });

    return {
      isInitialized: !!tenant.vaultPublicKey,
      keyUpdatedAt: tenant.vaultKeyUpdatedAt,
      totalUsers,
      encryptedUsers,
      coveragePercentage: totalUsers > 0 ? Math.round((encryptedUsers / totalUsers) * 100) : 0,
    };
  }
}
