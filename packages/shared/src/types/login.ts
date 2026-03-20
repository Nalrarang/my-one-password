export interface LoginItem {
  type: 'login';
  title: string;
  url: string;
  urls: string[];
  username: string;
  password: string;
  totpSecret?: string;
  totpAlgorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  totpDigits?: 6 | 8;
  totpPeriod?: number;
  notes: string;
  customFields: CustomField[];
}

export interface CustomField {
  name: string;
  value: string;
  type: 'text' | 'concealed' | 'url' | 'email';
}
