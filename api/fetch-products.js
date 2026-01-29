// Node.js 18+ has native fetch - no import required
// Ensure package.json has: "type": "module" and "engines": { "node": ">=18.0.0" }

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
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

        // Fetch the page with browser-like headers
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();

        // Extract products from the page
        const products = extractProducts(html);

        return res.status(200).json({
            products,
            count: products.length,
            source: 'api'
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({
            error: 'Failed to fetch products',
            details: error.message
        });
    }
}

function extractProducts(html) {
    const products = [];

    try {
        // Method 1: Try window.__STORE__ pattern (original Jumia format)
        const storePatterns = [
            /window\.__STORE__\s*=\s*({[\s\S]*?});\s*<\/script/,
            /window\.__STORE__\s*=\s*({[\s\S]*?});/,
            /__STORE__\s*=\s*({[\s\S]*?});/
        ];

        for (const pattern of storePatterns) {
            const storeMatch = html.match(pattern);
            if (storeMatch) {
                try {
                    const storeData = JSON.parse(storeMatch[1]);
                    if (storeData.products && Array.isArray(storeData.products)) {
                        return formatProducts(storeData.products);
                    }
                } catch (e) {
                    console.log('Failed to parse __STORE__:', e.message);
                }
            }
        }

        // Method 2: Look for products JSON in script tags
        const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
        let match;

        while ((match = scriptRegex.exec(html)) !== null) {
            const content = match[1];

            // Skip if too short or doesn't contain product indicators
            if (content.length < 100 || !content.includes('sku')) continue;

            // Try to find products array patterns
            const productPatterns = [
                /"products"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
                /products\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
                /"items"\s*:\s*(\[[\s\S]*?\])\s*[,}]/
            ];

            for (const prodPattern of productPatterns) {
                const prodMatch = content.match(prodPattern);
                if (prodMatch) {
                    try {
                        const parsed = JSON.parse(prodMatch[1]);
                        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].sku) {
                            return formatProducts(parsed);
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
        }

        // Method 3: Look for individual product objects with SKU
        const skuPattern = /\{"sku"\s*:\s*"([A-Z0-9]+)"[^}]*"name"\s*:\s*"([^"]+)"[^}]*\}/g;
        let skuMatch;

        while ((skuMatch = skuPattern.exec(html)) !== null) {
            try {
                const productJson = skuMatch[0];
                // Try to parse as complete JSON object
                const product = JSON.parse(productJson);
                if (product.sku) {
                    products.push(formatProduct(product));
                }
            } catch (e) {
                // If can't parse full object, extract basic info
                products.push({
                    sku: skuMatch[1],
                    name: skuMatch[2],
                    brand: '',
                    prices: { price: '0', rawPrice: '0' },
                    rating: { average: 0, totalRatings: 0 },
                    image: '',
                    url: `/catalog/?q=${skuMatch[1]}`
                });
            }
        }

        if (products.length > 0) {
            return products;
        }

        // Method 4: Extract from data attributes in HTML
        const dataSkuPattern = /data-sku=["']([A-Z0-9]+)["']/g;
        const skus = new Set();
        let dataMatch;

        while ((dataMatch = dataSkuPattern.exec(html)) !== null) {
            skus.add(dataMatch[1]);
        }

        if (skus.size > 0) {
            return Array.from(skus).map(sku => ({
                sku,
                name: 'Product',
                brand: '',
                prices: { price: '0', rawPrice: '0' },
                rating: { average: 0, totalRatings: 0 },
                image: '',
                url: `/catalog/?q=${sku}`
            }));
        }

        return [];

    } catch (error) {
        console.error('Extract products error:', error);
        return products;
    }
}

function formatProducts(products) {
    return products
        .filter(product => product && product.sku)
        .map(product => formatProduct(product));
}

function formatProduct(product) {
    return {
        sku: product.sku || '',
        name: product.name || product.displayName || '',
        brand: product.brand || '',
        sellerId: product.sellerId || 0,
        isShopGlobal: product.isShopGlobal || false,
        isShopExpress: product.isShopExpress || false,
        categories: product.categories || product.category || '',
        prices: {
            rawPrice: product.prices?.rawPrice || product.rawPrice || '0',
            price: product.prices?.price || product.price || '0',
            oldPrice: product.prices?.oldPrice || product.oldPrice || '',
            discount: product.prices?.discount || product.discount || '0'
        },
        stock: product.stock || null,
        rating: {
            average: product.rating?.average || product.ratingAverage || 0,
            totalRatings: product.rating?.totalRatings || product.totalRatings || 0
        },
        image: product.image || product.imageUrl || '',
        url: product.url || product.link || '',
        isBuyable: product.isBuyable !== false,
        shopGlobal: product.shopGlobal || null,
        sellerName: extractSellerName(product)
    };
}

function extractSellerName(product) {
    if (product.sellerName) return product.sellerName;
    if (product.shopGlobal?.name) return product.shopGlobal.name;
    if (product.seller?.name) return product.seller.name;
    return null;
}
