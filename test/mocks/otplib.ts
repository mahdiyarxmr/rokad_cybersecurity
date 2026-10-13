export function generateSecret(): string {
  return 'JBSWY3DPEHPK3PXP';
}

export function generateURI(options: any): string {
  return `otpauth://totp/${options?.label || 'user'}?secret=${options?.secret || 'secret'}&issuer=${options?.issuer || 'Rokad'}`;
}

export function verifySync(options: { token: string; secret: string }): { valid: boolean } {
  return { valid: true };
}
