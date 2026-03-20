export interface CardItem {
  type: 'card';
  title: string;
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  pin?: string;
  notes: string;
}
