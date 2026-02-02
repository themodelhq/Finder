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

        // Extract products from the page (now async)
        const products = await extractProducts(html);

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

async function extractProducts(html) {
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
                        return await formatProducts(storeData.products);
                    }
                } catch (e) {
                    console.log('Failed to parse __STORE__:', e.message);
                }
            }
        }

        // Method 2: Look for products JSON in script tags with better extraction
        const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
        let match;

        while ((match = scriptRegex.exec(html)) !== null) {
            const content = match[1];

            // Skip if too short or doesn't contain product indicators
            if (content.length < 100) continue;

            // Try to find products array patterns with improved matching
            const productPatterns = [
                /"products"\s*:\s*(\[[\s\S]*?\])\s*[,}\]]/,
                /products\s*:\s*(\[[\s\S]*?\])\s*[,}\]]/,
                /"items"\s*:\s*(\[[\s\S]*?\])\s*[,}\]]/,
                /items\s*:\s*(\[[\s\S]*?\])\s*[,}\]]/
            ];

            for (const prodPattern of productPatterns) {
                const prodMatch = content.match(prodPattern);
                if (prodMatch) {
                    try {
                        const parsed = JSON.parse(prodMatch[1]);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            // Check if it looks like product data
                            if (parsed[0].sku || parsed[0].name || parsed[0].id) {
                                const formattedProducts = await formatProducts(parsed);
                                if (formattedProducts.length > 0) {
                                    return formattedProducts;
                                }
                            }
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
                    products.push(await formatProduct(product));
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

async function formatProducts(products) {
    const filtered = products.filter(product => product && product.sku);
    return await mapWithConcurrency(filtered, 6, async (product) => {
        return await formatProduct(product);
    });
}

async function formatProduct(product) {
    // First try to extract seller name from product data
    let sellerName = extractSellerName(product);
    
    // If no seller name found and we have a product URL, fetch it from the product page
    if (!sellerName && product.url) {
        sellerName = await fetchSellerNameFromProductPage(product.url);
    }
    
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
        // Preserve all seller-related data structures
        seller: product.seller || null,
        shopGlobal: product.shopGlobal || null,
        shop: product.shop || null,
        sellerName: sellerName
    };
}

async function fetchSellerNameFromProductPage(productUrl) {
    try {
        // Construct full URL if relative path
        const fullUrl = productUrl.startsWith('http') ? productUrl : `https://www.jumia.com.ng${productUrl}`;
        
        const response = await fetch(fullUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            }
        });
        
        if (!response.ok) {
            console.log(`Failed to fetch product page: ${response.status}`);
            return null;
        }
        
        const html = await response.text();
        
        // Method 1: Extract from seller information section - most reliable
        // Pattern: <p class="-m -pbs">Seller Name</p> inside seller card
        const sellerCardMatch = html.match(/<a[^>]*href="[^"]*"[^>]*class="[^"]*-pas[^"]*-df[^"]*-i-ctr[^"]*-upp[^"]*"[^>]*>[\s\S]*?<h2[^>]*>Seller Information<\/h2>[\s\S]*?<\/a>[\s\S]*?<div[^>]*class="[^"]*-hr[^"]*-pas[^"]*"[^>]*>[\s\S]*?<p[^>]*class="[^"]*-m[^"]*-pbs[^"]*"[^>]*>(.*?)<\/p>/i);
        if (sellerCardMatch && sellerCardMatch[1]) {
            return sellerCardMatch[1].trim();
        }
        
        // Method 2: Extract from Product Line specification
        const productLineMatch = html.match(/<span[^>]*class="[^"]*-b[^"]*"[^>]*>Product Line<\/span>\s*:\s*([^<]+)/i);
        if (productLineMatch && productLineMatch[1]) {
            return productLineMatch[1].trim();
        }
        
        // Method 3: Extract from any seller link pattern
        const sellerLinkMatch = html.match(/\/([^\/]+)\/"[^>]*class="[^"]*-pas[^"]*-df[^"]*-i-ctr[^"]*-upp[^"]*"[^>]*>[\s\S]*?Seller Information/i);
        if (sellerLinkMatch && sellerLinkMatch[1]) {
            // Decode URL-encoded seller name
            return decodeURIComponent(sellerLinkMatch[1].replace(/-/g, ' '));
        }
        
        // Method 4: Look for seller info in structured data
        const structuredDataMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
        if (structuredDataMatch) {
            try {
                const jsonData = JSON.parse(structuredDataMatch[1]);
                if (jsonData.seller?.name) return jsonData.seller.name;
                if (jsonData.brand?.name) return jsonData.brand.name;
            } catch (e) {
                // Continue to next method
            }
        }
        
        return null;
    } catch (error) {
        console.log(`Error fetching seller from product page: ${error.message}`);
        return null;
    }
}

function extractSellerName(product) {
    // Check multiple possible locations for seller name in Jumia's data structure
    
    // Direct seller name fields
    if (product.sellerName) return product.sellerName;
    if (product.displaySellerName) return product.displaySellerName;
    
    // Seller object variations
    if (product.seller?.name) return product.seller.name;
    if (product.seller?.displayName) return product.seller.displayName;
    if (product.seller?.sellerName) return product.seller.sellerName;
    
    // Shop/Store variations
    if (product.shop?.name) return product.shop.name;
    if (product.shop?.displayName) return product.shop.displayName;
    if (product.shop?.shopName) return product.shop.shopName;
    
    // ShopGlobal variations
    if (product.shopGlobal?.name) return product.shopGlobal.name;
    if (product.shopGlobal?.displayName) return product.shopGlobal.displayName;
    
    // Store variations
    if (product.store?.name) return product.store.name;
    if (product.store?.displayName) return product.store.displayName;
    
    // Supplier/Vendor variations  
    if (product.supplier?.name) return product.supplier.name;
    if (product.vendor?.name) return product.vendor.name;
    
    // SellerInfo variations
    if (product.sellerInfo?.name) return product.sellerInfo.name;
    if (product.sellerInfo?.displayName) return product.sellerInfo.displayName;
    
    // Jumia sometimes uses 'displayName' at root level for sellers
    if (product.displayName && !product.name) return product.displayName;
    
    return null;
}

async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let index = 0;
    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (index < items.length) {
            const currentIndex = index;
            index += 1;
            results[currentIndex] = await worker(items[currentIndex], currentIndex);
        }
    });

    await Promise.all(runners);
    return results;
}
