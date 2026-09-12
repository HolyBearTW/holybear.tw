import React from 'react'
import { resolveJobArtworkUrl } from '../jobArtwork'
import './jobArtwork.css'

interface JobArtworkDecorationProps {
  jobName: string
  characterGender?: string
  characterKey: string
}

const JobArtworkDecoration: React.FC<JobArtworkDecorationProps> = ({
  jobName,
  characterGender,
  characterKey,
}) => {
  const artworkUrl = React.useMemo(
    () => resolveJobArtworkUrl(jobName, characterGender, characterKey),
    [characterGender, characterKey, jobName],
  )
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null)

  if (!artworkUrl) return null

  return (
    <div className="maple-job-artwork-layer" aria-hidden="true">
      {failedUrl !== artworkUrl && (
        <img
          key={artworkUrl}
          src={artworkUrl}
          alt=""
          className="maple-job-artwork-image"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          draggable={false}
          onError={() => setFailedUrl(artworkUrl)}
        />
      )}
    </div>
  )
}

export default React.memo(JobArtworkDecoration)
