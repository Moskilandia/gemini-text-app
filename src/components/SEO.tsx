import { Helmet } from "react-helmet-async";

type SEOProps = {
  title: string;
  description: string;
  path?: string;
};

const SITE_NAME = "Reasonly";
const BASE_URL = "https://reasonly.ai";

export default function SEO({ title, description, path = "" }: SEOProps) {
  const url = `${BASE_URL}${path}`;

  return (
    <Helmet>
      {/* Basic */}
      <title>{title} | {SITE_NAME}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={`${title} | ${SITE_NAME}`} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${title} | ${SITE_NAME}`} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
