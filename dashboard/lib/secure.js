import crypto from 'crypto';

function getSecret() {
  const raw = process.env.SECRET_KEY || process.env.SESSION_SECRET || process.env.ENCRYPTION_SECRET || 'CHANGE_ME_EXTINCTION_RSS_LOCAL_DEV_SECRET';
  return crypto.createHash('sha256').update(String(raw)).digest();
}

export function encrypt(value) {
  if (!value) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decrypt(value) {
  if (!value) return '';
  if (!String(value).startsWith('v1:')) return value;
  const [, ivB64, tagB64, dataB64] = String(value).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getSecret(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

export function maskSecret(value) {
  if (!value) return 'non configuré';
  const s = String(value);
  if (s.startsWith('v1:')) return 'chiffré';
  if (s.length <= 10) return `${s.slice(0, 2)}••••`;
  return `${s.slice(0, 6)}••••${s.slice(-4)}`;
}
