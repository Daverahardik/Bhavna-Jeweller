const GITHUB_API = 'https://api.github.com/repos';
let ghOwner = '';
let ghRepo = '';
let ghBranch = '';
let ghToken = '';

let productsData = { products: [] };
let productsFileSha = '';

// DOM Elements
const loginForm = document.getElementById('login-form');
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const logoutBtn = document.getElementById('logout-btn');
const loader = document.getElementById('loader');

document.addEventListener('DOMContentLoaded', () => {
    // Check if logged in
    ghOwner = localStorage.getItem('gh_owner');
    ghRepo = localStorage.getItem('gh_repo');
    ghBranch = localStorage.getItem('gh_branch') || 'main';
    ghToken = localStorage.getItem('gh_token');

    if (ghOwner && ghRepo && ghToken) {
        showDashboard();
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        ghOwner = document.getElementById('gh-owner').value.trim();
        ghRepo = document.getElementById('gh-repo').value.trim();
        ghBranch = document.getElementById('gh-branch').value.trim();
        ghToken = document.getElementById('gh-token').value.trim();

        localStorage.setItem('gh_owner', ghOwner);
        localStorage.setItem('gh_repo', ghRepo);
        localStorage.setItem('gh_branch', ghBranch);
        localStorage.setItem('gh_token', ghToken);
        
        showDashboard();
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        location.reload();
    });

    document.getElementById('btn-save-product').addEventListener('click', saveProduct);
    document.getElementById('add-spec-btn').addEventListener('click', addSpecRow);
    
    // Config form logic
    document.getElementById('config-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!productsData.config) {
            productsData.config = {};
        }
        productsData.config.whatsappNumber = document.getElementById('config-whatsapp').value.trim();
        
        showLoader();
        try {
            await updateProductsJson();
            showMessage('Configuration saved successfully!', 'success');
        } catch(error) {
            showMessage('Error saving config: ' + error.message, 'danger');
        } finally {
            hideLoader();
        }
    });
    
    // Auto-generate slug from name
    document.getElementById('p-name').addEventListener('input', function() {
        if (!document.getElementById('form-is-edit').value || document.getElementById('form-is-edit').value === 'false') {
            document.getElementById('p-slug').value = this.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }
    });
});

