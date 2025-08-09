/**
 * Chain validator interface - minimal contract for address validation
 */
export interface ChainValidator {
  /**
   * Validate wallet address
   */
  validateWalletAddress(address: string): boolean;

  /**
   * Validate token address
   * Token addresses can have different formats than wallet addresses
   */
  validateTokenAddress(tokenAddress: string): boolean;
}
