# Bhavna Jewellers - GitHub Pages E-commerce

This project is a static e-commerce product catalogue built with HTML5, CSS3, Bootstrap, and Vanilla JS, designed to be hosted entirely on **GitHub Pages**.

It features a completely secure, serverless Admin panel (`admin.html`) that uses the GitHub REST API to modify the `data/products.json` file and upload images directly to the repository.

## Architecture & Security

To satisfy the requirement of not exposing GitHub credentials to website visitors, we use the **Local Token Approach** for the Admin interface:

1. **No Hardcoded Tokens:** The GitHub Personal Access Token (PAT) is *never* stored in the HTML, JS, or JSON files.
2. **Local Storage:** The Admin (you) enters the PAT in the login form on `admin.html`. This token is saved only in your browser's local storage (`localStorage`).
3. **Direct API Calls:** `admin.js` uses your local token to make direct, authenticated requests to the `api.github.com` endpoints.
4. **Public Visitors:** Regular visitors viewing the site only download the public HTML/JS/CSS and `products.json`. They have absolutely no access to your GitHub Token.

This is the simplest and most secure solution because it completely eliminates the need for an external backend or serverless functions (like PHP or Node.js), keeping the project 100% compatible with free GitHub Pages hosting.

## File Structure

- `index.html`: The public storefront. Loads products dynamically.
- `product.html`: The product details page (e.g., `product.html?product=gold-necklace`).
- `admin.html`: The secure admin dashboard. Requires your GitHub login details.
- `css/style.css`: Premium, modern UI styling.
- `js/app.js`: Logic for loading and filtering products on the public site.
- `js/admin.js`: Handles GitHub authentication, data manipulation, and direct API commits.
- `data/products.json`: The database. Modified by the admin dashboard, read by the public site.

## How to Configure GitHub

1. **Create a Repository:** Push this entire code structure to a new public GitHub repository.
2. **Enable GitHub Pages:**
   - Go to your repository **Settings** > **Pages**.
   - Under **Build and deployment**, set the Source to **Deploy from a branch**.
   - Select your main branch (e.g., `main` or `master`) and save.
   - GitHub will give you a live URL (e.g., `https://yourusername.github.io/your-repo-name/`).
3. **Create a Personal Access Token (PAT):**
   - Go to your GitHub account **Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)**.
   - Click **Generate new token (classic)**.
   - Give it a name like "Ecom Admin Token".
   - **Important:** Check the `repo` scope (this allows it to update files and upload images).
   - Generate the token and **copy it immediately** (you won't see it again).

## How to Use the Admin Interface

1. Go to your live admin page (e.g., `https://yourusername.github.io/your-repo-name/admin.html`).
2. Enter your GitHub Username, Repository Name, Branch (`main`), and your new **Personal Access Token**.
3. Click **Connect to Repository**.

### Testing Operations

- **Add Product:** Click "Add New Product". Fill in details, select images from your computer, and save. The images will be automatically uploaded to `images/products/ID/` and `products.json` will be updated.
- **Edit Product:** Click the edit icon next to a product. Modify text, upload additional images, or change the default image.
- **Enable/Disable:** In the edit modal, toggle the "Product Enabled" switch. Disabled products will instantly disappear from the public storefront.
- **Delete Product:** Click the trash icon. This will remove the product from `products.json` so it no longer appears publicly.

## SEO Note
The new HTML files include semantic tags, Open Graph placeholders, and structured layout. You can drop in your existing `robots.txt` and `sitemap.xml` directly into the root folder.
