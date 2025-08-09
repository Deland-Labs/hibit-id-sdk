// Export the new wallet implementation using asset handlers
export { KaspaChainWallet } from './wallet';

// Also export asset handlers for advanced users who might want direct access
export { BaseAssetHandler, KasNativeHandler, Krc20TokenHandler } from './asset-handlers';
