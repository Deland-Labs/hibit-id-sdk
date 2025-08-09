import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

/**
 * Pure cryptographic mnemonic functions
 * These functions handle the low-level cryptographic operations
 * Error handling and logging should be done by the caller
 */

/**
 * Validates a BIP39 mnemonic phrase
 * @param mnemonic - The mnemonic phrase to validate
 * @returns true if valid, false otherwise
 */
export function validateMnemonic(mnemonic: string): boolean {
  if (!mnemonic || typeof mnemonic !== 'string') {
    return false;
  }

  const normalizedMnemonic = mnemonic.trim().replace(/\s+/g, ' ');
  return bip39.validateMnemonic(normalizedMnemonic, wordlist);
}

/**
 * Generates a new BIP39 mnemonic phrase
 * @param strength - The entropy strength in bits (128, 160, 192, 224, or 256)
 * @returns The generated mnemonic phrase
 */
export function generateMnemonic(strength: number = 128): string {
  return bip39.generateMnemonic(wordlist, strength);
}

/**
 * Converts a mnemonic phrase to seed
 * @param mnemonic - The mnemonic phrase
 * @param passphrase - Optional passphrase
 * @returns The seed as Uint8Array
 */
export async function mnemonicToSeed(mnemonic: string, passphrase?: string): Promise<Uint8Array> {
  const normalizedMnemonic = mnemonic.trim().replace(/\s+/g, ' ');
  return await bip39.mnemonicToSeed(normalizedMnemonic, passphrase);
}

/**
 * Gets the BIP39 English wordlist
 * @returns The wordlist array
 */
export function getWordlist(): readonly string[] {
  return wordlist;
}

/**
 * Validates if a word is in the BIP39 wordlist
 * @param word - The word to check
 * @returns true if the word is in the wordlist
 */
export function isValidWord(word: string): boolean {
  return wordlist.includes(word.toLowerCase());
}

/**
 * Validates mnemonic word count
 * @param wordCount - Number of words
 * @returns true if valid (12 or 24 words)
 */
export function isValidWordCount(wordCount: number): boolean {
  return wordCount === 12 || wordCount === 24;
}
