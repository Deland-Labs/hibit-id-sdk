import { FC } from 'react';
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
  let srcUrl = token?.icon || '';
  if (!srcUrl && token?.assetSymbol) {
    srcUrl =
      `/token-icons/${token.assetSymbol.toUpperCase()}.svg` ||
      `/token-icons-png/${token.assetSymbol.toUpperCase()}.png`;
  }

  return (
    <div className="flex items-center gap-2">
      <img
        src={srcUrl}
        alt={token?.assetSymbol}
        className={twMerge('rounded-full', size === 'sm' && 'size-6', size === 'md' && 'size-8', size === 'lg' && 'size-12')}
        onError={ev =>
          ((ev.target as HTMLImageElement).src = '/token-icons/UNKNOWN.svg')
        }
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
