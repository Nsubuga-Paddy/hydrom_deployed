import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowUpRightFromSquare,
  faChartLine,
  faSatelliteDish,
  faShieldHalved,
  faWater,
} from '@fortawesome/free-solid-svg-icons'
import { publicUrl } from '../utils/publicUrl'

const partners = [
  {
    role: 'Funded by',
    name: 'UEGCL',
    fullName: 'Uganda Electricity Generation Company Limited',
    description:
      'Hydro-M is funded by UEGCL to support safer, data-driven monitoring across Uganda’s hydropower cascade.',
    href: 'https://uegcl.com/',
  },
  {
    role: 'Developed by',
    name: 'Fenix Technologies',
    fullName: 'Fenix Technologies Ltd',
    description:
      'Designed and engineered by Fenix Technologies as a connected hardware and software platform for operational insight.',
    href: 'https://fenixtechnologiesltd.com/',
  },
  {
    role: 'Supported by',
    name: 'Lwera Electronics',
    fullName: 'Lwera Semi Conductors and Electronics',
    description:
      'Delivered with support from Lwera Electronics for hardware, sensing, and electronics capability.',
    href: 'https://lwerasemiconductors.com/',
  },
] as const

const capabilities = [
  {
    icon: faWater,
    title: 'Real-time monitoring',
    text: 'Live reservoir, weather, and open-channel readings for each dam.',
  },
  {
    icon: faSatelliteDish,
    title: 'GIS monitoring',
    text: 'Geographic environmental context for cascade operations.',
  },
  {
    icon: faChartLine,
    title: 'Reservoir predictions',
    text: 'Time-of-day water-level forecasts with performance tracking.',
  },
  {
    icon: faShieldHalved,
    title: 'System alarms',
    text: 'Operational alerts when thresholds and forecast risks require attention.',
  },
] as const

export function AboutUsPage() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div>
          <p className="page-eyebrow">About Hydro-M</p>
          <h1>Hydrological monitoring for Uganda’s hydropower cascade</h1>
          <p>
            Hydro-M brings real-time dam data, open-channel sensing, GIS context, and reservoir
            forecasting into one operational platform.
          </p>
        </div>
        <div className="about-hero-mark">
          <img src={publicUrl('logo.png')} alt="Hydro-M" />
        </div>
      </section>

      <section className="about-mission">
        <p className="page-eyebrow">Purpose</p>
        <h2>Built for cascade operations</h2>
        <p>
          Hydro-M helps operators track how hydrological conditions and dam activity interact along
          the cascade, supporting informed decisions for generation, safety, and waterway awareness.
        </p>
      </section>

      <section className="about-capabilities" aria-label="Platform capabilities">
        {capabilities.map((item) => (
          <article key={item.title} className="about-capability-card">
            <span className="about-capability-icon">
              <FontAwesomeIcon icon={item.icon} />
            </span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="about-partners">
        <div className="about-partners-header">
          <p className="page-eyebrow">Partners</p>
          <h2>Who makes Hydro-M possible</h2>
        </div>

        <div className="about-partners-grid">
          {partners.map((partner) => (
            <article key={partner.name} className="about-partner-card">
              <span>{partner.role}</span>
              <h3>{partner.name}</h3>
              <p className="about-partner-fullname">{partner.fullName}</p>
              <p>{partner.description}</p>
              <a href={partner.href} target="_blank" rel="noopener noreferrer">
                Visit website
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="about-closing">
        <img src={publicUrl('uegcl-logo.png')} alt="UEGCL" />
        <p>
          Hydro-M is funded by{' '}
          <a href="https://uegcl.com/" target="_blank" rel="noopener noreferrer">
            UEGCL
          </a>
          , developed by{' '}
          <a href="https://fenixtechnologiesltd.com/" target="_blank" rel="noopener noreferrer">
            Fenix Technologies
          </a>
          , with support from{' '}
          <a href="https://lwerasemiconductors.com/" target="_blank" rel="noopener noreferrer">
            Lwera Electronics
          </a>
          .
        </p>
      </section>
    </div>
  )
}
