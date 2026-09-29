export interface AiAction {
  type: 'navigate' | 'faq'
  path?: string
  canPrefill?: boolean
}

export interface AiShortcut {
  id: string
  label: string
}

export interface AiSuggestion extends AiShortcut {
  text: string
}

export interface AiResponse {
  success: boolean
  reply: string
  intent: { id: string; label: string } | null
  action: AiAction | null
  shortcuts: AiShortcut[]
  related?: AiSuggestion[]
  matched: 'intent' | 'faq' | 'fallback'
}

// 调用后端 AI 意图网关（自动携带 JWT，走全局 fetch 包装亦可，这里显式带 token 更稳）
export async function askAi(payload: { text?: string; action?: string }): Promise<AiResponse> {
  const token = localStorage.getItem('token')
  const res = await fetch('/api/ai/intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  })
  return (await res.json()) as AiResponse
}
