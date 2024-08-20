import { FC } from "react";
import { useNavigate } from "react-router-dom";
import SvgGo from '../assets/right-arrow.svg?react'

const PageHeader: FC<{ title: string, backable?: boolean }> = ({ title, backable = true }) => {
  const navigate = useNavigate()

  if (backable) {
    return (
      <div className="flex-none">
        <button className="btn btn-ghost btn-sm gap-2 items-center pl-0" onClick={() => navigate('/')}>
          <SvgGo className="size-6 rotate-180" />
          <span className="text-base font-bold">{title}</span>
        </button>
      </div>
    )
  } else {
    return (
      <div className="flex-none text-base font-bold">
        {title}
      </div>
    )
  }
}

export default PageHeader
