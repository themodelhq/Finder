// Native fetch is available in Node.js 18+ (no import required)
// Ensure "engines": { "node": ">=18.0.0" } is set in package.json

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Fetch the page
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();

        // Extract products from the page
        const products = extractProducts(html);

        return res.status(200).json({ products });

    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({
            error: 'Failed to fetch products',
            details: error.message
        });
    }
}

function extractProducts(html) {
    try {
        // Method 1: Try to find window.__STORE__ pattern
        const storeMatch = html.match(/window\.__STORE__\s*=\s*({[\s\S]*?});/);

        if (storeMatch) {
            try {
                const storeData = JSON.parse(storeMatch[1]);
                if (storeData.products && Array.isArray(storeData.products)) {
                    return formatProducts(storeData.products);
                }
            } catch (e) {
                console.log('Failed to parse __STORE__, trying alternative method');
            }
        }

        // Method 2: Look for products in any script tag
        const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);

        if (scriptMatches) {
            for (const scriptContent of scriptMatches) {
                // Remove script tags
                const content = scriptContent.replace(/<\/?script[^>]*>/gi, '');

                // Look for products array
                const productsMatch = content.match(/"products"\s*:\s*\[[\s\S]*?\]/);

                if (productsMatch) {
                    try {
                        // Wrap in object for valid JSON
                        const jsonStr = `{${productsMatch[0]}}`;
                        const parsed = JSON.parse(jsonStr);

                        if (parsed.products && Array.isArray(parsed.products)) {
                            return formatProducts(parsed.products);
                        }
                    } catch (e) {
                        console.log('Failed to parse products array, continuing...');
                    }
                }
            }
        }

        return [];

    } catch (error) {
        console.error('Extract products error:', error);
        return [];
    }
}

function formatProducts(products) {
    return products
        .filter(product => product && product.sku)
        .map(product => ({
            sku: product.sku || '',
            name: product.name || '',
            brand: product.brand || '',
            sellerId: product.sellerId || 0,
            isShopGlobal: product.isShopGlobal || false,
            isShopExpress: product.isShopExpress || false,
            categories: product.categories || '',
            prices: {
                rawPrice: product.prices?.rawPrice || '0',
                price: product.prices?.price || '0',
                oldPrice: product.prices?.oldPrice || '',
                discount: product.prices?.discount || '0'
            },
            stock: product.stock || null,
            rating: {
                average: product.rating?.average || 0,
                totalRatings: product.rating?.totalRatings || 0
            },
            image: product.image || '',
            url: product.url || '',
            isBuyable: product.isBuyable !== false,
            shopGlobal: product.shopGlobal || null,
            sellerName: extractSellerName(product)
        }));
}

function extractSellerName(product) {
    // Try to get seller name from various sources
    if (product.sellerName) return product.sellerName;
    if (product.shopGlobal && product.shopGlobal.name) return product.shopGlobal.name;
    if (product.seller && product.seller.name) return product.seller.name;
    return null;
}
