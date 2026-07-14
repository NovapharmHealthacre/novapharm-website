# Image and Video SEO Report

## Image authority

The site uses explicit dimensions, alternative text, responsive derivatives where available, stable public URLs and a generated image sitemap. Leadership portraits are connected to canonical Person entities and page-specific social metadata. Pharmaceutical and process images remain subject to licence/provenance and implication checks.

### Implemented controls

- Image elements require `alt`, `width` and `height` through repository validation.
- Approved product imagery retains AVIF, WebP and JPEG derivatives.
- Below-the-fold images remain lazy-load eligible; true LCP images receive priority only where justified.
- Canonical pages are assigned relevant representative social images while the official NovaPharm logo remains available as the identity fallback.
- Leadership portrait filenames/URLs and alt text identify the correct person without keyword stuffing.
- `ImageObject` relationships connect portraits, articles and page entities.
- `sitemap-images.xml` links public images to canonical pages.
- No image may imply that a photographed facility, product or workforce is owned, approved or operated by NovaPharm unless verified.
- Third-party branding and licensing remain part of the existing asset/provenance register.

## Social image policy

Representative images are assigned to:

- homepage;
- Services;
- Regulatory;
- Product Portfolio;
- Partner With Us;
- Technology;
- Insights hub and individual articles;
- Leadership hub and profiles;
- Investor information.

Other pages use the official logo fallback unless a meaningful and licensed page-specific image exists. The generated social-image register records route, public URL, media type, dimensions and alt text.

## Video and motion policy

No `VideoObject` is added merely because the design brief discusses motion. A qualifying video must:

1. be visible and accessible on the page;
2. have a stable content/embed URL and poster;
3. include accurate name, description, upload date, duration and thumbnail;
4. preserve essential text in HTML;
5. be muted when autoplaying and provide pause controls where required;
6. respect `prefers-reduced-motion` and provide a static fallback;
7. provide captions or a transcript where meaningful;
8. stay within the hero-media performance budget;
9. avoid implying ownership of pictured factories, warehouses, products or employees.

A video sitemap or `VideoObject` should be generated only after the visual-refinement phase approves and commits a final substantive video.

## Ongoing quality gate

For every new media asset record:

- source/licence;
- creator/provider;
- permitted commercial use;
- original and derivative hashes;
- page usage;
- dimensions/aspect ratio;
- alt text and caption;
- visual branding review;
- operational/regulatory implication review;
- owner approval;
- replacement/expiry status.
