import { Helmet } from 'react-helmet-async'
import { useLang } from '../i18n/LanguageContext'

interface MetaProps {
  title?: string
  description?: string
  image?: string
}

export function Meta({ title, description, image }: MetaProps) {
  const { t } = useLang()

  const siteTitle = t.meta?.siteTitle || '贝美甲 - 独立美甲师工具'
  const defaultDescription = t.meta?.description || '给独立上门美甲师的客户预约与私域经营系统'

  const pageTitle = title ? `${title} | ${siteTitle}` : siteTitle
  const pageDescription = description || defaultDescription

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content="website" />
      {image && <meta property="og:image" content={image} />}
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  )
}
