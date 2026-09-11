import { prisma } from '@/lib/prisma';
import { jsonOk } from '@/lib/api/response';

export async function GET() {
  const products = await prisma.concessionProduct.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });

  return jsonOk({
    products: products.map((product) => ({
      id: product.id.toString(),
      slug: product.slug,
      nameJa: product.nameJa,
      category: product.category,
      price: product.price,
      imageUrl: product.imageUrl,
    })),
  });
}
