import { useEffect, useState } from 'react'

export const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 576)

  useEffect(() => {
    const detectWindow = () => {
      setIsDesktop(window.innerWidth > 576)
    }
    window.addEventListener('resize', detectWindow);

    return () => {
      window.removeEventListener('resize', detectWindow);
    }
  }, [])

  return isDesktop
}
