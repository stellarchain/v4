import OrderStatusClient from './OrderStatusClient';

export default function DirectoryOrderPage() {
  return <OrderStatusClient />;
}

export function generateStaticParams() {
  return [{ order_id: 'status' }];
}
