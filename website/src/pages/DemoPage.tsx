import { useState } from 'react'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import ScanQrModal from '../components/ScanQrModal'
import { Meta } from '../components/Meta'
import InteractiveDemoSection from '../components/demo/InteractiveDemoSection'
import { useLang } from '../i18n/LanguageContext'

export default function DemoPage() {
  const { isZh } = useLang()
  const [scan, setScan] = useState<'try' | 'follow' | 'artist' | null>(null)
  const [scanMeta, setScanMeta] = useState<{ workTitle?: string } | null>(null)

  return (
    <div className="recruitment-site">
      <Meta
        title={isZh ? '交互式双端演示 · OnlyNail 你的专属美甲师' : 'Interactive Demo · OnlyNail'}
        description={
          isZh
            ? '30 秒在线亲手体验 OnlyNail 顾客端小程序与美甲师工作台的双端实时联动：10 秒快捷报价、老客预约避坑穿透与专属主页引流。'
            : 'Experience OnlyNail live dual-sided sync in 30 seconds: quick quote, client nail alerts, and private artist storefront.'
        }
      />
      <a className="skip-link" href="#main">
        {isZh ? '跳到主要内容' : 'Skip to content'}
      </a>
      <NavBar />
      <main id="main">
        <InteractiveDemoSection
          standalone
          onOpenScan={(type, meta) => {
            setScanMeta(meta || null)
            setScan(type)
          }}
        />
      </main>
      <SiteFooter />
      {scan && (
        <ScanQrModal
          type={scan}
          artistId={55}
          artistName="贝贝"
          shopName="听栖美甲工作室"
          workTitle={scanMeta?.workTitle}
          onClose={() => {
            setScan(null)
            setScanMeta(null)
          }}
        />
      )}
    </div>
  )
}
