"use client"

import { useEffect, useRef, useState } from "react"
import { Shield, Search, Cog, Code, Network, ArrowRight } from "lucide-react"

const services = [
  {
    icon: Shield,
    title: "Security Consulting",
    description:
      "Strategic advisory, security program development, and compliance alignment with ISO 27001, NIST, and SOC 2 frameworks.",
  },
  {
    icon: Search,
    title: "Threat & Vulnerability Analysis",
    description:
      "Continuous vulnerability scanning, threat modeling, and cloud security posture assessments to identify risks before they become breaches.",
  },
  {
    icon: Cog,
    title: "Automated Security Solutions",
    description:
      "Custom SIEM tuning, security scripting, automated compliance monitoring, and visibility dashboards for real-time insights.",
  },
  {
    icon: Code,
    title: "Secure Web Development",
    description:
      "Applications built with security-first principles, DevSecOps pipelines, and seamless SSO integration for your organization.",
  },
  {
    icon: Network,
    title: "Secure Integration",
    description:
      "Microservices and API security architecture with Zero Trust principles and enterprise-grade secrets management.",
  },
]

function ServiceCard({
  service,
  index,
}: {
  service: (typeof services)[0]
  index: number
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
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

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [index])

  const Icon = service.icon

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative p-6 rounded-xl transition-all duration-500 cursor-pointer ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {/* Glass Background */}
      <div className="absolute inset-0 rounded-xl bg-card/50 backdrop-blur-sm border border-border transition-all duration-300 group-hover:border-primary/50 group-hover:bg-card/70" />

      {/* Animated Border Glow */}
      <div
        className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(10,10,10,0.05) 50%, rgba(220,38,38,0.08) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className="relative mb-4 inline-block">
          <div
            className={`p-3 rounded-lg bg-primary/10 border border-primary/20 transition-all duration-300 ${
              isHovered ? "bg-primary/20 scale-110" : ""
            }`}
          >
            <Icon
              className={`w-6 h-6 text-primary transition-transform duration-300 ${
                isHovered ? "rotate-6" : ""
              }`}
            />
          </div>
          {/* Icon Glow */}
          <div
            className={`absolute inset-0 bg-primary/30 blur-xl rounded-full transition-opacity duration-300 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
          {service.title}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          {service.description}
        </p>

        {/* Learn More Link */}
        <div className="flex items-center gap-2 text-primary text-sm font-medium">
          <span className="relative">
            Learn more
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
          </span>
          <ArrowRight
            className={`w-4 h-4 transition-transform duration-300 ${
              isHovered ? "translate-x-1" : ""
            }`}
          />
        </div>
      </div>
    </div>
  )
}

export function ServicesSection() {
  const [titleVisible, setTitleVisible] = useState(false)
  const titleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTitleVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (titleRef.current) {
      observer.observe(titleRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section id="services" className="relative py-24 md:py-32 bg-background">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div
          ref={titleRef}
          className={`text-center mb-16 transition-all duration-700 ${
            titleVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            Our <span className="text-primary">Services</span>
          </h2>
          <div className="relative inline-block">
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Comprehensive cybersecurity solutions tailored to protect your digital assets
            </p>
            {/* Animated Underline */}
            <div
              className={`absolute -bottom-2 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent transition-all duration-1000 ${
                titleVisible ? "w-48" : "w-0"
              }`}
            />
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {services.slice(0, 3).map((service, index) => (
            <ServiceCard key={service.title} service={service} index={index} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-6">
          {services.slice(3).map((service, index) => (
            <ServiceCard
              key={service.title}
              service={service}
              index={index + 3}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
