import { FC, useRef } from "react";
import { useIsDesktop } from "../utils/hooks";
import VConsole from "vconsole";

const TRIGGER_CLICK_COUNT = 6
const TIME_WINDOW = 3000

const VConsoleInvisibleTrigger: FC = () => {
  const isDesktop = useIsDesktop()
  const clickCountRef = useRef(0)
  const vConsoleRef = useRef<VConsole>()

  const handleClick = () => {
    if (clickCountRef.current > TRIGGER_CLICK_COUNT) {
      return
    }
    clickCountRef.current += 1
    if (clickCountRef.current === 1) {
      setTimeout(() => {
        clickCountRef.current = 0
      }, TIME_WINDOW)
    }
    if (clickCountRef.current === TRIGGER_CLICK_COUNT) {
      if (vConsoleRef.current) {
        vConsoleRef.current.destroy()
      }
      vConsoleRef.current = new VConsole()
    }
  }

  if (isDesktop) {
    return null
  }

  return (
    <div onClick={handleClick} className="size-2 fixed bottom-0 left-0 z-[100000]" />
  )
}

export default VConsoleInvisibleTrigger
