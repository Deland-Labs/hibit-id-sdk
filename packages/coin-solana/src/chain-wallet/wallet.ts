import BigNumber from 'bignumber.js';
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SolanaJSONRPCError,
  SystemProgram,
  Transaction
} from '@solana/web3.js';
import { AssetInfo, ChainInfo, WalletAccount } from '@delandlabs/coin-base/model';
import { BaseChainWallet, MnemonicError } from '@delandlabs/coin-base';
import { CHAIN, CHAIN_NAME, DERIVING_PATH, FT_ASSET, NATIVE_ASSET, DEFAULT_COMMITMENT } from './defaults';
import nacl from 'tweetnacl';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

class SolanaChainWallet extends BaseChainWallet {
  private readonly readyPromise: Promise<void>;
  private connection: Connection | null = null;
  private keypair: Keypair | null = null;

  constructor(chainInfo: ChainInfo, phrase: string) {
    if (!chainInfo.chainId.type.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid chain type`);
    }
    super(chainInfo, phrase);
    this.readyPromise = this.initWallet();
  }

  public override getAccount: () => Promise<WalletAccount> = async () => {
    try {
      await this.readyPromise;
      const address = this.keypair!.publicKey.toString();
      return {
        address,
        publicKey: Buffer.from(this.keypair!.publicKey.toBytes()).toString('hex')
      };
    } catch (error) {
      if (error instanceof MnemonicError) {
        throw error; // Pass through mnemonic errors
      }
      throw new Error(`${CHAIN_NAME}: ${error.message}`);
    }
  };

  public override signMessage: (message: string) => Promise<string> = async (message) => {
    if (!message) {
      throw new Error(`${CHAIN_NAME}: Missing sign data`);
    }
    await this.readyPromise;
    const messageBytes = Buffer.from(message);
    const signature = nacl.sign.detached(messageBytes, this.keypair!.secretKey);
    return Buffer.from(signature).toString('hex');
  };

  public override balanceOf = async (address: string, assetInfo: AssetInfo) => {
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }

    if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
      return this.getNativeBalance(address, assetInfo);
    }

    if (assetInfo.chainAssetType.equals(FT_ASSET)) {
      return this.getSplTokenBalance(assetInfo);
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override transfer = async (toAddress: string, amount: BigNumber, assetInfo: AssetInfo): Promise<string> => {
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
    await this.readyPromise;

    if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
      return this.transferNative(toAddress, amount, assetInfo);
    }

    if (assetInfo.chainAssetType.equals(FT_ASSET)) {
      return this.transferSplToken(toAddress, amount, assetInfo);
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public override getEstimatedFee = async (
    toAddress: string,
    _amount: BigNumber,
    assetInfo: AssetInfo
  ): Promise<BigNumber> => {
    if (!assetInfo.chain.equals(CHAIN)) {
      throw new Error(`${CHAIN_NAME}: invalid asset chain`);
    }
    await this.readyPromise;

    if (assetInfo.chainAssetType.equals(NATIVE_ASSET)) {
      return this.estimateNativeFee(assetInfo);
    }

    if (assetInfo.chainAssetType.equals(FT_ASSET)) {
      return this.estimateSplTokenFee(toAddress, assetInfo);
    }

    throw new Error(`${CHAIN_NAME}: unsupported chain asset type ${assetInfo.chainAssetType.toString()}`);
  };

  public signTransaction = async (transaction: Transaction): Promise<string> => {
    await this.readyPromise;
    transaction.sign(this.keypair!);
    return transaction.serialize().toString('hex');
  };

  private async getNativeBalance(address: string, assetInfo: AssetInfo): Promise<BigNumber> {
    await this.readyPromise;
    const pubkey = new PublicKey(address);
    const balance = await this.connection!.getBalance(pubkey);
    return new BigNumber(balance).shiftedBy(-assetInfo.decimalPlaces.value);
  }

  private async getSplTokenBalance(assetInfo: AssetInfo): Promise<BigNumber> {
    await this.readyPromise;
    const mint = new PublicKey(assetInfo.contractAddress);
    const tokenProgramId = await this.getTokenProgramId(mint);
    const sourceATA = await getAssociatedTokenAddress(
      mint,
      this.keypair!.publicKey,
      false,
      tokenProgramId,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    try {
      const balance = await this.connection!.getTokenAccountBalance(sourceATA);
      return new BigNumber(balance.value.amount).shiftedBy(-assetInfo.decimalPlaces.value);
    } catch (e) {
      if (e instanceof SolanaJSONRPCError && e.code === -32602) {
        // Token account not found
        return new BigNumber(0).shiftedBy(-assetInfo.decimalPlaces.value);
      }
      throw e;
    }
  }

  private async transferNative(toAddress: string, amount: BigNumber, assetInfo: AssetInfo): Promise<string> {
    await this.readyPromise;
    const recipientPubKey = new PublicKey(toAddress);
    const lamports = amount.shiftedBy(assetInfo.decimalPlaces.value).toNumber();

    const { blockhash, lastValidBlockHeight } = await this.connection!.getLatestBlockhash(DEFAULT_COMMITMENT);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.keypair!.publicKey,
        toPubkey: recipientPubKey,
        lamports: Math.trunc(lamports)
      })
    );
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = this.keypair!.publicKey;

    return await sendAndConfirmTransaction(this.connection!, transaction, [this.keypair!], {
      commitment: DEFAULT_COMMITMENT
    });
  }

  private async transferSplToken(toAddress: string, amount: BigNumber, assetInfo: AssetInfo): Promise<string> {
    await this.readyPromise;
    const transaction = await this.prepareSplTokenTransaction(toAddress, amount, assetInfo);

    const { blockhash } = await this.connection!.getLatestBlockhash(DEFAULT_COMMITMENT);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.keypair!.publicKey;

    return await sendAndConfirmTransaction(this.connection!, transaction, [this.keypair!], {
      commitment: DEFAULT_COMMITMENT
    });
  }

  private async estimateNativeFee(assetInfo: AssetInfo): Promise<BigNumber> {
    await this.readyPromise;
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.keypair!.publicKey,
        toPubkey: this.keypair!.publicKey,
        lamports: 0
      })
    );

    const { blockhash } = await this.connection!.getLatestBlockhash(DEFAULT_COMMITMENT);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.keypair!.publicKey;

    const fee = await this.connection!.getFeeForMessage(transaction.compileMessage(), DEFAULT_COMMITMENT);
    return new BigNumber(fee?.value || 0).shiftedBy(-assetInfo.decimalPlaces.value);
  }

  private async estimateSplTokenFee(toAddress: string, assetInfo: AssetInfo): Promise<BigNumber> {
    await this.readyPromise;
    const transaction = await this.prepareSplTokenTransaction(toAddress, new BigNumber(0), assetInfo);

    const { blockhash } = await this.connection!.getLatestBlockhash(DEFAULT_COMMITMENT);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.keypair!.publicKey;

    const fee = await this.connection!.getFeeForMessage(transaction.compileMessage(), DEFAULT_COMMITMENT);
    return new BigNumber(fee?.value || 0).shiftedBy(-assetInfo.decimalPlaces.value);
  }

  private async initWallet(): Promise<void> {
    try {
      const endpoint = await this.getRpcEndpoint();
      // Update connection with the fastest RPC
      this.connection = new Connection(endpoint || this.chainInfo.rpcUrls[0], {
        commitment: DEFAULT_COMMITMENT
      });
      const privateKeyHex = await this.getEd25519DerivedPrivateKey(DERIVING_PATH, true, 'hex');
      const secretKey = Buffer.from(privateKeyHex, 'hex');
      this.keypair = Keypair.fromSecretKey(secretKey);
    } catch (error) {
      if (error instanceof MnemonicError) {
        throw error; // Pass through mnemonic errors
      }
      throw new Error(`${CHAIN_NAME}: Failed to initialize wallet: ${error.message}`);
    }
  }

  private async getRpcEndpoint(): Promise<string | null> {
    // Test all RPCs and select the fastest one
    const rpc = await Promise.race(
      this.chainInfo.rpcUrls.map((rpc) => {
        return new Promise<string | null>((resolve) => {
          fetch(rpc, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getHealth'
            })
          })
            .then((res) => {
              res
                .json()
                .then((resJson) => {
                  if (resJson.result !== 'ok') {
                    setTimeout(() => {
                      console.debug('[fail]', rpc, resJson);
                      resolve(null);
                    }, 5000);
                    return;
                  }
                  console.debug('[ok]', rpc);
                  resolve(rpc);
                })
                .catch((e) => {
                  setTimeout(() => {
                    console.debug('[fail]', rpc, e);
                    resolve(null);
                  }, 5000);
                });
            })
            .catch((e) => {
              setTimeout(() => {
                console.debug('[fail]', rpc, e);
                resolve(null);
              }, 5000);
            });
        });
      })
    );
    // Find the fastest responding RPC
    console.debug('[winner]', rpc);
    return rpc;
  }

  private async getTokenProgramId(mint: PublicKey): Promise<PublicKey> {
    await this.readyPromise;
    const accountInfo = await this.connection!.getAccountInfo(mint);
    if (!accountInfo) {
      throw new Error(`${CHAIN_NAME}: Token mint ${mint.toString()} not found`);
    }

    if (accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      return TOKEN_2022_PROGRAM_ID;
    }

    return TOKEN_PROGRAM_ID;
  }

  private async prepareSplTokenTransaction(
    toAddress: string,
    amount: BigNumber,
    assetInfo: AssetInfo
  ): Promise<Transaction> {
    if (!toAddress || !amount || !assetInfo) {
      throw new Error(`${CHAIN_NAME}: Missing required parameters`);
    }
    await this.readyPromise;
    const mint = new PublicKey(assetInfo.contractAddress);
    const tokenProgramId = await this.getTokenProgramId(mint);

    const [sourceATA, destinationATA] = await Promise.all([
      getAssociatedTokenAddress(mint, this.keypair!.publicKey, false, tokenProgramId, ASSOCIATED_TOKEN_PROGRAM_ID),
      getAssociatedTokenAddress(mint, new PublicKey(toAddress), false, tokenProgramId, ASSOCIATED_TOKEN_PROGRAM_ID)
    ]);

    const destinationPubkey = new PublicKey(toAddress);

    const transaction = new Transaction();

    const destinationAccount = await this.connection!.getAccountInfo(destinationATA);
    if (!destinationAccount) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          this.keypair!.publicKey,
          destinationATA,
          destinationPubkey,
          mint,
          tokenProgramId,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    const tokenAmount = BigInt(amount.shiftedBy(assetInfo.decimalPlaces.value).toFixed(0, BigNumber.ROUND_FLOOR));

    const transferInstruction = createTransferInstruction(
      sourceATA,
      destinationATA,
      this.keypair!.publicKey,
      tokenAmount,
      [],
      tokenProgramId
    );

    transaction.add(transferInstruction);

    return transaction;
  }
}

export { SolanaChainWallet };
