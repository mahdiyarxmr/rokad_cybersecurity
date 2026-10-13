export type BrandThemeKey =
  | 'ecosystem'
  | 'male'
  | 'female'
  | 'college'
  | 'club';

export type TenantType =
  | 'PLATFORM'
  | 'SCHOOL'
  | 'COLLEGE'
  | 'CLUB'
  | 'PROJECT_INSTITUTE'
  | 'MULTI_CAMPUS_NETWORK';

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  subdomain?: string;
  customDomain?: string;
  type: TenantType;
  theme: BrandThemeKey;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  settings?: {
    branding?: {
      primaryColor?: string;
      secondaryColor?: string;
      faviconUrl?: string;
      mottoText?: string;
    };
  };
}
