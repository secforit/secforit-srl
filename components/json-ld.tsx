export function JsonLd() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SECFORIT',
    legalName: 'SECFORIT SRL',
    url: 'https://www.secforit.ro',
    logo: 'https://www.secforit.ro/Logo-SECFORIT.png',
    description:
      'SECFORIT is a cybersecurity consulting company founded by Lisman Razvan, specializing in penetration testing, ISO 27001 compliance, SIEM solutions, Zero Trust architecture, and secure application development.',
    foundingDate: '2019',
    founder: {
      '@type': 'Person',
      name: 'Lisman Razvan',
      jobTitle: 'Cybersecurity Consultant & Founder',
      url: 'https://www.secforit.ro',
      sameAs: [],
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'RO',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'razvan@secforit.ro',
      contactType: 'customer service',
      availableLanguage: ['English', 'Romanian'],
    },
    sameAs: [],
    areaServed: {
      '@type': 'GeoCircle',
      geoMidpoint: {
        '@type': 'GeoCoordinates',
        latitude: 46.7712,
        longitude: 23.6236,
      },
      geoRadius: '5000',
    },
    knowsAbout: [
      'Cybersecurity',
      'Penetration Testing',
      'ISO 27001',
      'SOC 2',
      'NIST',
      'Zero Trust Architecture',
      'SIEM',
      'DevSecOps',
      'Cloud Security',
      'API Security',
      'Vulnerability Assessment',
      'Risk Management',
      'GDPR Compliance',
      'Incident Response',
      'Security Consulting',
    ],
  }

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Lisman Razvan',
    jobTitle: 'Cybersecurity Expert & Consultant',
    worksFor: {
      '@type': 'Organization',
      name: 'SECFORIT',
      url: 'https://www.secforit.ro',
    },
    url: 'https://www.secforit.ro',
    description:
      'Lisman Razvan is a cybersecurity expert and the founder of SECFORIT, providing professional security consulting, penetration testing, compliance advisory, and secure development solutions for businesses across Europe.',
    knowsAbout: [
      'Cybersecurity Consulting',
      'Penetration Testing',
      'ISO 27001 Compliance',
      'SOC 2 Auditing',
      'SIEM Deployment',
      'Zero Trust Architecture',
      'DevSecOps',
      'Cloud Security',
      'Threat Intelligence',
      'Incident Response',
      'Risk Assessment',
      'Secure Web Development',
    ],
    sameAs: [],
  }

  const servicesSchema = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'SECFORIT Cybersecurity Consulting',
    provider: {
      '@type': 'Organization',
      name: 'SECFORIT',
    },
    url: 'https://www.secforit.ro/services',
    description:
      'Professional cybersecurity services including penetration testing, ISO 27001 compliance consulting, SIEM deployment, DevSecOps implementation, and Zero Trust architecture design.',
    serviceType: 'Cybersecurity Consulting',
    areaServed: 'Europe',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Cybersecurity Services',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Security Consulting',
            description:
              'Strategic cybersecurity advisory, security program development, ISO 27001, NIST, and SOC 2 compliance alignment, risk assessment, and incident response planning.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Penetration Testing & Vulnerability Assessment',
            description:
              'Professional penetration testing, red team exercises, vulnerability scanning, cloud security posture assessment for AWS, Azure, and GCP, threat modeling, and dark web monitoring.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'SIEM & Automated Security Solutions',
            description:
              'SIEM deployment and optimization, SOAR implementation, automated compliance monitoring, custom security tooling, real-time security dashboards, and log management.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Secure Web Development & DevSecOps',
            description:
              'Secure application architecture, DevSecOps CI/CD pipeline implementation, SSO and identity management, web application firewall configuration, and security testing automation.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Secure Integration & Zero Trust Architecture',
            description:
              'API security design, Zero Trust network architecture, microservices security patterns, secrets management, service mesh security, and identity federation.',
          },
        },
      ],
    },
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SECFORIT',
    url: 'https://www.secforit.ro',
    description:
      'SECFORIT - Cybersecurity consulting and security solutions by Lisman Razvan. Expert penetration testing, compliance, and secure development.',
    publisher: {
      '@type': 'Organization',
      name: 'SECFORIT',
      url: 'https://www.secforit.ro',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  )
}
