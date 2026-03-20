export interface IdentityItem {
  type: 'identity';
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: Address;
  notes: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}
