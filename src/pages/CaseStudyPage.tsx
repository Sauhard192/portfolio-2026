import { useParams } from 'react-router-dom'

export function CaseStudyPage() {
  const { slug } = useParams()

  return <main className="page" data-case-study={slug} />
}
