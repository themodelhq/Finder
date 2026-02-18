class JumiaSKUFinder {
    constructor() {
        this.data = [];
        this.originalData = [];
        this.unsortedData = [];
        this.skus = [];
        this.currentPage = 1;
        this.maxPages = 1;
        this.valid = 0;
        this.oos = 0;
        this.currentMode = 'find';
        this.country = '.com.ng';
        this.domain = 'https://www.jumia' + this.country;
        this.lastFetchMeta = null;
        
        this.initElements();
        this.initListeners();
    }

    initElements() {
        // Mode controls
        this.modeToggle = document.getElementById('modeToggle');
        this.findControls = document.getElementById('findControls');
        this.previewControls = document.getElementById('previewControls');
        
        // Inputs
        this.countrySelect = document.getElementById('countrySelect');
        this.urlInput = document.getElementById('urlInput');
        this.pageInput = document.getElementById('pageInput');
        this.skuInputComma = document.getElementById('skuInputComma');
        this.skuInputNewline = document.getElementById('skuInputNewline');
        this.skuOutputComma = document.getElementById('skuOutputComma');
        this.skuOutputNewline = document.getElementById('skuOutputNewline');
        
        // Buttons
        this.findBtn = document.getElementById('findBtn');
        this.previewBtn = document.getElementById('previewBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.restoreBtn = document.getElementById('restoreBtn');
        this.exportBtn = document.getElementById('exportBtn');
        
        // Filters
        this.discountFilter = document.getElementById('discountFilter');
        this.ratingFilter = document.getElementById('ratingFilter');
        this.oosFilter = document.getElementById('oosFilter');
        this.categoryFilter = document.getElementById('categoryFilter');
        this.tagFilter = document.getElementById('tagFilter');
        this.expressFilter = document.getElementById('expressFilter');
        this.brandFilter = document.getElementById('brandFilter');
        this.sellerFilter = document.getElementById('sellerFilter');
        this.sortFilter = document.getElementById('sortFilter');
        this.oosFilterGroup = document.getElementById('oosFilterGroup');
        
        // Stats
        this.statLabel1 = document.getElementById('statLabel1');
        this.statLabel2 = document.getElementById('statLabel2');
        this.statValue1 = document.getElementById('statValue1');
        this.statValue2 = document.getElementById('statValue2');
        this.statValue3 = document.getElementById('statValue3');
        
        // Products
        this.productsGrid = document.getElementById('productsGrid');
        this.productCount = document.getElementById('productCount');
        
        // Loading
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingMessage = document.getElementById('loadingMessage');
        
        // Export
        this.exportTableSection = document.getElementById('exportTableSection');
        this.exportTableHead = document.getElementById('exportTableHead');
        this.exportTableBody = document.getElementById('exportTableBody');
    }

    initListeners() {
        // Mode toggle
        this.modeToggle.addEventListener('change', () => this.toggleMode());
        
        // Country change
        this.countrySelect.addEventListener('change', () => this.changeCountry());
        
        // Find/Preview
        this.findBtn.addEventListener('click', () => this.findProducts());
        this.previewBtn.addEventListener('click', () => this.previewSKUs());
        
        // Actions
        this.shuffleBtn.addEventListener('click', () => this.shuffleProducts());
        this.restoreBtn.addEventListener('click', () => this.restoreProducts());
        this.exportBtn.addEventListener('click', () => this.handleExport());
        
        // Filters
        this.discountFilter.addEventListener('change', () => this.applyFilters());
        this.ratingFilter.addEventListener('change', () => this.applyFilters());
        this.oosFilter.addEventListener('change', () => this.applyFilters());
        this.categoryFilter.addEventListener('change', () => this.applyFilters());
        this.tagFilter.addEventListener('change', () => this.applyFilters());
        this.expressFilter.addEventListener('change', () => this.applyFilters());
        this.brandFilter.addEventListener('change', () => this.applyFilters());
        this.sellerFilter.addEventListener('change', () => this.applyFilters());
        this.sortFilter.addEventListener('change', () => this.sortProducts());
        
        // Textarea sync
        this.skuInputComma.addEventListener('input', () => this.syncTextareas('comma'));
        this.skuInputNewline.addEventListener('input', () => this.syncTextareas('newline'));
        
        // Copy buttons
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.currentTarget;
                this.copyToClipboard(button);
            });
        });
    }

    toggleMode() {
        this.currentMode = this.modeToggle.checked ? 'preview' : 'find';
        
        if (this.currentMode === 'find') {
            this.findControls.classList.remove('hidden');
            this.previewControls.classList.add('hidden');
            this.oosFilterGroup.classList.add('hidden');
            this.statLabel1.textContent = 'Page';
            this.statLabel2.textContent = 'Max Page';
        } else {
            this.findControls.classList.add('hidden');
            this.previewControls.classList.remove('hidden');
            this.oosFilterGroup.classList.remove('hidden');
            this.statLabel1.textContent = 'Valid';
            this.statLabel2.textContent = 'OOS';
        }
        
        this.resetData();
    }

    changeCountry() {
        this.country = this.countrySelect.value;
        this.domain = 'https://www.jumia' + this.country;
        this.resetData();
    }

    syncTextareas(source) {
        if (source === 'comma') {
            const values = this.skuInputComma.value;
            this.skuInputNewline.value = values.replace(/,/g, '\n');
        } else {
            const values = this.skuInputNewline.value;
            this.skuInputComma.value = values.replace(/\n/g, ',');
        }
    }

    async findProducts() {
        const url = this.urlInput.value.trim();
        const pages = parseInt(this.pageInput.value);
        
        if (!url || !this.isValidUrl(url)) {
            alert('Please enter a valid URL');
            return;
        }
        
        if (!pages || pages < 1) {
            alert('Please enter a valid number of pages');
            return;
        }
        
        this.resetData();
        this.maxPages = pages;
        this.currentPage = 1;
        
        this.showLoading('Finding products...');
        
        try {
            const firstPageUrl = this.buildPageUrl(url, 1);
            const firstPageProducts = await this.fetchProductsWithRetry(firstPageUrl);
            const seenSkus = new Set();
            this.data = (firstPageProducts || []).filter(product => {
                if (!product?.sku || seenSkus.has(product.sku)) return false;
                seenSkus.add(product.sku);
                return true;
            });

            if (this.data.length === 0 && !Number.isFinite(this.lastFetchMeta?.totalProducts)) {
                this.currentPage = 1;
                this.maxPages = 1;
                this.updateStats();
                this.updateSKUList();
                this.renderProducts();
                return;
            }

            const totalPages = this.resolveTotalPages(pages, this.lastFetchMeta);
            this.maxPages = totalPages;
            this.currentPage = 1;
            this.updateStats();
            this.updateLoadingMessage(`Fetched ${this.data.length} products (1/${totalPages} pages)...`);

            if (totalPages > 1) {
                let processedPages = 1;
                const pageUrls = Array.from({ length: totalPages - 1 }, (_, index) => {
                    const pageNumber = index + 2;
                    return { pageNumber, url: this.buildPageUrl(url, pageNumber) };
                });

                const pageCounts = new Map();
                await this.mapWithConcurrency(
                    pageUrls,
                    16,
                    async ({ pageNumber, url: pageUrl }) => {
                        const products = await this.fetchProductsWithRetry(pageUrl, 3);
                        if (products && products.length > 0) {
                            products.forEach(product => {
                                if (product?.sku && !seenSkus.has(product.sku)) {
                                    seenSkus.add(product.sku);
                                    this.data.push(product);
                                }
                            });
                        }
                        pageCounts.set(pageNumber, products?.length || 0);
                        processedPages += 1;
                        this.currentPage = processedPages;
                        this.updateStats();
                        this.updateLoadingMessage(`Fetched ${this.data.length} products (${processedPages}/${totalPages} pages)...`);
                    }
                );

                const expectedTotal = this.lastFetchMeta?.totalProducts;
                if (Number.isFinite(expectedTotal) && this.data.length < expectedTotal) {
                    const extraPages = [];
                    for (let pageNumber = totalPages + 1; pageNumber <= totalPages + 3; pageNumber += 1) {
                        extraPages.push({ pageNumber, url: this.buildPageUrl(url, pageNumber) });
                    }
                    const retryPages = pageUrls
                        .filter(({ pageNumber }) => (pageCounts.get(pageNumber) || 0) === 0)
                        .map(({ pageNumber, url: pageUrl }) => ({ pageNumber, url: pageUrl }));
                    if (retryPages.length > 0) {
                        await this.mapWithConcurrency(
                            retryPages,
                            8,
                            async ({ pageNumber, url: pageUrl }) => {
                                const products = await this.fetchProductsWithRetry(pageUrl, 4);
                                if (products && products.length > 0) {
                                    products.forEach(product => {
                                        if (product?.sku && !seenSkus.has(product.sku)) {
                                            seenSkus.add(product.sku);
                                            this.data.push(product);
                                        }
                                    });
                                    pageCounts.set(pageNumber, products.length);
                                }
                                this.updateLoadingMessage(`Fetched ${this.data.length} products (${processedPages}/${totalPages} pages)...`);
                            }
                        );
                    }
                    if (extraPages.length > 0 && this.data.length < expectedTotal) {
                        await this.mapWithConcurrency(
                            extraPages,
                            6,
                            async ({ pageNumber, url: pageUrl }) => {
                                const products = await this.fetchProductsWithRetry(pageUrl, 4);
                                if (products && products.length > 0) {
                                    products.forEach(product => {
                                        if (product?.sku && !seenSkus.has(product.sku)) {
                                            seenSkus.add(product.sku);
                                            this.data.push(product);
                                        }
                                    });
                                }
                                this.updateLoadingMessage(`Fetched ${this.data.length} products (${processedPages}/${totalPages} pages)...`);
                            }
                        );
                    }
                }
            }

            this.originalData = [...this.data];
            this.unsortedData = [...this.data];
            this.updateSKUList();
            this.renderProducts();
            this.ensureSellerNames(this.data).then(() => {
                this.renderProducts();
            }).catch((error) => {
                console.error('Seller enrichment failed:', error);
            });
        } catch (error) {
            console.error('Error finding products:', error);
            alert('Error finding products. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async previewSKUs() {
        const skuText = this.skuInputComma.value.trim();
        
        if (!skuText) {
            alert('Please paste SKUs in the textarea');
            return;
        }
        
        this.skus = skuText.split(',').map(s => s.trim()).filter(s => s);
        
        if (this.skus.length === 0) {
            alert('No valid SKUs found');
            return;
        }
        
        this.showLoading('Previewing SKUs...');
        this.valid = 0;
        this.oos = 0;
        
        try {
            let processed = 0;
            const results = await this.mapWithConcurrency(
                this.skus,
                20,
                async (sku) => {
                    processed += 1;
                    this.updateLoadingMessage(`Fetching SKU ${processed} of ${this.skus.length}...`);

                    try {
                        const url = `${this.domain}/catalog/?q=${sku}`;
                        const products = await this.fetchProductsWithRetry(url);

                        if (products && products.length > 0) {
                            this.valid++;
                            return products[0];
                        }
                        this.oos++;
                        return this.createOOSProduct(sku);
                    } catch (error) {
                        this.oos++;
                        return this.createOOSProduct(sku);
                    }
                }
            );

            this.data = results.filter(p => p);
            this.originalData = [...this.data];
            this.unsortedData = [...this.data];
            this.updateStats();
            this.renderProducts();
            this.ensureSellerNames(this.data).then(() => {
                this.renderProducts();
            }).catch((error) => {
                console.error('Seller enrichment failed:', error);
            });
            
        } catch (error) {
            console.error('Error previewing SKUs:', error);
            alert('Error previewing SKUs. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async fetchProducts(url) {
        // Try Vercel API first
        try {
            const response = await fetch('/api/fetch-products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });
            
            if (!response.ok) {
                throw new Error(`API failed with status: ${response.status}`);
            }
            
            const result = await response.json();
            this.lastFetchMeta = result.meta || null;
            
            if (result.products && result.products.length > 0) {
                return result.products;
            }
            
            console.log('API returned empty results, trying CORS proxy fallback...');
            throw new Error('Empty results from API');
            
        } catch (apiError) {
            console.error('Vercel API error:', apiError);
            
            // Fallback to CORS proxies
            const products = await this.fetchProductsWithCORS(url);
            if (products.length === 0) {
                return await this.fetchProductsWithCORS(url);
            }
            return products;
        }
    }

    async fetchProductsWithCORS(url) {
        const corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ];

        for (const proxy of corsProxies) {
            try {
                console.log(`Trying CORS proxy: ${proxy}`);
                const response = await fetch(proxy + encodeURIComponent(url));
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const html = await response.text();
                const meta = this.extractMetaFromHTML(html);
                if (meta) {
                    this.lastFetchMeta = this.mergeMeta(this.lastFetchMeta, meta);
                }
                const products = this.extractProductsFromHTML(html);
                
                if (products && products.length > 0) {
                    console.log(`Successfully fetched ${products.length} products via CORS proxy`);
                    return products;
                }
            } catch (error) {
                console.error(`CORS proxy ${proxy} failed:`, error);
                continue;
            }
        }

        console.error('All fetch methods failed');
        return [];
    }

    extractProductsFromHTML(html) {
        try {
            // Method 1: Try to find window.__STORE__ pattern
            const storeMatch = html.match(/window\.__STORE__\s*=\s*({[\s\S]*?});/);
            
            if (storeMatch) {
                try {
                    const storeData = JSON.parse(storeMatch[1]);
                    if (storeData.products && Array.isArray(storeData.products)) {
                        return this.formatProducts(storeData.products);
                    }
                } catch (e) {
                    console.log('Failed to parse __STORE__, trying alternative method');
                }
            }

            // Method 1b: Legacy Jumia pattern - extract the full "products" array directly
            const directProductsArray = this.extractArrayByKey(html, 'products');
            if (directProductsArray) {
                try {
                    const products = JSON.parse(directProductsArray);
                    if (Array.isArray(products) && products.length > 0) {
                        const formatted = this.formatProducts(products);
                        if (formatted.length > 0) {
                            return formatted;
                        }
                    }
                } catch (error) {
                    // Continue to script-based fallbacks
                }
            }

            // Method 2: Look for products in script tags with improved extraction
            const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
            let scriptMatch;
            
            while ((scriptMatch = scriptRegex.exec(html)) !== null) {
                const scriptContent = scriptMatch[1];
                
                // Skip if too short
                if (scriptContent.length < 100) continue;

                const preciseProductsArray = this.extractArrayByKey(scriptContent, 'products') || this.extractArrayByKey(scriptContent, 'items');
                if (preciseProductsArray) {
                    try {
                        const products = JSON.parse(preciseProductsArray);
                        if (Array.isArray(products) && products.length > 0 && (products[0].sku || products[0].name || products[0].id)) {
                            const formatted = this.formatProducts(products);
                            if (formatted.length > 0) {
                                return formatted;
                            }
                        }
                    } catch (error) {
                        // Continue to regex fallbacks
                    }
                }
                
                // Look for products array with better patterns
                const productsPatterns = [
                    /"products"\s*:\s*(\[[\s\S]*?\])\s*[,}\]]/,
                    /products\s*:\s*(\[[\s\S]*?\])\s*[,}\]]/,
                    /"items"\s*:\s*(\[[\s\S]*?\])\s*[,}\]]/,
                    /items\s*:\s*(\[[\s\S]*?\])\s*[,}\]]/
                ];
                
                for (const pattern of productsPatterns) {
                    const productsMatch = scriptContent.match(pattern);
                    
                    if (productsMatch) {
                        try {
                            const products = JSON.parse(productsMatch[1]);
                            
                            if (Array.isArray(products) && products.length > 0) {
                                // Validate it's product data
                                if (products[0].sku || products[0].name || products[0].id) {
                                    const formatted = this.formatProducts(products);
                                    if (formatted.length > 0) {
                                        return formatted;
                                    }
                                }
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                }

                // Method 2b: SvelteKit hydration payloads (kit.start(... { data: [...] }))
                const svelteProducts = this.extractProductsFromSveltePayload(scriptContent);
                if (svelteProducts.length > 0) {
                    return svelteProducts;
                }
            }

            // Method 3: Extract from data attributes in HTML
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
            return [];
        }
    }

    extractArrayByKey(content, key) {
        if (!content || !key) return null;
        const keyPattern = new RegExp(`"?${key}"?\\s*:`);
        const keyMatch = keyPattern.exec(content);
        if (!keyMatch) return null;

        const startSearchIndex = keyMatch.index + keyMatch[0].length;
        const arrayStart = content.indexOf('[', startSearchIndex);
        if (arrayStart === -1) return null;

        let depth = 0;
        let inString = false;
        let escaped = false;

        for (let i = arrayStart; i < content.length; i += 1) {
            const ch = content[i];

            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                escaped = true;
                continue;
            }
            if (ch === '"') {
                inString = !inString;
                continue;
            }
            if (inString) continue;

            if (ch === '[') depth += 1;
            if (ch === ']') {
                depth -= 1;
                if (depth === 0) {
                    return content.slice(arrayStart, i + 1);
                }
            }
        }

        return null;
    }

    formatProducts(products) {
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
                tags: product.tags || product.tag || product.labels || product.label || [],
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
                // Preserve all seller-related data
                seller: product.seller || null,
                shopGlobal: product.shopGlobal || null,
                shop: product.shop || null,
                sellerName: this.extractSellerName(product)
            }));
    }

    extractProductsFromSveltePayload(scriptContent) {
        const candidates = [];

        const kitStartMatch = scriptContent.match(/kit\.start\([^,]+,[^,]+,\s*(\{[\s\S]*?\})\s*\);?/);
        if (kitStartMatch?.[1]) {
            candidates.push(kitStartMatch[1]);
        }

        const dataBlockMatch = scriptContent.match(/data\s*:\s*(\[[\s\S]*?\])\s*,\s*form\s*:/);
        if (dataBlockMatch?.[1]) {
            candidates.push(`{"data":${dataBlockMatch[1]}}`);
        }

        for (const candidate of candidates) {
            try {
                const normalized = candidate
                    .replace(/([{,]\s*)([a-zA-Z_$][\w$]*)\s*:/g, '$1"$2":')
                    .replace(/'/g, '"');
                const parsed = JSON.parse(normalized);
                const discovered = this.findProductArrays(parsed);
                if (discovered.length > 0) {
                    return this.formatProducts(discovered);
                }
            } catch (error) {
                continue;
            }
        }

        return [];
    }

    findProductArrays(input) {
        if (!input || typeof input !== 'object') {
            return [];
        }

        const queue = [input];
        const seen = new Set();

        while (queue.length > 0) {
            const current = queue.shift();
            if (!current || typeof current !== 'object' || seen.has(current)) {
                continue;
            }
            seen.add(current);

            if (Array.isArray(current)) {
                if (current.length > 0 && current.every(item => item && typeof item === 'object' && item.sku)) {
                    return current;
                }
                current.forEach(item => queue.push(item));
            } else {
                Object.values(current).forEach(value => queue.push(value));
            }
        }

        return [];
    }

    extractSellerName(product) {
        // Check multiple possible locations for seller name
        if (product.sellerName) return product.sellerName;
        if (product.displaySellerName) return product.displaySellerName;
        if (product.seller?.name) return product.seller.name;
        if (product.seller?.displayName) return product.seller.displayName;
        if (product.seller?.sellerName) return product.seller.sellerName;
        if (product.shopGlobal?.name) return product.shopGlobal.name;
        if (product.shopGlobal?.displayName) return product.shopGlobal.displayName;
        if (product.shop?.name) return product.shop.name;
        if (product.shop?.displayName) return product.shop.displayName;
        if (product.shop?.shopName) return product.shop.shopName;
        if (product.store?.name) return product.store.name;
        if (product.store?.displayName) return product.store.displayName;
        if (product.supplier?.name) return product.supplier.name;
        if (product.vendor?.name) return product.vendor.name;
        if (product.sellerInfo?.name) return product.sellerInfo.name;
        if (product.sellerInfo?.displayName) return product.sellerInfo.displayName;
        return null;
    }

    async fetchSellerNameFromProductPage(productUrl) {
        try {
            // Construct full URL if relative path
            const fullUrl = productUrl.startsWith('http') ? productUrl : `${this.domain}${productUrl}`;
            
            let html = null;
            
            // Try Vercel API first
            try {
                const response = await fetch('/api/fetch-products', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ url: fullUrl })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    const apiProduct = result.products?.[0];
                    const apiSellerName = this.getSellerDisplayName(apiProduct);
                    if (apiSellerName) {
                        return apiSellerName;
                    }
                }
            } catch (apiError) {
                console.log('API not available for seller fetch, using CORS proxy...');
            }
            
            // Use CORS proxy to fetch the HTML
            const corsProxies = [
                'https://api.allorigins.win/raw?url=',
                'https://corsproxy.io/?',
                'https://api.codetabs.com/v1/proxy?quest='
            ];
            
            for (const proxy of corsProxies) {
                try {
                    const response = await fetch(proxy + encodeURIComponent(fullUrl));
                    
                    if (!response.ok) {
                        continue;
                    }
                    
                    html = await response.text();
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            if (!html) {
                console.log('Failed to fetch product page HTML');
                return null;
            }
            
            const storeSeller = this.extractSellerFromStore(html);
            if (storeSeller) {
                return storeSeller;
            }

            // Method 1: Extract from seller information section - most reliable
            // Pattern: <p class="-m -pbs">Seller Name</p> inside seller card
            const sellerCardMatch = html.match(/<a[^>]*href="[^"]*"[^>]*class="[^"]*-pas[^"]*-df[^"]*-i-ctr[^"]*-upp[^"]*"[^>]*>[\s\S]*?<h2[^>]*>Seller Information<\/h2>[\s\S]*?<\/a>[\s\S]*?<div[^>]*class="[^"]*-hr[^"]*-pas[^"]*"[^>]*>[\s\S]*?<p[^>]*class="[^"]*-m[^"]*-pbs[^"]*"[^>]*>(.*?)<\/p>/i);
            if (sellerCardMatch && sellerCardMatch[1]) {
                return sellerCardMatch[1].trim();
            }

            const sellerMetaMatch = html.match(/"seller"\s*:\s*\{[\s\S]*?"name"\s*:\s*"([^"]+)"/i);
            if (sellerMetaMatch && sellerMetaMatch[1]) {
                return sellerMetaMatch[1].trim();
            }

            const sellerByLabelMatch = html.match(/Seller(?:<\/[^>]+>|\s)*:?<\/[^>]*>\s*([^<]{2,})</i);
            if (sellerByLabelMatch && sellerByLabelMatch[1]) {
                return sellerByLabelMatch[1].trim();
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

    createOOSProduct(sku) {
        return {
            sku: sku,
            name: 'Out of Stock',
            brand: 'oos',
            sellerId: 0,
            isShopGlobal: true,
            isShopExpress: false,
            categories: 'out of stock',
            tags: [],
            prices: {
                rawPrice: '0',
                price: '₦ 0',
                oldPrice: '0',
                discount: '0'
            },
            stock: {
                percent: 0,
                text: '0 items left'
            },
            rating: {
                average: 0,
                totalRatings: 0
            },
            image: 'https://ng.jumia.is/cms/0-1-weekly-cps/onsite-report/floor-product-templatev2.jpg',
            url: '/catalog/?q=' + sku,
            isBuyable: false
        };
    }

    renderProducts() {
        this.productsGrid.innerHTML = '';
        
        if (this.data.length === 0) {
            this.productsGrid.innerHTML = '<p class="text-center">No products found</p>';
            this.productCount.textContent = '0';
            this.exportBtn.textContent = '📥 Download CSV';
            this.exportBtn.disabled = true;
            return;
        }
        
        this.data.forEach(product => {
            const card = this.createProductCard(product);
            this.productsGrid.appendChild(card);
        });
        
        this.productCount.textContent = this.data.length;
        this.buildCategoryFilter();
        this.buildTagFilter();
        this.buildBrandFilter();
        this.buildSellerFilter();
        this.exportBtn.textContent = '📥 Download CSV';
        this.exportBtn.disabled = false;
        this.lazyLoadImages();
    }

    buildCategoryFilter() {
        const categories = [...new Set(this.originalData.flatMap(p => this.extractValues(p.categories)).filter(Boolean))];
        categories.sort((a, b) => a.localeCompare(b));

        let options = '<option value="0">All Categories</option>';
        categories.forEach(category => {
            options += `<option value="${category}">${category}</option>`;
        });

        this.categoryFilter.innerHTML = options;
    }

    buildTagFilter() {
        const tags = [...new Set(this.originalData.flatMap(p => {
            const normalizedTags = this.extractValues(p.tags || p.tag || p.labels || p.label || p.badges);
            if (normalizedTags.length > 0) return normalizedTags;
            return this.extractValues(p.categories);
        }).filter(Boolean))];
        tags.sort((a, b) => a.localeCompare(b));

        let options = '<option value="0">All Tags</option>';
        tags.forEach(tag => {
            options += `<option value="${tag}">${tag}</option>`;
        });

        this.tagFilter.innerHTML = options;
    }

    buildBrandFilter() {
        const brands = [...new Set(this.originalData.map(p => p.brand).filter(b => b && b !== 'oos'))];
        brands.sort();
        
        let options = '<option value="0">All Brands</option>';
        brands.forEach(brand => {
            options += `<option value="${brand}">${brand}</option>`;
        });
        
        this.brandFilter.innerHTML = options;
    }

    buildSellerFilter() {
        const sellers = [...new Set(this.originalData.map(p => {
            return this.getSellerDisplayName(p) || 'Unknown';
        }).filter(s => s && s !== 'Unknown'))];
        sellers.sort();
        
        let options = '<option value="0">All Sellers</option>';
        sellers.forEach(seller => {
            options += `<option value="${seller}">${seller}</option>`;
        });
        
        this.sellerFilter.innerHTML = options;
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.sku = product.sku;
        
        const isOOS = product.brand === 'oos';
        const discount = product.prices?.discount ? parseInt(product.prices.discount) : 0;
        const rating = product.rating?.average || 0;
        // Check multiple sources for seller name
        const sellerName = this.getSellerDisplayName(product) || '';
        
        card.innerHTML = `
            <button class="product-close" data-sku="${product.sku}">×</button>
            
            <img src="${product.image}" alt="${product.name}" class="product-image lazy-image" loading="lazy">
            
            <div class="product-badges">
                ${discount > 0 ? `<span class="badge badge-discount">${discount}% OFF</span>` : ''}
                ${rating > 0 ? `<span class="badge badge-rating">⭐ ${rating}</span>` : ''}
                ${product.stock ? `<span class="badge badge-stock">${product.stock.text}</span>` : ''}
                ${isOOS ? `<span class="badge badge-oos">Out of Stock</span>` : ''}
            </div>
            
            <div class="product-name">${product.name}</div>
            
            ${sellerName ? `<div style="font-size: 12px; color: #718096; margin: 4px 0;">Seller: ${sellerName}</div>` : ''}
            
            <div class="product-price">${product.prices?.price || '₦ 0'}</div>
            ${product.prices?.oldPrice ? `<div class="product-old-price">${product.prices.oldPrice}</div>` : ''}
            
            <div class="product-sku">${product.sku}</div>
        `;
        
        // Add click handler for remove button
        const closeBtn = card.querySelector('.product-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeProduct(product.sku);
        });
        
        // Add click handler to open product
        card.addEventListener('click', () => {
            window.open(this.domain + product.url, '_blank');
        });
        
        return card;
    }

    removeProduct(sku) {
        this.data = this.data.filter(p => p.sku !== sku);
        this.originalData = this.originalData.filter(p => p.sku !== sku);
        this.updateSKUList();
        this.updateStats();
        this.renderProducts();
    }

    shuffleProducts() {
        this.data = this.data.sort(() => Math.random() - 0.5);
        this.updateSKUList();
        this.renderProducts();
    }

    restoreProducts() {
        this.data = [...this.originalData];
        this.resetFilters();
        this.updateSKUList();
        this.renderProducts();
    }

    applyFilters() {
        let filtered = [...this.originalData];
        
        // Discount filter
        const discountRange = this.discountFilter.value;
        if (discountRange !== '0') {
            const [min, max] = discountRange.split('-').map(Number);
            filtered = filtered.filter(p => {
                const discount = parseInt(p.prices?.discount || 0);
                return discount >= min && discount <= max;
            });
        }
        
        // Rating filter
        const ratingRange = this.ratingFilter.value;
        if (ratingRange !== '0') {
            const [min, max] = ratingRange.split('-').map(Number);
            filtered = filtered.filter(p => {
                const rating = parseFloat(p.rating?.average || 0);
                if (min === 0 && max === 0) {
                    return rating === 0;
                }
                return rating >= min && rating <= max;
            });
        }
        
        // OOS filter
        const oosValue = this.oosFilter.value;
        if (oosValue !== '0') {
            filtered = filtered.filter(p => {
                return oosValue === 'oos' ? p.brand === 'oos' : p.brand !== 'oos';
            });
        }

        // Category filter
        const categoryValue = this.categoryFilter.value;
        if (categoryValue !== '0') {
            filtered = filtered.filter(p => this.extractValues(p.categories).includes(categoryValue));
        }

        // Tag filter
        const tagValue = this.tagFilter.value;
        if (tagValue !== '0') {
            filtered = filtered.filter(p => {
                const tags = this.extractValues(p.tags || p.tag || p.labels || p.label || p.badges);
                if (tags.length > 0) {
                    return tags.includes(tagValue);
                }
                return this.extractValues(p.categories).includes(tagValue);
            });
        }

        // Jumia express filter
        const expressValue = this.expressFilter.value;
        if (expressValue !== '0') {
            filtered = filtered.filter(p => expressValue === 'express' ? !!p.isShopExpress : !p.isShopExpress);
        }
        
        // Brand filter
        const brandValue = this.brandFilter.value;
        if (brandValue !== '0') {
            filtered = filtered.filter(p => p.brand === brandValue);
        }
        
        // Seller filter
        const sellerValue = this.sellerFilter.value;
        if (sellerValue !== '0') {
            filtered = filtered.filter(p => {
                // Check multiple sources consistently
                const sellerName = this.getSellerDisplayName(p) || '';
                return sellerName === sellerValue;
            });
        }
        
        this.data = filtered;
        this.updateSKUList();
        this.renderProducts();
    }

    sortProducts() {
        const sortValue = this.sortFilter.value;
        
        if (sortValue === '0') {
            this.data = [...this.unsortedData];
        } else {
            this.data.sort((a, b) => {
                const priceA = this.extractPrice(a.prices?.price);
                const priceB = this.extractPrice(b.prices?.price);
                
                return sortValue === 'asc' ? priceA - priceB : priceB - priceA;
            });
        }
        
        this.renderProducts();
    }

    extractPrice(priceString) {
        if (!priceString) return 0;
        const match = priceString.match(/[\d,]+/);
        return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
    }

    async handleExport() {
        if (this.data.length === 0) {
            alert('No data to export');
            return;
        }
        this.buildExportTable();
        this.downloadCSV();
    }

    buildExportTable() {
        this.exportTableSection.classList.remove('hidden');
        
        // Build header
        const headers = ['SKU', 'Name', 'Brand', 'Category', 'Rating', 'Image', 'URL', 'Old Price', 'New Price', 'Stock', 'Seller Name'];
        this.exportTableHead.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
        
        // Build rows
        const rows = this.data.map(product => {
            const category = product.categories || 'N/A';
            const rating = product.rating?.average || 'N/A';
            const oldPrice = product.prices?.oldPrice || product.prices?.price || 'N/A';
            const newPrice = product.prices?.price || 'N/A';
            const stock = product.stock?.text || 'N/A';
            const url = this.domain + (product.url || '');
            const sellerName = this.getSellerDisplayName(product) || '';
            
            return `
                <tr>
                    <td>${product.sku}</td>
                    <td>${product.name}</td>
                    <td>${product.brand}</td>
                    <td>${category}</td>
                    <td>${rating}</td>
                    <td><img src="${product.image}" alt="product"></td>
                    <td><a href="${url}" target="_blank">${url}</a></td>
                    <td>${oldPrice}</td>
                    <td>${newPrice}</td>
                    <td>${stock}</td>
                    <td>${sellerName}</td>
                </tr>
            `;
        }).join('');
        
        this.exportTableBody.innerHTML = rows;
        
        // Scroll to table
        this.exportTableSection.scrollIntoView({ behavior: 'smooth' });
    }

    downloadCSV() {
        const headers = ['SKU', 'Name', 'Brand', 'Category', 'Rating', 'Image', 'URL', 'Old Price', 'New Price', 'Stock', 'Seller Name'];
        
        const rows = this.data.map(product => {
            const sellerName = this.getSellerDisplayName(product) || '';
            
            return [
                product.sku,
                product.name,
                product.brand,
                product.categories || 'N/A',
                product.rating?.average || 'N/A',
                product.image,
                this.domain + (product.url || ''),
                product.prices?.oldPrice || product.prices?.price || 'N/A',
                product.prices?.price || 'N/A',
                product.stock?.text || 'N/A',
                sellerName
            ].map(v => `"${v}"`).join(',');
        });
        
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `jumia-skus-${Date.now()}.csv`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    updateSKUList() {
        this.skus = this.data.map(p => p.sku);
        
        if (this.currentMode === 'find') {
            // Update find mode outputs
            if (this.skuOutputComma) {
                this.skuOutputComma.value = this.skus.join(',');
            }
            if (this.skuOutputNewline) {
                this.skuOutputNewline.value = this.skus.join('\n');
            }
        } else {
            // Update preview mode inputs
            if (this.skuInputComma) {
                this.skuInputComma.value = this.skus.join(',');
            }
            if (this.skuInputNewline) {
                this.skuInputNewline.value = this.skus.join('\n');
            }
        }
    }

    updateStats() {
        if (this.currentMode === 'find') {
            this.statValue1.textContent = this.currentPage;
            this.statValue2.textContent = this.maxPages;
        } else {
            this.statValue1.textContent = this.valid;
            this.statValue2.textContent = this.oos;
        }
        this.statValue3.textContent = this.data.length;
    }

    resetData() {
        this.data = [];
        this.originalData = [];
        this.unsortedData = [];
        this.skus = [];
        this.currentPage = 1;
        this.maxPages = 1;
        this.valid = 0;
        this.oos = 0;
        this.productsGrid.innerHTML = '';
        
        // Clear appropriate textareas based on mode
        if (this.currentMode === 'find') {
            if (this.skuOutputComma) this.skuOutputComma.value = '';
            if (this.skuOutputNewline) this.skuOutputNewline.value = '';
        } else {
            if (this.skuInputComma) this.skuInputComma.value = '';
            if (this.skuInputNewline) this.skuInputNewline.value = '';
        }
        
        this.exportTableSection.classList.add('hidden');
        this.exportBtn.textContent = '📥 Download CSV';
        this.exportBtn.disabled = true;
        this.updateStats();
    }

    resetFilters() {
        this.discountFilter.value = '0';
        this.ratingFilter.value = '0';
        this.oosFilter.value = '0';
        this.categoryFilter.value = '0';
        this.tagFilter.value = '0';
        this.expressFilter.value = '0';
        this.brandFilter.value = '0';
        this.sellerFilter.value = '0';
        this.sortFilter.value = '0';
    }

    extractValues(value) {
        if (!value) return [];
        if (Array.isArray(value)) {
            return value
                .map(v => (typeof v === 'string' ? v : v?.name || v?.label || v?.value || ''))
                .flatMap(v => this.extractValues(v));
        }

        return String(value)
            .split(/[|,>/]+/)
            .map(v => v.trim())
            .filter(Boolean);
    }

    copyToClipboard(button) {
        const targetId = button.dataset.target;
        const textarea = document.getElementById(targetId);
        
        textarea.select();
        document.execCommand('copy');
        
        button.classList.add('copied');
        button.innerHTML = '✓ Copied!';
        
        setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = '📋 Copy';
        }, 2000);
    }

    showLoading(message = 'Loading...') {
        this.loadingMessage.textContent = message;
        this.loadingOverlay.classList.remove('hidden');
    }

    updateLoadingMessage(message) {
        this.loadingMessage.textContent = message;
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    buildPageUrl(baseUrl, pageNumber) {
        const url = new URL(baseUrl);
        url.searchParams.set('page', pageNumber);
        return url.toString();
    }

    resolveTotalPages(requestedPages, meta) {
        const metaPages = meta?.totalPages;
        if (Number.isFinite(metaPages) && metaPages > 0) {
            return Math.max(requestedPages, metaPages);
        }
        const totalProducts = meta?.totalProducts;
        const pageSize = meta?.pageSize;
        if (Number.isFinite(totalProducts) && Number.isFinite(pageSize) && pageSize > 0) {
            const calculated = Math.ceil(totalProducts / pageSize);
            return Math.max(requestedPages, calculated);
        }
        return requestedPages;
    }

    extractMetaFromHTML(html) {
        if (!html) return null;
        const meta = {};
        const totalProductsMatch = html.match(/"totalProducts"\s*:\s*(\d+)/i);
        if (totalProductsMatch) {
            meta.totalProducts = parseInt(totalProductsMatch[1], 10);
        }
        const totalPagesMatch = html.match(/"totalPages"\s*:\s*(\d+)/i);
        if (totalPagesMatch) {
            meta.totalPages = parseInt(totalPagesMatch[1], 10);
        }
        const pageSizeMatch = html.match(/"pageSize"\s*:\s*(\d+)/i);
        if (pageSizeMatch) {
            meta.pageSize = parseInt(pageSizeMatch[1], 10);
        }
        const pageMatch = html.match(/"page"\s*:\s*(\d+)/i);
        if (pageMatch) {
            meta.page = parseInt(pageMatch[1], 10);
        }
        return Object.keys(meta).length ? meta : null;
    }

    mergeMeta(existing, incoming) {
        if (!incoming) return existing;
        if (!existing) return incoming;
        return {
            totalProducts: Math.max(existing.totalProducts || 0, incoming.totalProducts || 0) || undefined,
            totalPages: Math.max(existing.totalPages || 0, incoming.totalPages || 0) || undefined,
            pageSize: incoming.pageSize || existing.pageSize,
            page: incoming.page || existing.page
        };
    }

    async fetchProductsWithRetry(url, attempts = 4) {
        let lastError = null;
        for (let attempt = 0; attempt < attempts; attempt += 1) {
            try {
                const products = await this.fetchProducts(url);
                if (products && products.length > 0) {
                    return products;
                }
            } catch (error) {
                lastError = error;
            }
        }
        if (lastError) {
            console.error('Fetch products failed after retries:', lastError);
        }
        return [];
    }

    lazyLoadImages() {
        const images = this.productsGrid.querySelectorAll('.lazy-image');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.src;
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => imageObserver.observe(img));
        }
    }

    async ensureSellerNames(products) {
        if (!products || products.length === 0) return;

        const missing = [];
        await this.mapWithConcurrency(
            products,
            16,
            async (product) => {
                const currentSellerName = this.getSellerDisplayName(product);
                const isInvalid = !currentSellerName || currentSellerName === 'N/A' || currentSellerName === product.brand;

                if (isInvalid) {
                    const lookupUrl = product.url || `/catalog/?q=${product.sku}`;
                    let sellerName = await this.fetchSellerNameFromProductPage(lookupUrl);
                    if (!sellerName && product.sku && lookupUrl !== `/catalog/?q=${product.sku}`) {
                        sellerName = await this.fetchSellerNameFromProductPage(`/catalog/?q=${product.sku}`);
                    }
                    if (sellerName) {
                        product.sellerName = sellerName;
                    } else {
                        missing.push(product);
                    }
                } else if (currentSellerName && !product.sellerName) {
                    product.sellerName = currentSellerName;
                }
            }
        );

        if (missing.length > 0) {
            await this.mapWithConcurrency(
                missing,
                10,
                async (product) => {
                    const lookupUrl = product.url || `/catalog/?q=${product.sku}`;
                    let sellerName = await this.fetchSellerNameFromProductPage(lookupUrl);
                    if (!sellerName && product.sku && lookupUrl !== `/catalog/?q=${product.sku}`) {
                        sellerName = await this.fetchSellerNameFromProductPage(`/catalog/?q=${product.sku}`);
                    }
                    if (!sellerName && product.sku) {
                        const catalogResults = await this.fetchProductsWithRetry(`${this.domain}/catalog/?q=${product.sku}`, 3);
                        sellerName = this.getSellerDisplayName(catalogResults?.[0]) || sellerName;
                    }
                    if (sellerName) {
                        product.sellerName = sellerName;
                    }
                }
            );
        }
    }

    async mapWithConcurrency(items, limit, worker) {
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

    getSellerDisplayName(product) {
        if (!product) return null;
        return product.sellerName ||
            product.displaySellerName ||
            product.seller?.name ||
            product.seller?.displayName ||
            product.seller?.sellerName ||
            product.shopGlobal?.name ||
            product.shopGlobal?.displayName ||
            product.shop?.name ||
            product.shop?.displayName ||
            product.shop?.shopName ||
            product.store?.name ||
            product.store?.displayName ||
            product.supplier?.name ||
            product.vendor?.name ||
            product.sellerInfo?.name ||
            product.sellerInfo?.displayName ||
            null;
    }

    extractSellerFromStore(html) {
        const storeMatch = html.match(/window\.__STORE__\s*=\s*({[\s\S]*?});/);
        if (!storeMatch) return null;
        try {
            const storeData = JSON.parse(storeMatch[1]);
            const queue = [storeData];
            const seen = new Set();
            while (queue.length > 0) {
                const current = queue.shift();
                if (!current || typeof current !== 'object') continue;
                if (seen.has(current)) continue;
                seen.add(current);
                const sellerName = this.extractSellerName(current);
                if (sellerName) return sellerName;
                for (const value of Object.values(current)) {
                    if (value && typeof value === 'object') {
                        queue.push(value);
                    }
                }
            }
        } catch (error) {
            return null;
        }
        return null;
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new JumiaSKUFinder();
});
