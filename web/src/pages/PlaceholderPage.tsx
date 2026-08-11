interface PlaceholderPageProps {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="placeholder-page">
      <h1>{title}</h1>
      <p>{description}</p>
      <p className="placeholder-note">
        This page will be migrated next. The shared layout (navbar &amp; sidebar) is already live.
      </p>
    </div>
  )
}
