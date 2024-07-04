import { FC } from 'react';
import { twMerge } from 'tailwind-merge';
import { ChainInfo } from '../utils/basicTypes';

interface ChainIconProps {
  chainInfo: ChainInfo
  size?: 'sm' | 'md'
  onlyIcon?: boolean
}

const ChainIcon: FC<ChainIconProps> = ({
  chainInfo,
  size = 'md',
  onlyIcon = false,
}) => {
  return (
    <div className="flex items-center gap-2">
      <img
        src={chainInfo.icon}
        alt={chainInfo.name}
        className={twMerge('rounded-full', size === 'sm' && 'size-5', size === 'md' && 'size-6')}
        onError={ev =>
          ((ev.target as HTMLImageElement).src = '/token-icons/UNKNOWN.svg')
        }
      />
      {!onlyIcon && (
        <div className='flex flex-col'>
          <span className='text-sm'>{chainInfo.name}</span>
        </div>
      )}
    </div>
  );
};

export default ChainIcon;
