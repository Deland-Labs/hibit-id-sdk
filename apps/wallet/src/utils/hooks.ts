import { useResponsive } from 'ahooks'

export const useIsDesktop = () => {
  const responsive = useResponsive()
  return responsive['sm']
}
