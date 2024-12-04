import { FC, useState } from 'react';
import { RootAssetInfo } from '../apis/models';
import { twMerge } from 'tailwind-merge';

interface TokenIconProps {
  token: RootAssetInfo | null
  size?: 'sm' | 'md' | 'lg'
  onlyIcon?: boolean
  hideName?: boolean
}

const TokenIcon: FC<TokenIconProps> = ({
  token,
  size = 'md',
  onlyIcon = false,
  hideName = false,
}) => {
  const [srcIndex, setSrcIndex] = useState(0)

  let srcUrlArr: string[] = token?.icon ? [token?.icon] : [];
  if (!srcUrlArr.length && token?.assetSymbol) {
    const symbol = encodeURIComponent(token.assetSymbol);
    srcUrlArr = ['svg', 'webp', 'png', 'jpeg', 'jpg'].map((ext: string) => `/token-icons/${symbol}.${ext}`);
  }

  return (
    <div className="flex items-center gap-2">
      <img
        src={srcUrlArr[srcIndex]}
        alt={token?.assetSymbol}
        className={twMerge('rounded-full', size === 'sm' && 'size-6', size === 'md' && 'size-8', size === 'lg' && 'size-12')}
        onError={ev => {
          if (srcIndex < srcUrlArr.length - 1) {
            (ev.target as HTMLImageElement).src = srcUrlArr[srcIndex + 1]
            setSrcIndex(srcIndex + 1)
          } else {
            (ev.target as HTMLImageElement).src = '/token-icons/UNKNOWN.svg'
          }
        }}
      />
      {!onlyIcon && (
        <div className='flex flex-col'>
          <span className='text-sm text-base-content'>{token?.assetSymbol ?? '--'}</span>
          {!hideName && (
            <span className='text-xs text-neutral'>{token?.displayName ?? '--'}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenIcon;
