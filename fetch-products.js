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
        // Find the script tag containing products data
        const scriptMatch = html.match(/<script[^>]*>[\s\S]*?window\.__STORE__\s*=\s*({[\s\S]*?});[\s\S]*?<\/script>/);
        
        if (!scriptMatch) {
            return [];
        }

        const storeData = scriptMatch[1];
        
        // Extract products array from the store data
        const productsMatch = storeData.match(/"products"\s*:\s*(\[[\s\S]*?\])/);
        
        if (!productsMatch) {
            return [];
        }

        // Clean up the JSON string
        let productsJson = productsMatch[0];
        
        // Find the end of the products array
        let braceCount = 0;
        let inArray = false;
        let endIndex = 0;
        
        for (let i = 0; i < productsJson.length; i++) {
            const char = productsJson[i];
            
            if (char === '[') {
                inArray = true;
                braceCount++;
            } else if (char === ']') {
                braceCount--;
                if (braceCount === 0 && inArray) {
                    endIndex = i + 1;
                    break;
                }
            } else if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
            }
        }
        
        if (endIndex > 0) {
            productsJson = productsJson.substring(0, endIndex);
        }
        
        // Wrap in braces to make valid JSON
        const jsonStr = '{' + productsJson + '}';
        
        try {
            const parsed = JSON.parse(jsonStr);
            const products = parsed.products || [];
            
            // Filter and format products
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
                    isBuyable: product.isBuyable !== false
                }));
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return [];
        }

    } catch (error) {
        console.error('Extract products error:', error);
        return [];
    }
}
