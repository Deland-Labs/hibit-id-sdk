import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';

describe('Real Transfer Event Subscription Integration Test', () => {
  it.skip(
    "should receive a Transfer event with one of the depositAddresses as 'to'",
    async () => {
      // Set timeout duration (e.g.: 2 minutes)
      const TIMEOUT_MS = 120000000;

      // WebSocket node URL (using public node for real on-chain requests)
      const wsUrl = 'wss://bsc-rpc.publicnode.com';
      const provider = new ethers.WebSocketProvider(wsUrl);

      // Define Transfer event ABI and create Interface for parsing logs
      const transferEventABI = ['event Transfer(address indexed from, address indexed to, uint256 value)'];
      const iface = new ethers.Interface(transferEventABI);

      // Token contract addresses (e.g. USDT and USDC)
      const tokenAddresses = [
        '0x55d398326f99059ff775485246999027b3197955', // USDT
        '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d' // USDC
      ];

      // Deposit addresses array (used as recipient filter)
      const depositAddresses = [
        '0x0D0707963952f2fBA59dD06f2b425ace40b492Fe',
        '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3',
        '0xf89d7b9c864f589bbF53a82105107622B35EaA40',
        '0x1AB4973a48dc892Cd9971ECE8e01DcC7688f8F23'
      ];

      // Get Transfer event Topic (keccak256 hash of the event signature)
      const transferTopic = iface.getEvent('Transfer');

      // Construct filter object:
      // - address: limits matching logs to these contract addresses (tokenAddresses)
      // - topics array:
      //    [0] must be transferTopic,
      //    [1] null means no filtering on 'from' address,
      //    [2] depositAddresses array, only capture transfer events where 'to' is one of these addresses
      const filter = {
        address: tokenAddresses,
        topics: [
          transferTopic!.topicHash,
          null,
          depositAddresses.map((addr) => ethers.zeroPadValue(ethers.getAddress(addr), 32))
        ]
      };

      console.log('Starting to subscribe to Transfer events, waiting for matching events...', filter);

      // Use Promise to wait for a real event, reject on timeout
      const eventPromise = new Promise((_, reject) => {
        const timeoutId = setTimeout(() => {
          provider.removeAllListeners();
          reject(new Error(`Timeout after ${TIMEOUT_MS}ms waiting for Transfer event`));
        }, TIMEOUT_MS);

        provider.on(filter, (log) => {
          try {
            const parsedLog = iface.parseLog({
              topics: log.topics || [],
              data: log.data || '0x'
            });
            console.log(parsedLog);
          } catch (error) {
            clearTimeout(timeoutId);
            provider.removeAllListeners();
            reject(error);
          }
        });
      });

      // Wait for event with proper typing
      const result = (await eventPromise) as ethers.LogDescription;
      console.log('Received Transfer event:', result.args);

      // Simple assertions to verify received event
      expect(result.args.to).toBeDefined();
      expect(depositAddresses.map((addr) => ethers.getAddress(addr))).toContain(result.args.to);

      // Properly close Provider connection
      provider.destroy();
    },
    { timeout: 120000000 }
  );
});
