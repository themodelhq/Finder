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
            for (let i = 1; i <= pages; i++) {
                this.currentPage = i;
                const pageUrl = url + (url.includes('?') ? '&' : '?') + 'page=' + i;
                
                this.updateLoadingMessage(`Fetching page ${i} of ${pages}...`);
                
                const products = await this.fetchProducts(pageUrl);
                
                if (products && products.length > 0) {
                    this.data = [...this.data, ...products];
                    this.updateStats();
                }
            }
            
            this.originalData = [...this.data];
            this.unsortedData = [...this.data];
            this.updateSKUList();
            this.renderProducts();
            
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
            const results = await Promise.all(
                this.skus.map(async (sku, index) => {
                    this.updateLoadingMessage(`Fetching SKU ${index + 1} of ${this.skus.length}...`);
                    
                    try {
                        const url = `${this.domain}/catalog/?q=${sku}`;
                        const products = await this.fetchProducts(url);
                        
                        if (products && products.length > 0) {
                            this.valid++;
                            return products[0];
                        } else {
                            this.oos++;
                            return this.createOOSProduct(sku);
                        }
                    } catch (error) {
                        this.oos++;
                        return this.createOOSProduct(sku);
                    }
                })
            );
            
            this.data = results.filter(p => p);
            this.originalData = [...this.data];
            this.unsortedData = [...this.data];
            this.updateStats();
            this.renderProducts();
            
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
            
            if (result.products && result.products.length > 0) {
                return result.products;
            }
            
            console.log('API returned empty results, trying CORS proxy fallback...');
            throw new Error('Empty results from API');
            
        } catch (apiError) {
            console.error('Vercel API error:', apiError);
            
            // Fallback to CORS proxies
            return await this.fetchProductsWithCORS(url);
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

            // Method 2: Look for products in script tags with improved extraction
            const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
            let scriptMatch;
            
            while ((scriptMatch = scriptRegex.exec(html)) !== null) {
                const scriptContent = scriptMatch[1];
                
                // Skip if too short
                if (scriptContent.length < 100) continue;
                
                // Look for products array with better patterns
                const productsPatterns = [
                    /"products"\s*:\s*(\[[^\]]*?\{[\s\S]*?\}\])/,
                    /products\s*:\s*(\[[^\]]*?\{[\s\S]*?\}\])/,
                    /"items"\s*:\s*(\[[^\]]*?\{[\s\S]*?\}\])/
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
            }

            return [];

        } catch (error) {
            console.error('Extract products error:', error);
            return [];
        }
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

    extractSellerName(product) {
        // Check multiple possible locations for seller name
        if (product.sellerName) return product.sellerName;
        if (product.seller?.name) return product.seller.name;
        if (product.seller?.displayName) return product.seller.displayName;
        if (product.shopGlobal?.name) return product.shopGlobal.name;
        if (product.shopGlobal?.displayName) return product.shopGlobal.displayName;
        if (product.shop?.name) return product.shop.name;
        if (product.shop?.displayName) return product.shop.displayName;
        if (product.brand) return product.brand; // Fallback to brand as seller
        return null;
    }

    async fetchSellerNameFromProductPage(productUrl) {
        try {
            // Construct full URL if relative path
            const fullUrl = productUrl.startsWith('http') ? productUrl : `${this.domain}${productUrl}`;
            
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

    createOOSProduct(sku) {
        return {
            sku: sku,
            name: 'Out of Stock',
            brand: 'oos',
            sellerId: 0,
            isShopGlobal: true,
            categories: 'out of stock',
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
            return;
        }
        
        this.data.forEach(product => {
            const card = this.createProductCard(product);
            this.productsGrid.appendChild(card);
        });
        
        this.productCount.textContent = this.data.length;
        this.buildBrandFilter();
        this.buildSellerFilter();
        this.lazyLoadImages();
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
            // Try multiple sources for seller name
            return p.sellerName || 
                   p.seller?.name || 
                   p.seller?.displayName || 
                   p.shopGlobal?.name || 
                   p.shopGlobal?.displayName ||
                   p.shop?.name ||
                   p.shop?.displayName ||
                   p.brand ||
                   'Unknown';
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
        const sellerName = product.sellerName || 
                          product.seller?.name || 
                          product.seller?.displayName ||
                          product.shopGlobal?.name || 
                          product.shopGlobal?.displayName ||
                          product.shop?.name ||
                          product.shop?.displayName ||
                          '';
        
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
                const sellerName = p.sellerName || 
                                  p.seller?.name || 
                                  p.seller?.displayName ||
                                  p.shopGlobal?.name || 
                                  p.shopGlobal?.displayName ||
                                  p.shop?.name ||
                                  p.shop?.displayName ||
                                  p.brand ||
                                  '';
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
        const btnText = this.exportBtn.textContent.trim();
        
        if (btnText.includes('Fetch')) {
            await this.fetchExportData();
        } else if (btnText.includes('Download')) {
            this.downloadCSV();
        }
    }

    async fetchExportData() {
        if (this.data.length === 0) {
            alert('No data to fetch');
            return;
        }
        
        this.exportBtn.textContent = '⏳ Fetching...';
        this.exportBtn.disabled = true;
        
        try {
            // Fetch seller names for all products
            const totalProducts = this.data.length;
            let processedCount = 0;
            
            for (let i = 0; i < this.data.length; i++) {
                const product = this.data[i];
                processedCount++;
                
                // Update loading message with progress
                this.updateLoadingMessage(`Fetching seller data... ${processedCount}/${totalProducts}`);
                
                // Only fetch if seller name is not already available
                if (!product.sellerName || product.sellerName === 'N/A') {
                    const sellerName = await this.fetchSellerNameFromProductPage(product.url);
                    if (sellerName) {
                        this.data[i].sellerName = sellerName;
                    } else {
                        // Fallback to existing data
                        this.data[i].sellerName = product.shopGlobal?.name || product.brand || 'N/A';
                    }
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            this.buildExportTable();
            this.exportBtn.textContent = '📥 Download CSV';
            this.exportBtn.disabled = false;
        } catch (error) {
            console.error('Export error:', error);
            this.exportBtn.textContent = '📥 Fetch Data';
            this.exportBtn.disabled = false;
        }
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
            const sellerName = product.sellerName || product.shopGlobal?.name || product.brand || 'N/A';
            
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
            const sellerName = product.sellerName || product.shopGlobal?.name || product.brand || 'N/A';
            
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
        this.exportBtn.textContent = '📥 Fetch Data';
        this.updateStats();
    }

    resetFilters() {
        this.discountFilter.value = '0';
        this.ratingFilter.value = '0';
        this.oosFilter.value = '0';
        this.brandFilter.value = '0';
        this.sellerFilter.value = '0';
        this.sortFilter.value = '0';
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
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new JumiaSKUFinder();
});
