import { vi } from 'vitest';

// Mock KeyPair structure
const mockKeyPair = {
  publicKey: Buffer.from('5f4f3c4b2a1234567890abcdef1234567890abcdef1234567890abcdef123456', 'hex'),
  secretKey: Buffer.from(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef5f4f3c4b2a1234567890abcdef1234567890abcdef1234567890abcdef123456',
    'hex'
  )
};

export const KeyPair = vi.fn().mockImplementation(() => mockKeyPair);

export const mnemonicToPrivateKey = vi.fn().mockImplementation(async (mnemonic: string[]) => {
  console.log('[MOCK] mnemonicToPrivateKey called with:', mnemonic.slice(0, 3).join(' '), '...');

  // Simulate different key pairs for different mnemonics
  const mnemonicStr = mnemonic.join(' ');
  const hash = mnemonicStr.split('').reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  const result = {
    publicKey: Buffer.from(`${Math.abs(hash).toString(16).padStart(64, '0')}`, 'hex'),
    secretKey: Buffer.from(`${Math.abs(hash).toString(16).padStart(128, '0')}`, 'hex')
  };

  console.log('[MOCK] mnemonicToPrivateKey returning:', !!result.secretKey);
  return result;
});

export const mnemonicToSeed = vi.fn().mockImplementation(async () => {
  return Buffer.from('mock-seed-from-mnemonic');
});

export const mnemonicValidate = vi.fn().mockImplementation((mnemonic: string[]) => {
  return mnemonic.length >= 12 && mnemonic.length <= 24;
});
