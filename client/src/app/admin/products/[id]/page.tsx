import { ProductForm } from '@/components/admin/pages/ProductForm';
export const metadata = { title: 'Product' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductForm id={id === 'new' ? null : id} />;
}
