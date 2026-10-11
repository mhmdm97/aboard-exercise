import { useParams } from 'react-router'

export function BookDetailPage() {
  const { id } = useParams()
  return (
    <section>
      <h1>Book details</h1>
      <p>Book {id} — coming soon.</p>
    </section>
  )
}
