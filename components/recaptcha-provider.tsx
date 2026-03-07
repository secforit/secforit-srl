"use client"

import { createContext, useContext, useEffect, useCallback } from "react"

interface RecaptchaContextValue {
  executeRecaptcha: ((action: string) => Promise<string>) | null
}

const RecaptchaContext = createContext<RecaptchaContextValue>({ executeRecaptcha: null })

export function useEnterpriseReCaptcha() {
  return useContext(RecaptchaContext)
}

export function RecaptchaProvider({ children }: { children: React.ReactNode }) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  useEffect(() => {
    if (!siteKey) return

    const existing = document.querySelector(`script[src*="recaptcha/enterprise"]`)
    if (existing) return

    const script = document.createElement("script")
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`
    script.async = true
    document.head.appendChild(script)
  }, [siteKey])

  const executeRecaptcha = useCallback(
    async (action: string): Promise<string> => {
      if (!siteKey) return ""

      return new Promise((resolve) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gr = (window as any).grecaptcha?.enterprise
        if (!gr) { resolve(""); return }
        gr.ready(async () => {
          try {
            const token = await gr.execute(siteKey, { action })
            resolve(token)
          } catch {
            resolve("")
          }
        })
      })
    },
    [siteKey]
  )

  if (!siteKey) return <>{children}</>

  return (
    <RecaptchaContext.Provider value={{ executeRecaptcha }}>
      {children}
    </RecaptchaContext.Provider>
  )
}
