import { FC } from "react";

const LogoSection: FC = () => {
  return (
    <section className="flex-1 flex flex-col justify-center items-center">
      <img src="/brand@2x.png" alt="Brand" className="w-[160px] h-[102px]" />
      {/* <div className="flex justify-center items-center size-20 rounded-full [background:linear-gradient(180deg,#16D6FF_0%,#0099E6_100%)]">
        <SvgLogo className="size-9" />
      </div> */}
      <h1 className="mt-2 text-neutral">Hibit ID</h1>
      <p className="mt-2 font-bold text-xl">
        Link <span className="text-primary">Web2</span> to <span className="text-primary">Web3</span> world
      </p>
    </section>
  )
}

export default LogoSection;
