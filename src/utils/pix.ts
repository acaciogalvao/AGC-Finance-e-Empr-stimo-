// PIX Static Payload Generator (BR Code - EMV QRCPS Merchant-Presented Mode / BACEN Specification)

interface PixOptions {
  key: string;
  keyType?: 'celular' | 'cpf' | 'cnpj' | 'email' | 'aleatoria' | string;
  name: string;
  city?: string;
  amount?: number;
  description?: string;
  txid?: string;
}

function crc16(buffer: string): string {
  let crc = 0xffff;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Formats a raw Pix key according to BACEN standards based on key type or auto-detection.
 * - Phone (celular): Must be E.164 format (+55...)
 * - CPF: 11 digits
 * - CNPJ: 14 digits
 * - Email / Aleatória (EVP): Trimmed / Lowercase
 */
export function formatPixKey(rawKey: string, keyType?: string): string {
  if (!rawKey) return '';
  const key = rawKey.trim();
  const type = (keyType || '').toLowerCase().trim();

  // Explicit type 'cpf'
  if (type === 'cpf') {
    return key.replace(/\D/g, '').slice(0, 11);
  }

  // Explicit type 'cnpj'
  if (type === 'cnpj') {
    return key.replace(/\D/g, '').slice(0, 14);
  }

  // Explicit type 'celular' / 'phone' / 'telefone' / 'mobile'
  if (type === 'celular' || type === 'phone' || type === 'telefone' || type === 'mobile') {
    const digits = key.replace(/\D/g, '');
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      return `+${digits}`;
    }
    if (digits.length === 10 || digits.length === 11) {
      return `+55${digits}`;
    }
    return key.startsWith('+') ? key : `+${digits}`;
  }

  // Explicit type 'email'
  if (type === 'email') {
    return key.toLowerCase();
  }

  // Explicit type 'aleatoria' / 'evp'
  if (type === 'aleatoria' || type === 'evp') {
    return key.toLowerCase();
  }

  // Fallback auto-detection if keyType is not explicitly matched
  if (key.startsWith('+')) {
    const digits = key.replace(/\D/g, '');
    return `+${digits}`;
  }

  if (key.includes('@')) {
    return key.toLowerCase();
  }

  if (key.includes('-') && key.length > 20) {
    return key.toLowerCase();
  }

  const digitsOnly = key.replace(/\D/g, '');

  // 14 digits -> CNPJ
  if (digitsOnly.length === 14) {
    return digitsOnly;
  }

  // 12 or 13 digits starting with 55 -> Phone
  if ((digitsOnly.length === 12 || digitsOnly.length === 13) && digitsOnly.startsWith('55')) {
    return `+${digitsOnly}`;
  }

  // 10 digits -> Landline / Phone
  if (digitsOnly.length === 10) {
    return `+55${digitsOnly}`;
  }

  // 11 digits formatted with phone parens e.g. (11) 99999-9999 -> Phone
  if (key.includes('(') || key.includes(')')) {
    return `+55${digitsOnly}`;
  }

  // 11 digits default to CPF
  if (digitsOnly.length === 11) {
    return digitsOnly;
  }

  return key;
}

export function generatePixPayload(options: PixOptions): string {
  const { key, keyType, name, city = 'SAO PAULO', amount, description, txid = '***' } = options;

  const cleanKey = formatPixKey(key, keyType);

  // Clean name: remove accents, max 25 chars, standard ASCII
  const cleanName = (name || 'MOTORISTA')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .slice(0, 25) || 'MOTORISTA';

  // Clean city: remove accents, max 15 chars
  const cleanCity = (city || 'SAO PAULO')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .slice(0, 15) || 'SAO PAULO';

  // Merchant Account Information (Tag 26)
  let merchantAccount = formatField('00', 'BR.GOV.BCB.PIX');
  merchantAccount += formatField('01', cleanKey);
  if (description) {
    const cleanDesc = description
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .slice(0, 40);
    if (cleanDesc) {
      merchantAccount += formatField('02', cleanDesc);
    }
  }

  let payload = '';
  // Tag 00: Payload Format Indicator
  payload += formatField('00', '01');
  // Tag 26: Merchant Account Information
  payload += formatField('26', merchantAccount);
  // Tag 52: Merchant Category Code
  payload += formatField('52', '0000');
  // Tag 53: Transaction Currency (986 = BRL)
  payload += formatField('53', '986');

  // Tag 54: Transaction Amount
  if (amount && amount > 0) {
    payload += formatField('54', amount.toFixed(2));
  }

  // Tag 58: Country Code (BR)
  payload += formatField('58', 'BR');
  // Tag 59: Merchant Name
  payload += formatField('59', cleanName);
  // Tag 60: Merchant City
  payload += formatField('60', cleanCity);

  // Tag 62: Additional Data Field Template (txid)
  const cleanTxid = (txid || '***').replace(/[^a-zA-Z0-9*]/g, '').slice(0, 25) || '***';
  const additionalData = formatField('05', cleanTxid);
  payload += formatField('62', additionalData);

  // Tag 63: CRC16 Header
  payload += '6304';
  payload += crc16(payload);

  return payload;
}

