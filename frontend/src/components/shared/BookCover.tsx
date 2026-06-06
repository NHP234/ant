import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookCoverProps {
  src?: string | null
  title: string
  className?: string
  imgClassName?: string
  fallbackClassName?: string
  loading?: 'eager' | 'lazy'
  showIcon?: boolean
}

export default function BookCover({
  src,
  title,
  className,
  imgClassName,
  fallbackClassName,
  loading = 'lazy',
  showIcon = false,
}: BookCoverProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const usableSrc = src && failedSrc !== src ? src : null

  return (
    <div className={cn('w-full h-full bg-muted', className)}>
      {usableSrc ? (
        <img
          src={usableSrc}
          alt={title}
          loading={loading}
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src ?? null)}
          className={cn('w-full h-full object-cover', imgClassName)}
        />
      ) : (
        <div className={cn('w-full h-full flex flex-col items-center justify-center p-4 text-center', fallbackClassName)}>
          {showIcon && <BookOpen className="w-8 h-8 text-muted-foreground/40 mb-2" />}
          <span className="font-medium text-muted-foreground line-clamp-3">{title}</span>
        </div>
      )}
    </div>
  )
}
