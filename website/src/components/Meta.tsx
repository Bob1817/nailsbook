import { Helmet } from 'react-helmet-async'
import { useLang } from '../i18n/LanguageContext'

interface MetaProps {
  title?: string
  description?: string
  keywords?: string
  canonicalPath?: string
  image?: string
}

const DEFAULT_KEYWORDS =
  '独立美甲师,自由美甲师,美甲工具,美甲工作台,美甲师管理后台,美甲预约管理,美甲客户档案,美甲报价工具,上门美甲预约,OnlyNail'

export function Meta({ title, description, keywords, canonicalPath, image }: MetaProps) {
  const { t } = useLang()

  const siteTitle = t.meta?.siteTitle || 'OnlyNail - 独立美甲师与自由美甲师专属美甲工作台'
  const defaultDescription =
    t.meta?.description ||
    'OnlyNail 为独立美甲师、自由美甲师提供作品管理、客户档案、微信预约与智能报价经营工具'

  const pageTitle = title ? `${title} | ${siteTitle}` : siteTitle
  const pageDescription = description || defaultDescription
  const pageKeywords = keywords || DEFAULT_KEYWORDS
  const canonicalUrl = canonicalPath ? `https://lunails.cn${canonicalPath}` : undefined

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:site_name" content="OnlyNail" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content="website" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  )
}
