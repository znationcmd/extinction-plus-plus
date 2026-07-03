import crypto from 'crypto';

function getSecret() {
  const raw = process.env.SECRET_KEY || process.env.SESSION_SECRET || process.env.ENCRYPTION_SECRET || 'CHANGE_ME_EXTINCTION_RSS_LOCAL_DEV_SECRET';
  return crypto.createHash('sha256').update(String(raw)).digest();
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
  if (s.length <= 10) return `${s.slice(0, 2)}••••`;
  return `${s.slice(0, 6)}••••${s.slice(-4)}`;
}
