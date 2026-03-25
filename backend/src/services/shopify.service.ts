import axios from 'axios';
import prisma from '../lib/prisma';

interface ShopifyImage {
  src: string;
  alt?: string;
}

interface ShopifyProductResponse {
  product: {
    id: number;
    handle: string;
    admin_graphql_api_id: string;
  };
}

const isEnabled = () => process.env['SHOPIFY_ENABLED'] === 'true';

const shopifyClient = () => {
  const domain = process.env['SHOPIFY_STORE_DOMAIN'];
  const token = process.env['SHOPIFY_ACCESS_TOKEN'];
  if (!domain || !token) throw new Error('Shopify credentials not configured');

  return axios.create({
    baseURL: `https://${domain}/admin/api/2024-10`,
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
  });
};

const buildDescription = (bag: {
  brand: string; model: string; color: string; size: string | null;
  condition: string; serialNumber: string | null; authStatus: boolean;
  authNotes: string | null; notes: string | null;
}): string => {
  const conditionLabel: Record<string, string> = {
    NEW: 'New', EXCELLENT: 'Excellent', GOOD: 'Good', FAIR: 'Fair',
  };

  const lines = [
    `<strong>Brand:</strong> ${bag.brand}`,
    `<strong>Model:</strong> ${bag.model}`,
    `<strong>Color:</strong> ${bag.color}`,
    ...(bag.size ? [`<strong>Size:</strong> ${bag.size}`] : []),
    `<strong>Condition:</strong> ${conditionLabel[bag.condition] ?? bag.condition}`,
    ...(bag.serialNumber ? [`<strong>Serial Number:</strong> ${bag.serialNumber}`] : []),
    `<strong>Authenticated:</strong> ${bag.authStatus ? 'Yes ✓' : 'Pending'}`,
    ...(bag.authNotes ? [`<strong>Authentication Notes:</strong> ${bag.authNotes}`] : []),
    ...(bag.notes ? [`<br/><p>${bag.notes}</p>`] : []),
  ];

  return lines.join('<br/>');
};

export const pushBagToShopify = async (bagId: number): Promise<void> => {
  if (!isEnabled()) {
    console.log(`[Shopify] Disabled — skipping push for bag ${bagId}`);
    return;
  }

  const bag = await prisma.bag.findUnique({
    where: { id: bagId },
    include: { photos: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
  });

  if (!bag) throw new Error(`Bag ${bagId} not found`);
  if (bag.stage !== 'LISTED') throw new Error('Bag must be in LISTED stage to push to Shopify');

  const client = shopifyClient();
  const domain = process.env['SHOPIFY_STORE_DOMAIN']!;
  const title = `${bag.brand} ${bag.model} — ${bag.color}${bag.size ? ` (${bag.size})` : ''}`;

  // Build absolute photo URLs for Shopify (needs public URLs, not local paths)
  const images: ShopifyImage[] = bag.photos.map((p) => ({
    src: `https://${domain.replace('.myshopify.com', '')}.myshopify.com${p.url}`,
    alt: title,
  }));

  const productPayload = {
    product: {
      title,
      body_html: buildDescription(bag),
      vendor: bag.brand,
      product_type: 'Handbag',
      status: 'active',
      tags: [bag.brand, bag.model, bag.color, bag.condition].filter(Boolean).join(', '),
      variants: [
        {
          price: String(bag.listingPrice ?? bag.purchasePrice),
          inventory_management: 'shopify',
          inventory_quantity: 1,
          sku: bag.serialNumber ?? `BAG-${bag.id}`,
          requires_shipping: true,
        },
      ],
      ...(images.length > 0 ? { images } : {}),
    },
  };

  let response: ShopifyProductResponse;

  if (bag.shopifyProductId) {
    // Product already exists — update it
    const numericId = bag.shopifyProductId.split('/').pop();
    const res = await client.put<ShopifyProductResponse>(`/products/${numericId}.json`, productPayload);
    response = res.data;
    console.log(`[Shopify] Updated product ${numericId} for bag ${bagId}`);
  } else {
    // Create new product
    const res = await client.post<ShopifyProductResponse>('/products.json', productPayload);
    response = res.data;
    console.log(`[Shopify] Created product ${response.product.id} for bag ${bagId}`);
  }

  const productId = response.product.admin_graphql_api_id ?? `gid://shopify/Product/${response.product.id}`;
  const handle = response.product.handle;
  const productUrl = `https://${domain}/products/${handle}`;

  await prisma.bag.update({
    where: { id: bagId },
    data: { shopifyProductId: productId, shopifyProductUrl: productUrl },
  });
};

export const unpublishBagFromShopify = async (bagId: number): Promise<void> => {
  if (!isEnabled()) return;

  const bag = await prisma.bag.findUnique({ where: { id: bagId } });
  if (!bag?.shopifyProductId) return;

  const client = shopifyClient();
  const numericId = bag.shopifyProductId.split('/').pop();

  await client.put(`/products/${numericId}.json`, {
    product: { id: numericId, status: 'draft' },
  });

  console.log(`[Shopify] Unpublished product ${numericId} for bag ${bagId}`);
};