async function apiRequest(endpoint, options = {}) {
    const url = `${GITHUB_API}/${ghOwner}/${ghRepo}${endpoint}`;
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${ghToken}`,
        'Content-Type': 'application/json'
    };

    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401 || response.status === 404) {
        throw new Error(`Authentication failed or repository not found. Status: ${response.status}`);
    }
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API request failed');
    }
    
    return await response.json();
}

function showLoader() { loader.classList.remove('d-none'); }
function hideLoader() { loader.classList.add('d-none'); }
function showMessage(msg, type = 'info') {
    const el = document.getElementById('status-message');
    el.className = `alert alert-${type}`;
    el.textContent = msg;
    el.classList.remove('d-none');
    setTimeout(() => el.classList.add('d-none'), 5000);
}

async function showDashboard() {
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    logoutBtn.style.display = 'block';
    await fetchProductsFile();
}

async function fetchProductsFile() {
    showLoader();
    try {
        const response = await apiRequest(`/contents/data/products.json?ref=${ghBranch}`);
        productsFileSha = response.sha;
        
        // Decode base64 content correctly supporting utf-8
        const contentStr = decodeURIComponent(escape(window.atob(response.content)));
        productsData = JSON.parse(contentStr);
        
        if (productsData.config && productsData.config.whatsappNumber) {
            document.getElementById('config-whatsapp').value = productsData.config.whatsappNumber;
        } else {
            document.getElementById('config-whatsapp').value = "+919106770262";
        }
        
        renderProductsTable();
    } catch (error) {
        console.error(error);
        if (error.message.includes('Authentication failed')) {
            alert('GitHub Authentication failed. Please check your credentials.');
            localStorage.clear();
            location.reload();
        } else if (error.message.includes('Not Found')) {
            showMessage('data/products.json not found in the repository. Please ensure the repository is correct.', 'warning');
        } else {
            showMessage('Error fetching data: ' + error.message, 'danger');
        }
    } finally {
        hideLoader();
    }
}

function renderProductsTable() {
    const tbody = document.getElementById('admin-product-list');
    tbody.innerHTML = '';
    
    productsData.products.forEach((p, index) => {
        const image = p.defaultImage || (p.images && p.images.length > 0 ? p.images[0] : 'https://via.placeholder.com/50');
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${image}" width="50" height="50" style="object-fit:cover; border-radius:4px;"></td>
            <td><strong>${p.id}</strong></td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>₹${p.price}</td>
            <td>
                <span class="badge bg-${p.enabled !== false ? 'success' : 'secondary'}">
                    ${p.enabled !== false ? 'Active' : 'Disabled'}
                </span>
            </td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditModal(${index})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${index})"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openEditModal(index) {
    const product = productsData.products[index];
    
    document.getElementById('form-is-edit').value = 'true';
    document.getElementById('form-original-id').value = product.id;
    
    document.getElementById('p-id').value = product.id;
    document.getElementById('p-id').readOnly = true; // Cannot edit ID
    document.getElementById('p-name').value = product.name;
    document.getElementById('p-slug').value = product.slug;
    document.getElementById('p-price').value = product.price;
    document.getElementById('p-category').value = product.category;
    document.getElementById('p-shortDesc').value = product.shortDescription;
    document.getElementById('p-desc').value = product.description;
    document.getElementById('p-enabled').checked = product.enabled !== false;
    
    // Specs
    const specsContainer = document.getElementById('specs-container');
    specsContainer.innerHTML = '';
    if (product.details) {
        for (const [key, value] of Object.entries(product.details)) {
            addSpecRow(key, value);
        }
    }
    
    // Images
    const currentImagesList = document.getElementById('current-images-list');
    const defaultImageSelect = document.getElementById('p-default-image');
    
    currentImagesList.innerHTML = '';
    defaultImageSelect.innerHTML = '';
    
    if (product.images) {
        product.images.forEach((img, i) => {
            currentImagesList.innerHTML += `<div class="list-group-item py-1">${img}</div>`;
            const opt = new Option(img, img);
            if (img === product.defaultImage) opt.selected = true;
            defaultImageSelect.add(opt);
        });
    }
    
    // Show modal
    new bootstrap.Modal(document.getElementById('productModal')).show();
}

// Reset form when modal is closed
document.getElementById('productModal').addEventListener('hidden.bs.modal', function () {
    document.getElementById('product-form').reset();
    document.getElementById('form-is-edit').value = 'false';
    document.getElementById('form-original-id').value = '';
    document.getElementById('p-id').readOnly = false;
    document.getElementById('specs-container').innerHTML = '';
    document.getElementById('current-images-list').innerHTML = '';
    document.getElementById('p-default-image').innerHTML = '';
});

function addSpecRow(key = '', value = '') {
    const container = document.getElementById('specs-container');
    const row = document.createElement('div');
    row.className = 'row mb-2 spec-row';
    row.innerHTML = `
        <div class="col-5">
            <input type="text" class="form-control form-control-sm spec-key" placeholder="Key (e.g. Color)" value="${key}">
        </div>
        <div class="col-6">
            <input type="text" class="form-control form-control-sm spec-val" placeholder="Value (e.g. Gold)" value="${value}">
        </div>
        <div class="col-1">
            <button type="button" class="btn btn-sm btn-outline-danger w-100" onclick="this.parentElement.parentElement.remove()">X</button>
        </div>
    `;
    container.appendChild(row);
}

// Helper to read file as Base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // result is like "data:image/jpeg;base64,....."
            // we only want the base64 string part
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

async function saveProduct() {
    if (!document.getElementById('product-form').checkValidity()) {
        document.getElementById('product-form').reportValidity();
        return;
    }
    
    const isEdit = document.getElementById('form-is-edit').value === 'true';
    const id = document.getElementById('p-id').value;
    
    // Extract Specs
    const details = {};
    document.querySelectorAll('.spec-row').forEach(row => {
        const k = row.querySelector('.spec-key').value.trim();
        const v = row.querySelector('.spec-val').value.trim();
        if (k && v) details[k] = v;
    });

    const newProduct = {
        id: id,
        name: document.getElementById('p-name').value,
        slug: document.getElementById('p-slug').value,
        price: Number(document.getElementById('p-price').value),
        category: document.getElementById('p-category').value,
        shortDescription: document.getElementById('p-shortDesc').value,
        description: document.getElementById('p-desc').value,
        details: details,
        enabled: document.getElementById('p-enabled').checked,
        images: [],
        defaultImage: ""
    };
    
    showLoader();
    try {
        let existingImages = [];
        if (isEdit) {
            const originalProduct = productsData.products.find(p => p.id === id);
            existingImages = originalProduct.images || [];
            newProduct.defaultImage = document.getElementById('p-default-image').value || originalProduct.defaultImage;
        }

        // Handle Image Uploads
        const files = document.getElementById('p-image-upload').files;
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileBase64 = await readFileAsBase64(file);
                
                // Construct path: images/products/P001/filename.jpg
                const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-]/g, '_');
                const filePath = `images/products/${id}/${cleanFileName}`;
                
                // Upload to GitHub
                await uploadFileToGitHub(filePath, fileBase64, `Upload image for product ${id}`);
                existingImages.push(filePath);
            }
        }
        
        newProduct.images = existingImages;
        if (!newProduct.defaultImage && existingImages.length > 0) {
            newProduct.defaultImage = existingImages[0];
        }

        // Update Data Array
        if (isEdit) {
            const index = productsData.products.findIndex(p => p.id === id);
            productsData.products[index] = newProduct;
        } else {
            productsData.products.push(newProduct);
        }
        
        // Save JSON to GitHub
        await updateProductsJson();
        
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
        renderProductsTable();
        showMessage('Product saved successfully!', 'success');
        
    } catch (error) {
        console.error(error);
        showMessage('Error saving product: ' + error.message, 'danger');
    } finally {
        hideLoader();
    }
}

async function uploadFileToGitHub(filePath, base64Content, commitMessage) {
    // Check if file exists to get SHA (if overwriting)
    let sha = undefined;
    try {
        const checkRes = await apiRequest(`/contents/${filePath}?ref=${ghBranch}`);
        sha = checkRes.sha;
    } catch (e) {
        // File doesn't exist, which is fine for new uploads
    }

    const payload = {
        message: commitMessage,
        content: base64Content,
        branch: ghBranch
    };
    if (sha) payload.sha = sha;

    await apiRequest(`/contents/${filePath}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}

async function updateProductsJson() {
    const jsonString = JSON.stringify(productsData, null, 4);
    // Encode properly for utf-8
    const base64Content = window.btoa(unescape(encodeURIComponent(jsonString)));
    
    const payload = {
        message: "Update products.json via Admin panel",
        content: base64Content,
        sha: productsFileSha,
        branch: ghBranch
    };

    const res = await apiRequest(`/contents/data/products.json`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    
    // Update our local SHA for future edits
    productsFileSha = res.content.sha;
}

async function deleteProduct(index) {
    const product = productsData.products[index];
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
        showLoader();
        try {
            productsData.products.splice(index, 1);
            await updateProductsJson();
            renderProductsTable();
            showMessage('Product deleted successfully.', 'success');
        } catch (error) {
            console.error(error);
            showMessage('Error deleting product: ' + error.message, 'danger');
        } finally {
            hideLoader();
        }
    }
}
