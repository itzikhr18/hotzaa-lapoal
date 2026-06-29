// Single source of truth for site identity + social/brand profiles.
//
// HOW TO USE: once a real social profile exists, uncomment the relevant line
// below and replace the placeholder URL with the real one. Until then, NOTHING
// is rendered — no empty footer links and no empty `sameAs` entries are emitted.
// This wires the SEO audit's #1 off-page finding so it becomes a one-line change
// the moment the profiles go live.

export const SITE = {
  name: 'הוצאהלפועל.info',
  url: 'https://hotzaa-lapoal.info',
};

export interface SocialProfile {
  label: string;
  href: string;
  icon: string; // emoji or short label, rendered in the footer
}

// Fill in real URLs as profiles are created. Leave commented to render nothing.
export const SOCIAL_PROFILES: SocialProfile[] = [
  // { label: 'פייסבוק', href: 'https://www.facebook.com/<page>', icon: '📘' },
  // { label: 'יוטיוב',  href: 'https://www.youtube.com/@<channel>', icon: '▶️' },
  // { label: 'טיקטוק',  href: 'https://www.tiktok.com/@<handle>', icon: '🎵' },
  // { label: 'אינסטגרם', href: 'https://www.instagram.com/<handle>', icon: '📷' },
];

// URLs only, for schema.org `sameAs`. Empty until profiles are added.
export const socialUrls = (): string[] =>
  SOCIAL_PROFILES.map((p) => p.href).filter(Boolean);
