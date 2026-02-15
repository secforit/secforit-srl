"use client"

import React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Mail,
  Phone,
  Copy,
  Check,
  Loader2,
  Shield,
  MapPin,
  Clock,
  Linkedin,
} from "lucide-react"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"

// Phone number split into parts to prevent bot/spider scraping from static HTML.
// Assembled only at runtime via JavaScript — never appears as a single string in source.
const _p = ["+40", "752", "823", "794"]
function getPhone() {
  return _p.join("")
}
function getPhoneDisplay() {
  return `${_p[0]} ${_p[1]} ${_p[2]} ${_p[3]}`
}

export function ContactPageContent() {
  const { executeRecaptcha } = useGoogleReCaptcha()
  const [isVisible, setIsVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [copied, setCopied] = useState(false)
  const [phoneCopied, setPhoneCopied] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const honeypotRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  })

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError("")

    try {
      let recaptchaToken = ""
      if (executeRecaptcha) {
        recaptchaToken = await executeRecaptcha("contact_form")
      }

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          _hp_website: honeypotRef.current?.value || "",
          recaptchaToken,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setSubmitError(data.error || "Something went wrong. Please try again.")
        setIsSubmitting(false)
        return
      }

      setIsSubmitting(false)
      setIsSubmitted(true)
      setFormData({ name: "", email: "", company: "", message: "" })
      setTimeout(() => setIsSubmitted(false), 4000)
    } catch {
      setSubmitError("Network error. Please check your connection and try again.")
      setIsSubmitting(false)
    }
  }

  const copyEmail = async () => {
    await navigator.clipboard.writeText("razvan@secforit.ro")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyPhone = async () => {
    await navigator.clipboard.writeText(getPhone())
    setPhoneCopied(true)
    setTimeout(() => setPhoneCopied(false), 2000)
  }

  return (
    <section
      ref={sectionRef}
      className="relative pt-32 pb-24 md:pt-40 md:pb-32 bg-background overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.05)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(10,10,10,0.03)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Page Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Get in Touch
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
            {"Let's"} <span className="text-primary">Secure</span> Your Future
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Ready to strengthen your security posture? Reach out to our team
            of experts and we will get back to you within 24 hours.
          </p>
          <div
            className={`mx-auto mt-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent transition-all duration-1000 ${
              isVisible ? "w-48" : "w-0"
            }`}
          />
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-8 items-stretch">
            {/* Contact Form */}
            <div
              className={`lg:col-span-3 transition-all duration-700 delay-100 ${
                isVisible
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-8"
              }`}
            >
              <div className="h-full p-8 rounded-2xl bg-card/50 backdrop-blur-sm border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                  Send us a Message
                </h2>
                <form onSubmit={handleSubmit} className="h-[calc(100%-2.75rem)] flex flex-col">
                  {/* Honeypot field — hidden from real users, bots will fill it */}
                  <input
                    ref={honeypotRef}
                    type="text"
                    name="_hp_website"
                    autoComplete="off"
                    tabIndex={-1}
                    aria-hidden="true"
                    style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, width: 0 }}
                  />

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-foreground">
                        Name
                      </Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                        className="bg-background border-border focus:border-primary focus:ring-primary/20 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-foreground">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@company.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                        className="bg-background border-border focus:border-primary focus:ring-primary/20 transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mt-6">
                    <Label htmlFor="company" className="text-foreground">
                      Company
                    </Label>
                    <Input
                      id="company"
                      placeholder="Your Company"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                      className="bg-background border-border focus:border-primary focus:ring-primary/20 transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2 mt-6 flex-1 flex flex-col">
                    <Label htmlFor="message" className="text-foreground">
                      Message
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us about your security needs..."
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      required
                      className="bg-background border-border focus:border-primary focus:ring-primary/20 transition-all duration-300 resize-none flex-1 min-h-[120px]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || isSubmitted}
                    className={`w-full py-6 text-base transition-all duration-300 mt-6 ${
                      isSubmitted
                        ? "bg-accent text-accent-foreground"
                        : "bg-primary text-primary-foreground hover:bg-sec-red-dark hover:shadow-[0_0_30px_rgba(220,38,38,0.4)]"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : isSubmitted ? (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Message Sent!
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </Button>

                  {submitError && (
                    <p className="text-sm text-red-500 text-center mt-3">
                      {submitError}
                    </p>
                  )}
                </form>
              </div>
            </div>

            {/* Contact Info */}
            <div
              className={`lg:col-span-2 transition-all duration-700 delay-200 ${
                isVisible
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-8"
              }`}
            >
              <div className="h-full flex flex-col gap-4">
                {/* Email Card */}
                <div className="p-6 rounded-2xl bg-card/50 border border-border backdrop-blur-sm">
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    Direct Contact
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Prefer email? Reach out directly and our team will respond
                    within 24 hours.
                  </p>

                  <button
                    onClick={copyEmail}
                    className="group flex items-center gap-3 w-full p-4 rounded-lg bg-background/50 border border-border hover:border-primary/50 transition-all duration-300"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors duration-300">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-xs text-muted-foreground">Email us at</p>
                      <p className="text-foreground font-medium">
                        razvan@secforit.ro
                      </p>
                    </div>
                    <div className="p-2 text-muted-foreground group-hover:text-primary transition-colors duration-300">
                      {copied ? (
                        <Check className="w-5 h-5 text-accent" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </div>
                  </button>
                </div>

                {/* Phone Card */}
                <div className="p-6 rounded-2xl bg-card/50 border border-border backdrop-blur-sm">
                  <button
                    onClick={copyPhone}
                    className="group flex items-center gap-3 w-full p-4 rounded-lg bg-background/50 border border-border hover:border-primary/50 transition-all duration-300"
                    aria-label="Copy phone number"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors duration-300">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-xs text-muted-foreground">Call us at</p>
                      <p className="text-foreground font-medium" aria-hidden="true">
                        {getPhoneDisplay()}
                      </p>
                    </div>
                    <div className="p-2 text-muted-foreground group-hover:text-primary transition-colors duration-300">
                      {phoneCopied ? (
                        <Check className="w-5 h-5 text-accent" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </div>
                  </button>
                </div>

                {/* Info Cards */}
                <div className="flex-1 p-6 rounded-2xl bg-card/50 border border-border backdrop-blur-sm flex items-center">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">
                        Response Time
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        We typically respond within 24 hours on business days.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-6 rounded-2xl bg-card/50 border border-border backdrop-blur-sm flex items-center">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">
                        Location
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Romania, EU — serving clients worldwide.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-6 rounded-2xl bg-card/50 border border-border backdrop-blur-sm flex items-center">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <Linkedin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">
                        LinkedIn
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Connect with us for updates and insights.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
