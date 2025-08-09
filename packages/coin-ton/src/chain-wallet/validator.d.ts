import { ChainValidator } from '@delandlabs/coin-base';
/**
 * TON validator - single class for all TON address validation
 * Handles both wallet addresses and token contract addresses
 * Uses the same validation logic since TON addresses have uniform format
 */
export declare class TonValidator implements ChainValidator {
    /**
     * Validate TON wallet address
     * Uses @ton/ton Address.parse for comprehensive validation
     */
    validateWalletAddress(address: string): boolean;
    /**
     * Validate TON token contract address (Jetton addresses)
     * Same format as wallet addresses in TON
     */
    validateTokenAddress(tokenAddress: string): boolean;
}
