import { FC } from "react";
import { twMerge } from "tailwind-merge";

export interface HibitToastProps {
  type: 'success' | 'error'
  text: string
}

const HibitToast: FC<HibitToastProps> = ({ type, text }) => {
  return (
    <div className="text-xs">
      <p
        className={twMerge(
          'text-base-content',
          type === 'success' && 'text-success',
          type === 'error' && 'text-error',
        )}
      >
        {text}
      </p>
    </div>
  );
};

export default HibitToast;
