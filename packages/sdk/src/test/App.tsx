import { FC, useEffect, useState } from 'react';
import { HibitIdWallet } from '../lib/wallet';
import {
  ChainAccount,
  ChainAssetType,
  ChainId,
  ChainType,
  ChainNetwork
} from '@delandlabs/hibit-basic-types';
import { BalanceChangeData } from '../lib/types';

const App: FC = () => {
  const [wallet, setWallet] = useState<HibitIdWallet | null>(null);
  const [account, setAccount] = useState<ChainAccount | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [sig, setSig] = useState('');
  const [balance, setBalance] = useState('');
  const [chainId, setChainId] = useState('');
  const [isBackgroundEmbed, setIsBackgroundEmbed] = useState(false);

  useEffect(() => {
    const wallet = new HibitIdWallet({
      env: 'dev',
      chains: [
        new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia),
        new ChainId(ChainType.Ton, ChainNetwork.TonTestNet)
      ],
      defaultChain: new ChainId(
        ChainType.Ethereum,
        ChainNetwork.EthereumSepolia
      ),
      embedMode: 'float',
      controllerDefaultPosition: { right: 100, bottom: 100 }
    });
    setWallet(wallet);
    // V2: Event listeners are deprecated - use getAccount(chainId) to check current state
    const handleBalanceChanged = (data: BalanceChangeData) => {
      console.log(data);
    };
    wallet.subscribeBalanceChange(
      {
        assetType: ChainAssetType.ERC20,
        chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EvmBscTestNet),
        contractAddress: '0x4becfca57c5728536fc4746645f7b4410d1cc5f7'
      },
      handleBalanceChanged
    );

    return () => {
      // V2: Event listeners removed
      wallet.unsubscribeBalanceChange(
        {
          assetType: ChainAssetType.ERC20,
          chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EvmBscTestNet),
          contractAddress: '0x4becfca57c5728536fc4746645f7b4410d1cc5f7'
        },
        handleBalanceChanged
      );
    };
  }, []);

  return (
    <div className="p-4 flex gap-4">
      <div>
        <button
          className="btn btn-sm"
          onClick={async () => {
            setConnecting(true);
            await wallet?.connect();
            const account = await wallet?.getAccount(
              new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia)
            );
            setAccount(account ?? null);
            setConnecting(false);
          }}
        >
          {connecting ? 'loading...' : 'connect'}
        </button>
      </div>
      <div>
        <p>account:</p>
        <pre>{JSON.stringify(account, null, 2)}</pre>
      </div>
      <div>
        <button
          className="btn btn-sm"
          onClick={async () => {
            await wallet?.showChangePassword();
          }}
        >
          reset password
        </button>
      </div>
      <div>
        <button
          className="btn btn-sm"
          onClick={async () => {
            try {
              await wallet?.verifyPassword({ password: '123456' });
              alert('password verified');
            } catch (e) {
              alert(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          verify password
        </button>
      </div>
      <div>
        <button
          className="btn btn-sm"
          onClick={async () => {
            await wallet?.setBackgroundEmbed(!isBackgroundEmbed);
            setIsBackgroundEmbed(!isBackgroundEmbed);
          }}
        >
          toggle background embed({isBackgroundEmbed})
        </button>
      </div>
      <div>
        <button
          className="btn btn-sm"
          onClick={async () => {
            const balance = await wallet?.getBalance({
              chainId: new ChainId(
                ChainType.Ethereum,
                ChainNetwork.EthereumSepolia
              ),
              assetType: ChainAssetType.Native
            });
            setBalance(balance ?? '');
            setTimeout(() => {
              setBalance('');
            }, 1000);
          }}
        >
          get balance
        </button>
        <p>balance: {balance}</p>
      </div>
      <div>
        <button
          className="btn btn-sm"
          onClick={async () => {
            const sig = await wallet?.signMessage({
              chainId: new ChainId(
                ChainType.Ethereum,
                ChainNetwork.EthereumSepolia
              ),
              message: 'hello hibit'
            });
            setSig(sig ?? '');
            setTimeout(() => {
              setSig('');
            }, 1000);
          }}
        >
          sign message
        </button>
        <p>signature: {sig}</p>
      </div>
      <div>
        <p>switch chain: {chainId}</p>
        <button
          onClick={async () => {
            // V2: switchToChain is deprecated
            // Use chainId parameter in method calls instead
            const account = await wallet?.getAccount(
              new ChainId(ChainType.Ethereum, ChainNetwork.EthereumSepolia)
            );
            setAccount(account ?? null);
            setChainId(
              new ChainId(
                ChainType.Ethereum,
                ChainNetwork.EthereumSepolia
              ).toString()
            );
          }}
        >
          evm sepolia
        </button>
        <button
          onClick={async () => {
            // V2: switchToChain is deprecated
            // Use chainId parameter in method calls instead
            const account = await wallet?.getAccount(
              new ChainId(ChainType.Ton, ChainNetwork.TonTestNet)
            );
            setAccount(account ?? null);
            setChainId(
              new ChainId(ChainType.Ton, ChainNetwork.TonTestNet).toString()
            );
          }}
        >
          ton testnet
        </button>
      </div>
    </div>
  );
};

export default App;
