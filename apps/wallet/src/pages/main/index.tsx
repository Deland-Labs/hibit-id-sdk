import { observer } from "mobx-react";
import { FC } from "react";
import SendButton from "../../components/SendButton";
import ReceiveButton from "../../components/ReceiveButton";
import TokenList from "../../components/TokenList";
import { useTokenQuery } from "../../apis/react-query/token";
import ChainSelect from "../../components/ChainSelect";

const WalletMainPage: FC = observer(() => {
  // TODO: get default token according to chain
  const tokenQuery = useTokenQuery('ETH')

  return (
    <div className="h-full relative">
      <div className="absolute top-0 left-0">
        <ChainSelect />
      </div>
      <div className="flex flex-col items-center gap-8 pb-6 border-b border-base-300">
        <h1 className="h-5 leading-5 text-xs">Account001</h1>
        <div className="flex flex-col items-center">
          <span className="text-xs text-neutral">Net Worth</span>
          <span className="text-2xl">$ 0.00</span>
        </div>
        <div className="flex gap-10">
          <SendButton token={tokenQuery.data || undefined} />
          <ReceiveButton token={tokenQuery.data || undefined} />
        </div>
      </div>

      <div className="mt-6">
        <p className="text-neutral">Tokens</p>
        <div className="mt-6">
          <TokenList />
        </div>
      </div>
    </div>
  );
})

export default WalletMainPage
