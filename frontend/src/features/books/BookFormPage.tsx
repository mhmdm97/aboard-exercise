import { useParams } from 'react-router'

export function BookFormPage() {
  const { id } = useParams()
  return (
    <section>
      <h1>{id ? 'Edit book' : 'New book'}</h1>
      <p>Coming soon.</p>
    </section>
  )
}
