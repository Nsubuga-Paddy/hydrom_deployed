import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import type { ReactNode } from 'react'
import { useCarousel } from '../../hooks/useCarousel'

interface DamCarouselProps {
  length: number
  intervalMs?: number
  className?: string
  children: ReactNode[]
}

export function DamCarousel({ length, intervalMs, className = '', children }: DamCarouselProps) {
  const { index, next, prev, goTo } = useCarousel(length, intervalMs)
  const prevIndex = index === 0 ? length - 1 : index - 1

  return (
    <div className="dam-data-section">
      <div className={`dam-carousel ${className}`.trim()}>
        {children.map((child, i) => (
          <div
            key={i}
            className={`dam-slide${i === index ? ' active' : ''}${i === prevIndex ? ' prev' : ''}`}
          >
            {child}
          </div>
        ))}
      </div>

      <div className={`carousel-nav ${className.replace('carousel', 'nav')}`.trim()}>
        {Array.from({ length }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`nav-dot${i === index ? ' active' : ''}`}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      <div className={`carousel-controls ${className.replace('carousel', 'controls')}`.trim()}>
        <button type="button" className="carousel-btn prev-btn" onClick={prev} aria-label="Previous">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <button type="button" className="carousel-btn next-btn" onClick={next} aria-label="Next">
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    </div>
  )
}
