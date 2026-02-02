"use client"

import { useEffect, useRef, useState } from "react"
import {
  Shield,
  Search,
  Cog,
  Code,
  Network,
  ArrowRight,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const services = [
  {
    icon: Shield,
    title: "Security Consulting",
    description:
      "Strategic advisory, security program development, and compliance alignment with ISO 27001, NIST, and SOC 2 frameworks.",
    details: [
      "Security program development & maturity assessment",
      "Risk assessment and management strategy",
      "Compliance gap analysis and roadmap planning",
      "Security policy and procedure development",
      "Executive-level security advisory",
      "Incident response planning and tabletop exercises",
    ],
  },
  {
    icon: Search,
    title: "Threat & Vulnerability Analysis",
    description:
      "Continuous vulnerability scanning, threat modeling, and cloud security posture assessments to identify risks before they become breaches.",
    details: [
      "Penetration testing and red team exercises",
      "Continuous vulnerability scanning and management",
      "Cloud security posture assessment (AWS, Azure, GCP)",
      "Threat modeling and attack surface mapping",
      "Third-party risk assessment",
      "Dark web monitoring and threat intelligence",
    ],
  },
  {
    icon: Cog,
    title: "Automated Security Solutions",
    description:
      "Custom SIEM tuning, security scripting, automated compliance monitoring, and visibility dashboards for real-time insights.",
    details: [
      "SIEM deployment, tuning, and optimization",
      "Security orchestration and automated response (SOAR)",
      "Automated compliance monitoring and reporting",
      "Custom security tooling and scripting",
      "Real-time security dashboards and alerting",
      "Log management and correlation analysis",
    ],
  },
  {
    icon: Code,
    title: "Secure Web Development",
    description:
      "Applications built with security-first principles, DevSecOps pipelines, and seamless SSO integration for your organization.",
    details: [
      "Secure application architecture and design",
      "DevSecOps pipeline implementation (CI/CD)",
      "Code review and static analysis integration",
      "SSO and identity management solutions",
      "Web application firewall configuration",
      "Security testing automation in development",
    ],
  },
  {
    icon: Network,
    title: "Secure Integration",
    description:
      "Microservices and API security architecture with Zero Trust principles and enterprise-grade secrets management.",
    details: [
      "API security design and gateway configuration",
      "Zero Trust network architecture",
      "Microservices security patterns",
      "Secrets management and vault solutions",
      "Service mesh security implementation",
      "Identity federation and access control",
    ],
  },
]

function ServiceDetailCard({
  service,
  index,
}: {
  service: (typeof services)[0]
  index: number
}) {
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), index * 100)
        }
      },
      { threshold: 0.1 }
    )

    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [index])

  const Icon = service.icon
  const isEven = index % 2 === 0

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="group relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 rounded-2xl bg-card/50 backdrop-blur-sm border border-border transition-all duration-300 group-hover:border-primary/40" />

        <div className={`relative z-10 p-8 md:p-10 grid md:grid-cols-2 gap-8 items-center ${!isEven ? "md:[direction:rtl]" : ""}`}>
          {/* Info Side */}
          <div className={!isEven ? "md:[direction:ltr]" : ""}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                {service.title}
              </h3>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">
              {service.description}
            </p>
            <Button
              asChild
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
            >
              <Link href="/contact">
                Request Consultation
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          {/* Details Side */}
          <div className={!isEven ? "md:[direction:ltr]" : ""}>
            <div className="space-y-3">
              {service.details.map((detail, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50 transition-all duration-300 hover:border-primary/30"
                >
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ServicesPageContent() {
  const [headerVisible, setHeaderVisible] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHeaderVisible(true)
      },
      { threshold: 0.1 }
    )

    if (headerRef.current) observer.observe(headerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 bg-background">
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.05)_0%,transparent_50%)]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Page Header */}
        <div
          ref={headerRef}
          className={`text-center mb-20 transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Cybersecurity Solutions
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
            Our <span className="text-primary">Services</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Comprehensive cybersecurity solutions built on Zero Trust principles,
            tailored to protect your organization at every level.
          </p>
          <div
            className={`mx-auto mt-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent transition-all duration-1000 ${
              headerVisible ? "w-48" : "w-0"
            }`}
          />
        </div>

        {/* Service Cards */}
        <div className="space-y-8 max-w-6xl mx-auto">
          {services.map((service, index) => (
            <ServiceDetailCard
              key={service.title}
              service={service}
              index={index}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20">
          <p className="text-muted-foreground mb-6">
            Need a custom solution? We tailor our services to your specific requirements.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-sec-red-dark hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all duration-300 px-8 py-6 text-base"
          >
            <Link href="/contact">
              Start a Conversation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
