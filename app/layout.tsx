import React from "react"
import type { Metadata } from 'next'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CookieConsent } from '@/components/cookie-consent'
import { RecaptchaProvider } from '@/components/recaptcha-provider'
import './globals.css'

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const siteUrl = 'https://www.secforit.ro'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'SECFORIT | Cybersecurity Consulting & Security Solutions by Lisman Razvan',
    template: '%s | SECFORIT - Cybersecurity by Lisman Razvan',
  },
  description: 'SECFORIT, founded by Lisman Razvan, delivers expert cybersecurity consulting, security assessments, ISO 27001 compliance, SIEM solutions, Zero Trust architecture, and secure development. Trusted cybersecurity partner for businesses across Europe.',
  keywords: [
    'cybersecurity consulting',
    'Lisman Razvan',
    'Lisman Razvan cybersecurity',
    'Lisman Razvan SECFORIT',
    'SECFORIT',
    'security consulting',
    'security assessments',
    'ISO 27001 compliance',
    'SOC 2 compliance',
    'NIST compliance',
    'GDPR compliance',
    'Zero Trust architecture',
    'threat analysis',
    'vulnerability assessment',
    'SIEM solutions',
    'security audit',
    'DevSecOps',
    'secure development',
    'cloud security',
    'API security',
    'cybersecurity Romania',
    'information security consulting',
    'risk assessment',
    'incident response',
    'security operations center',
    'managed security services',
    'data protection',
    'network security',
    'application security',
    'cyber threat intelligence',
  ],
  authors: [{ name: 'Lisman Razvan', url: siteUrl }],
  creator: 'Lisman Razvan',
  publisher: 'SECFORIT SRL',
  generator: 'Next.js',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'SECFORIT',
    title: 'SECFORIT | Cybersecurity Consulting & Security Solutions by Lisman Razvan',
    description: 'Expert cybersecurity consulting by Lisman Razvan. Security assessments, ISO 27001, SOC 2, SIEM, Zero Trust architecture, and secure development for businesses.',
    images: [
      {
        url: '/Logo-SECFORIT.png',
        width: 1200,
        height: 630,
        alt: 'SECFORIT - Cybersecurity Consulting by Lisman Razvan',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SECFORIT | Cybersecurity Consulting by Lisman Razvan',
    description: 'Expert cybersecurity consulting: security assessments, ISO 27001, SIEM, Zero Trust, DevSecOps. Founded by Lisman Razvan.',
    images: ['/Logo-SECFORIT.png'],
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      },
    ],
  },
  verification: {},
  category: 'Cybersecurity',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} font-sans antialiased`}>
        <RecaptchaProvider>
          {children}
        </RecaptchaProvider>
        <CookieConsent />
        <Analytics />
      </body>
    </html>
  )
}
