export interface MonthlyReportSections {
  summary: string
  highlights: string
  problems: string
  nextPlan: string
  coordination: string
}

const SECTION_TITLES: Record<keyof MonthlyReportSections, string> = {
  summary: '本月工作总结',
  highlights: '工作亮点与成果',
  problems: '遇到的问题及处理',
  nextPlan: '下月工作计划',
  coordination: '需协调支持事项'
}

const CONTENT_KEYS: (keyof MonthlyReportSections)[] = ['summary', 'highlights', 'problems']
const PLAN_KEYS: (keyof MonthlyReportSections)[] = ['nextPlan', 'coordination']

export const emptySections = (): MonthlyReportSections => ({
  summary: '',
  highlights: '',
  problems: '',
  nextPlan: '',
  coordination: ''
})

export const buildContent = (s: MonthlyReportSections): string => {
  return CONTENT_KEYS
    .map((key) => {
      const val = (s[key] || '').trim()
      return val ? `【${SECTION_TITLES[key]}】\n${val}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
}

export const buildPlan = (s: MonthlyReportSections): string => {
  return PLAN_KEYS
    .map((key) => {
      const val = (s[key] || '').trim()
      return val ? `【${SECTION_TITLES[key]}】\n${val}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
}

const parseSections = (text: string, keys: (keyof MonthlyReportSections)[]): Partial<MonthlyReportSections> => {
  const result: Partial<MonthlyReportSections> = {}
  keys.forEach((key) => { result[key] = '' })
  if (!text) return result
  const regex = /【([^】]+)】\s*([\s\S]*?)(?=【[^】]+】|$)/g
  let match
  while ((match = regex.exec(text))) {
    const title = match[1].trim()
    const content = match[2].trim()
    const key = keys.find((k) => SECTION_TITLES[k] === title)
    if (key) result[key] = content
  }
  return result
}

export const sectionsFromReport = (content: string, plan: string): MonthlyReportSections => {
  const fromContent = parseSections(content || '', CONTENT_KEYS)
  const fromPlan = parseSections(plan || '', PLAN_KEYS)
  return {
    ...emptySections(),
    ...fromContent,
    ...fromPlan
  }
}

export const nonEmptySections = (s: MonthlyReportSections): { key: keyof MonthlyReportSections; title: string; content: string }[] => {
  return (Object.keys(SECTION_TITLES) as (keyof MonthlyReportSections)[])
    .map((key) => ({ key, title: SECTION_TITLES[key], content: (s[key] || '').trim() }))
    .filter((sec) => sec.content)
}

export const autoReportTitle = (month: string): string => {
  return month ? `${month}工作月报` : ''
}
