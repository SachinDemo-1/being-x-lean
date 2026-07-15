import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'BEING_X_LEAN';
const SITE_URL = 'https://beingxlean.com'; // TODO: replace with your real production domain
const DEFAULT_IMAGE = `${SITE_URL}/images/mainbeing.PNG`;
const TWITTER_HANDLE = '@beingxlean';

/**
 * Drop this at the top of every page component.
 *
 * <SEO
 *   title="6 Day Push Pull Legs Workout Plan | BEING_X_LEAN"
 *   description="..."
 *   path="/workout"
 *   schemas={[organizationSchema, breadcrumbSchema]}
 * />
 */
export default function SEO({
  title,
  description,
  path = '/',
  image = DEFAULT_IMAGE,
  noindex = false,
  schemas = [],
}) {
  const url = `${SITE_URL}${path}`;
  const fullTitle = title?.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD structured data (Organization, WebSite, Breadcrumb, FAQ, Article, SoftwareApplication, etc.) */}
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}

// ── Reusable schema builders ────────────────────────────────────────────────

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/mainbeing.PNG`,
    sameAs: [
      'https://www.instagram.com/being_x_lean/',
      'https://www.youtube.com/@Getfitwithprashant',
    ],
  };
}

export function buildWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildBreadcrumbSchema(items) {
  // items: [{ name: 'Home', path: '/' }, { name: 'Workout Plans', path: '/workout' }]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function buildFAQSchema(faqs) {
  // faqs: [{ question: '...', answer: '...' }]
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function buildArticleSchema({ headline, description, path, datePublished, dateModified, image = DEFAULT_IMAGE }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    image,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/mainbeing.PNG` },
    },
    datePublished,
    dateModified: dateModified || datePublished,
    mainEntityOfPage: `${SITE_URL}${path}`,
  };
}

export function buildSoftwareApplicationSchema({ name, description, path, ratingValue, ratingCount }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url: `${SITE_URL}${path}`,
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  };
  if (ratingValue) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue,
      ratingCount: ratingCount || 1,
    };
  }
  return schema;
}

export { SITE_URL, SITE_NAME };