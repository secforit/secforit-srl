"use client"

import { useEffect, useRef, useState } from "react"
import { Shield, Lock, CheckCircle, Users, Award, FileCheck } from "lucide-react"

const differentiators = [
  {
    icon: Shield,
    title: "Security by Design",
    description: "Built-in protection from the ground up",
  },
  {
    icon: Lock,
    title: "Zero Trust Architecture",
    description: "Never trust, always verify",
  },
  {
    icon: CheckCircle,
    title: "Framework Compliant",
    description: "ISO 27001, NIST, SOC 2 aligned",
  },
]

const stats = [
  { value: 6, suffix: "+", label: "Years Experience", icon: Award },
  { value: 7, suffix: "+", label: "Clients Secured", icon: Users },
  { value: 20, suffix: "+", label: "Assessments Done", icon: FileCheck },
]

function AnimatedCounter({
  target,
  suffix,
  isVisible,
}: {
  target: number
  suffix: string
  isVisible: boolean
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isVisible) return

    let startTime: number
    const duration = 2000

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(easeOut * target))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [isVisible, target])

  return (
    <span>
      {count}
      {suffix}
    </span>
  )
}

function CircuitPattern() {
  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Circuit lines */}
      <path
        d="M50 200 H150 V100 H250 V200 H350"
        stroke="rgba(220,38,38,0.4)"
        strokeWidth="2"
        fill="none"
        className="animate-draw"
      />
      <path
        d="M50 250 H100 V300 H200 V250 H300 V350 H350"
        stroke="rgba(10,10,10,0.3)"
        strokeWidth="2"
        fill="none"
        className="animate-draw animation-delay-500"
      />
      <path
        d="M150 50 V150 H250 V50"
        stroke="rgba(220,38,38,0.25)"
        strokeWidth="2"
        fill="none"
        className="animate-draw animation-delay-1000"
      />
      <path
        d="M100 100 H50 V350"
        stroke="rgba(10,10,10,0.25)"
        strokeWidth="2"
        fill="none"
        className="animate-draw animation-delay-300"
      />
      <path
        d="M350 100 V50 H300"
        stroke="rgba(220,38,38,0.3)"
        strokeWidth="2"
        fill="none"
        className="animate-draw animation-delay-700"
      />

      {/* Nodes */}
      {[
        [50, 200],
        [150, 100],
        [250, 200],
        [350, 200],
        [100, 300],
        [200, 250],
        [300, 350],
        [150, 50],
        [250, 50],
        [50, 350],
        [350, 100],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle
            cx={cx}
            cy={cy}
            r="6"
            fill="#ffffff"
            stroke="rgba(220,38,38,0.6)"
            strokeWidth="2"
            className="animate-pulse-slow"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
          <circle
            cx={cx}
            cy={cy}
            r="3"
            fill="rgba(220,38,38,0.9)"
            className="animate-pulse-slow"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        </g>
      ))}

      {/* Central Shield */}
      <g transform="translate(175, 175)">
        <path
          d="M25 5 L45 15 V35 C45 50 35 60 25 65 C15 60 5 50 5 35 V15 L25 5Z"
          fill="rgba(220,38,38,0.15)"
          stroke="rgba(220,38,38,0.7)"
          strokeWidth="2"
          className="animate-pulse-slow"
        />
        <path
          d="M20 30 L23 35 L32 25"
          stroke="rgba(10,10,10,0.9)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      <style>{`
        @keyframes draw {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
        .animate-draw {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: draw 3s ease-out forwards;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animation-delay-300 { animation-delay: 0.3s; }
        .animation-delay-500 { animation-delay: 0.5s; }
        .animation-delay-700 { animation-delay: 0.7s; }
        .animation-delay-1000 { animation-delay: 1s; }
      `}</style>
    </svg>
  )
}

export function AboutSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [statsVisible, setStatsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    const statsObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true)
        }
      },
      { threshold: 0.5 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    if (statsRef.current) statsObserver.observe(statsRef.current)

    return () => {
      observer.disconnect()
      statsObserver.disconnect()
    }
  }, [])

  return (
    <section id="about" className="relative py-24 md:py-32 bg-secondary/30">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />

      <div className="container mx-auto px-4 relative z-10">
        <div
          ref={sectionRef}
          className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto"
        >
          {/* Content Side */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            }`}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              Built on{" "}
              <span className="text-primary">Zero Trust</span> Principles
            </h2>

            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Founded by <strong>Lisman Razvan</strong>, SECFORIT is a cybersecurity consulting
              firm built on the principle that security should be foundational, not an
              afterthought. Our approach combines industry-leading frameworks like
              ISO 27001, NIST, and SOC 2 with modern Zero Trust architecture to create
              comprehensive protection strategies tailored to your organization.
            </p>

            <p className="text-muted-foreground leading-relaxed mb-10">
              With expertise in penetration testing, SIEM deployment, DevSecOps,
              and cloud security, we work alongside your team to implement security
              measures that scale with your business. From compliance consulting
              to secure development, Lisman Razvan and the SECFORIT team deliver
              cybersecurity solutions that defend what matters most.
            </p>

            {/* Differentiators */}
            <div className="space-y-4">
              {differentiators.map((item, index) => (
                <div
                  key={item.title}
                  className={`flex items-start gap-4 p-4 rounded-lg bg-card/50 border border-border hover:border-primary/30 transition-all duration-300 ${
                    isVisible
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-4"
                  }`}
                  style={{ transitionDelay: `${index * 100 + 200}ms` }}
                >
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Side */}
          <div
            className={`relative transition-all duration-700 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div className="relative aspect-square max-w-md mx-auto">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />

              {/* Circuit Pattern */}
              <div className="relative z-10">
                <CircuitPattern />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div
          ref={statsRef}
          className={`mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto transition-all duration-700 ${
            statsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center p-6 rounded-xl bg-card/30 border border-border hover:border-primary/30 transition-all duration-300"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                <AnimatedCounter
                  target={stat.value}
                  suffix={stat.suffix}
                  isVisible={statsVisible}
                />
              </div>
              <p className="text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
