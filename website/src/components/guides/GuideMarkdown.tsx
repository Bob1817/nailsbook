import type { ReactNode } from 'react'

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="rounded bg-[var(--nb-pressed)] px-1.5 py-0.5 text-[0.9em] text-ink"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

function isTableSeparator(line: string): boolean {
  return /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(line.trim())
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

export interface HowToStepData {
  name: string
  text: string
}

export function extractHowToSteps(markdown: string): HowToStepData[] {
  const lines = markdown.split('\n')
  const steps: HowToStepData[] = []
  let currentTitle = ''
  let buffer: string[] = []

  const flush = () => {
    if (currentTitle && buffer.length > 0) {
      steps.push({
        name: currentTitle,
        text: buffer.join(' ').replace(/\*\*/g, '').slice(0, 220),
      })
    }
    currentTitle = ''
    buffer = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('### ')) {
      flush()
      currentTitle = line.slice(4).trim()
    } else if (line.startsWith('## ')) {
      flush()
    } else if (currentTitle && line && !line.startsWith('|')) {
      buffer.push(line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''))
    }
  }
  flush()
  return steps
}

export default function GuideMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const nodes: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) {
      i += 1
      continue
    }

    if (line.startsWith('## ')) {
      nodes.push(
        <h2
          key={`h2-${i}`}
          className="mt-8 mb-3 text-xl sm:text-[22px] font-bold tracking-tight text-ink leading-snug"
        >
          {line.slice(3).trim()}
        </h2>,
      )
      i += 1
      continue
    }

    if (line.startsWith('### ')) {
      nodes.push(
        <h3
          key={`h3-${i}`}
          className="mt-6 mb-2 text-[17px] sm:text-lg font-bold text-ink leading-snug"
        >
          {line.slice(4).trim()}
        </h3>,
      )
      i += 1
      continue
    }

    // Markdown table
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = parseTableRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().includes('|')) {
        rows.push(parseTableRow(lines[i]))
        i += 1
      }
      nodes.push(
        <div
          key={`table-${i}`}
          className="my-5 overflow-x-auto rounded-2xl border border-line bg-surface"
        >
          <table className="w-full border-collapse text-left text-sm sm:text-[15px]">
            <thead>
              <tr className="border-b border-line bg-brand-bg">
                {headers.map((head, idx) => (
                  <th key={idx} className="px-4 py-3 font-bold text-ink whitespace-nowrap">
                    {renderInline(head)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-line last:border-b-0">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-3 text-ink-muted align-top leading-relaxed">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // Unordered list
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = []
      while (
        i < lines.length &&
        (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))
      ) {
        items.push(lines[i].trim().slice(2).trim())
        i += 1
      }
      nodes.push(
        <ul key={`ul-${i}`} className="my-4 space-y-2.5 pl-5 list-disc text-base text-ink-muted">
          {items.map((item, idx) => (
            <li key={idx} className="leading-[1.7]">
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      )
      continue
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i += 1
      }
      nodes.push(
        <ol key={`ol-${i}`} className="my-4 space-y-2.5 pl-5 list-decimal text-base text-ink-muted">
          {items.map((item, idx) => (
            <li key={idx} className="leading-[1.7]">
              {renderInline(item)}
            </li>
          ))}
        </ol>,
      )
      continue
    }

    // Paragraph (combine consecutive plain lines)
    const paraLines: string[] = [line]
    i += 1
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('- ') &&
      !lines[i].trim().startsWith('* ') &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !(lines[i].trim().includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
    ) {
      paraLines.push(lines[i].trim())
      i += 1
    }

    nodes.push(
      <p key={`p-${i}`} className="my-4 text-base leading-[1.75] text-ink-muted">
        {renderInline(paraLines.join(' '))}
      </p>,
    )
  }

  return <div className="max-w-[40em]">{nodes}</div>
}
