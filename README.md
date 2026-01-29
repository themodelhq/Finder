# Jumia SKU Finder - Modern Edition 🛍️

A modern, beautiful web application for finding and managing Jumia product SKUs across African markets. Built with vanilla JavaScript and deployed on Vercel with serverless functions to bypass CORS restrictions.

## ✨ Features

- **Dual Mode Operation**
  - **Find Mode**: Scrape products from Jumia campaign pages
  - **Preview Mode**: Load specific products by SKU

- **Multi-Country Support**
  - Nigeria, Egypt, Senegal, Tunisia, Uganda, Morocco, Kenya, Ghana, Ivory Coast, Algeria, South Africa

- **Advanced Filtering**
  - Filter by discount percentage
  - Filter by product rating
  - Filter by stock availability
  - Filter by brand
  - Filter by seller
  - Sort by price (ascending/descending)

- **Product Management**
  - View product details
  - Remove unwanted products
  - Shuffle products randomly
  - Restore original dataset

- **Export Capabilities**
  - Export to CSV format
  - View detailed product information in table format
  - Copy SKU lists in multiple formats

- **Modern UI**
  - Clean, responsive design
  - Gradient headers and cards
  - Smooth animations and transitions
  - Mobile-friendly interface
  - Loading states and indicators

## 🚀 Deployment to Vercel

### Prerequisites
- A [Vercel account](https://vercel.com/signup) (free)
- Git installed on your computer
- Basic command line knowledge

### Step 1: Prepare Your Repository

1. Create a new GitHub repository
2. Clone this project to your local machine
3. Push the code to your GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Step 2: Deploy on Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the configuration from `vercel.json`
5. Click "Deploy"
6. Wait for deployment to complete (usually 1-2 minutes)
7. Your app will be live at `your-project-name.vercel.app`

#### Option B: Using Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

4. Follow the prompts to link your project

## 🏗️ Project Structure

```
jumia-sku-finder/
├── index.html          # Main HTML file with modern UI
├── app.js              # JavaScript application logic
├── api/
│   └── fetch-products.js  # Serverless function to fetch products
├── vercel.json         # Vercel configuration
├── package.json        # Dependencies
└── README.md          # This file
```

## 💻 Local Development

To run the project locally with serverless functions:

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

## 🎯 How to Use

### Find Mode
1. Select your country market from the dropdown
2. Paste a Jumia campaign URL (e.g., `https://jumia.com.ng/mlp-payday-deals`)
3. Enter the number of pages to scrape
4. Click "Find Products"
5. Wait for products to load
6. Use filters and sorting options as needed

### Preview Mode
1. Toggle to "Preview" mode
2. Paste SKUs in either format:
   - Comma-separated: `SKU1,SKU2,SKU3`
   - Line-separated: One SKU per line
3. Click "Preview SKUs"
4. View and manage the loaded products

### Filtering & Sorting
- **Discount Filter**: Show only products with specific discount ranges
- **Rating Filter**: Filter by customer ratings
- **Availability**: Show only in-stock or out-of-stock products
- **Sort**: Order products by price
- **Shuffle**: Randomize product order
- **Restore**: Reset to original dataset

### Exporting Data
1. Click "Fetch Data" to prepare export
2. Review the data table
3. Click "Download CSV" to export

## 🔧 Technical Details

### CORS Solution
The original code used a CORS proxy which wouldn't work reliably on Vercel. This version:
- Uses Vercel serverless functions (`/api/fetch-products.js`)
- Makes requests server-side to bypass CORS
- Properly extracts and parses product data from Jumia pages
- Returns clean JSON to the frontend

### Key Improvements
- ✅ No CORS proxy dependency
- ✅ Modern, responsive UI design
- ✅ Serverless architecture
- ✅ Better error handling
- ✅ Improved loading states
- ✅ Cleaner code structure
- ✅ Mobile-optimized
- ✅ Fast deployment on Vercel

## 🎨 UI Features

- **Gradient Headers**: Eye-catching color gradients
- **Card-Based Layout**: Clean product cards with hover effects
- **Responsive Grid**: Adapts to all screen sizes
- **Smooth Animations**: Transitions and loading states
- **Color-Coded Badges**: Easy identification of discounts, ratings, and stock
- **Interactive Elements**: Buttons with feedback and hover states

## 🐛 Troubleshooting

### Products Not Loading
- Check if the URL is valid and accessible
- Verify the country market matches the URL
- Try with a smaller number of pages first

### Serverless Function Errors
- Check Vercel deployment logs
- Ensure the URL format is correct
- Verify network connectivity

### Local Development Issues
- Run `npm install` to ensure dependencies are installed
- Use `npm run dev` instead of opening the HTML directly
- Check browser console for errors

## 📝 Notes

- The app scrapes public Jumia product pages
- Respect Jumia's terms of service and rate limits
- For production use, consider implementing rate limiting
- Cache frequently accessed data to improve performance

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Credits

Based on the original Jumia SKU Finder tool, modernized with:
- New Age UI design
- Serverless architecture
- Improved user experience
- Better code organization

---

**Deployed on Vercel** ⚡️
