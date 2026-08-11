import { useCallback, useEffect, useState } from 'react'

export function useCarousel(length: number, intervalMs?: number) {
  const [index, setIndex] = useState(0)
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    if (length <= 0) {
      setIndex(0)
      return
    }
    if (index >= length) setIndex(0)
  }, [length, index])

  const next = useCallback(() => {
    if (length <= 0) return
    setIndex((current) => (current + 1) % length)
    setEpoch((value) => value + 1)
  }, [length])

  const prev = useCallback(() => {
    if (length <= 0) return
    setIndex((current) => (current === 0 ? length - 1 : current - 1))
    setEpoch((value) => value + 1)
  }, [length])

  const goTo = useCallback(
    (i: number) => {
      if (i >= 0 && i < length) {
        setIndex(i)
        setEpoch((value) => value + 1)
      }
    },
    [length],
  )

  useEffect(() => {
    if (!intervalMs || length <= 1) return
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % length)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs, length, epoch])

  return { index, next, prev, goTo }
}
