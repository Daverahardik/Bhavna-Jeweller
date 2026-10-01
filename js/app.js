document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    const yearEl = document.getElementById('year');
    if(yearEl) yearEl.textContent = new Date().getFullYear();

    // Load Data
    loadProducts();
});

let allProducts = [];
let siteConfig = {};

async function loadProducts() {
    try {
        const response = await fetch('data/products.json?v=' + new Date().getTime()); // Prevent caching during dev
        const data = await response.json();
        
        // Filter out disabled products
        allProducts = data.products.filter(p => p.enabled !== false);
        siteConfig = data.config || {};
        
        const loader = document.getElementById('loader');
        if (loader) {
            setTimeout(() => loader.style.display = 'none', 500); // slight delay for smooth effect
        }

        // Check which page we are on
        if (window.location.pathname.includes('product.html') || new URLSearchParams(window.location.search).has('product')) {
            renderProductDetails();
        } else if (window.location.pathname.includes('shop.html')) {
            renderHomePage(false); // Show all products
        } else {
            renderHomePage(true); // Index page: maybe show featured only
        }
        
    } catch (error) {
        console.error('Error loading products:', error);
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }
}

function renderHomePage(isIndex = false) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    // Populate categories
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        const categories = [...new Set(allProducts.map(p => p.category))];
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryFilter.appendChild(option);
        });

        categoryFilter.addEventListener('change', filterProducts);
    }

    const searchInput = document.getElementById('search-input');
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            filterProducts();
        });
        searchInput.addEventListener('input', filterProducts);
    }

    // If on index page, just show featured products or a limited number
    let displayList = allProducts;
    if (isIndex) {
        displayList = allProducts.filter(p => p.featured).slice(0, 8);
        if (displayList.length === 0) displayList = allProducts.slice(0, 8);
    }

    displayProducts(displayList);
}

function displayProducts(products) {
    const grid = document.getElementById('product-grid');
    const noProducts = document.getElementById('no-products');
    
    grid.innerHTML = '';
    
    if (products.length === 0) {
        noProducts.classList.remove('d-none');
        return;
    }
    
    noProducts.classList.add('d-none');

    products.forEach(product => {
        let imageHtml = '';
        let carouselControls = '';
        let imgWrapperClass = 'product-img-wrapper';
        
        if (product.images && product.images.length > 1) {
            imgWrapperClass += ' carousel-container';
            imageHtml = `<div class="carousel-track" id="track-${product.id}" data-current="0" data-total="${product.images.length}">`;
            product.images.forEach((img, idx) => {
                imageHtml += `<div class="carousel-slide"><img src="${img}" alt="${product.name} - Image ${idx+1}" loading="lazy"></div>`;
            });
            imageHtml += `</div>`;
            
            carouselControls = `
                <button class="carousel-btn prev-btn" aria-label="Previous image" onclick="window.moveCarousel(event, '${product.id}', -1)"><i class="bi bi-chevron-left"></i></button>
                <button class="carousel-btn next-btn" aria-label="Next image" onclick="window.moveCarousel(event, '${product.id}', 1)"><i class="bi bi-chevron-right"></i></button>
                <div class="carousel-dots" id="dots-${product.id}">
                    ${product.images.map((_, i) => `<button type="button" class="dot ${i === 0 ? 'active' : ''}" aria-label="Go to image ${i+1}" onclick="window.goToCarousel(event, '${product.id}', ${i})"></button>`).join('')}
                </div>
            `;
        } else {
            const imgUrl = product.defaultImage || (product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/600');
            imageHtml = `<img src="${imgUrl}" alt="${product.name}" loading="lazy">`;
        }
        
        const defaultNumber = "919106770262";
        const phoneNumber = siteConfig.whatsappNumber ? siteConfig.whatsappNumber.replace(/[^0-9]/g, '') : defaultNumber;
        
        // Ensure absolute/full origin URL for WhatsApp sharing
        let absImage = product.defaultImage || (product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/600');
        if (!absImage.startsWith('http')) {
            absImage = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/') + absImage;
        }
        const message = encodeURIComponent(`Hi,\nI'm interested in the ${product.name} (ID: ${product.id})\nPrice: ₹${product.price}\nImage: ${absImage}`);
        const waLink = `https://wa.me/${phoneNumber}?text=${message}`;
        
        const card = document.createElement('div');
        card.className = 'col-sm-6 col-md-6 col-lg-4 mb-4';
        card.innerHTML = `
            <div class="product-card h-100 scroll-reveal">
                <div class="position-relative">
                    <a href="product.html?product=${product.slug}" class="text-decoration-none d-block position-relative ${imgWrapperClass}">
                        ${imageHtml}
                        <div class="product-overlay"></div>
                    </a>
                    ${carouselControls}
                </div>
                <div class="product-info text-center">
                    <div class="product-category">${product.category}</div>
                    <h3 class="product-title text-truncate" title="${product.name}">${product.name}</h3>
                    <div class="product-price mb-3">₹${product.price}</div>
                        
                    <div class="product-actions mt-auto">
                        <a href="product.html?product=${product.slug}" class="btn-view">View</a>
                        <a href="${waLink}" target="_blank" class="btn-buy"><i class="bi bi-whatsapp"></i> Buy</a>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
}

function filterProducts() {
    const categoryFilter = document.getElementById('category-filter');
    const searchInput = document.getElementById('search-input');
    
    const isIndex = !(window.location.pathname.includes('shop.html') || window.location.pathname.includes('product.html'));
    let baseList = allProducts;
    if (isIndex) {
        baseList = allProducts.filter(p => p.featured).slice(0, 8);
        if (baseList.length === 0) baseList = allProducts.slice(0, 8);
    }
    
    let filtered = baseList;
    
    if (categoryFilter && categoryFilter.value !== 'All') {
        filtered = filtered.filter(p => p.category === categoryFilter.value);
    }
    
    if (searchInput && searchInput.value.trim() !== '') {
        const query = searchInput.value.toLowerCase().trim();
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.shortDescription.toLowerCase().includes(query)
        );
    }
    
    displayProducts(filtered);
}

function resetFilters() {
    const categoryFilter = document.getElementById('category-filter');
    const searchInput = document.getElementById('search-input');
    
    if (categoryFilter) categoryFilter.value = 'All';
    if (searchInput) searchInput.value = '';
    
    const isIndex = !(window.location.pathname.includes('shop.html') || window.location.pathname.includes('product.html'));
    let baseList = allProducts;
    if (isIndex) {
        baseList = allProducts.filter(p => p.featured).slice(0, 8);
        if (baseList.length === 0) baseList = allProducts.slice(0, 8);
    }
    
    displayProducts(baseList);
}

function renderProductDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('product');
    
    const product = allProducts.find(p => p.slug === slug);
    const container = document.getElementById('product-detail-container');
    const errorContainer = document.getElementById('error-container');
    
    if (!product) {
        if(container) container.style.display = 'none';
        if(errorContainer) errorContainer.classList.remove('d-none');
        return;
    }
    
    container.style.display = 'block';
    
    // Set Title & Meta
    document.title = `${product.name} | Bhavna Jewellers`;
    
    // Populate Info
    document.getElementById('breadcrumb-title').textContent = product.name;
    document.getElementById('detail-title').textContent = product.name;
    document.getElementById('detail-category').textContent = product.category;
    document.getElementById('detail-price').textContent = `₹${product.price}`;
    document.getElementById('detail-short-desc').textContent = product.shortDescription;
    document.getElementById('detail-desc').textContent = product.description;
    
    // Images
    const defaultImg = product.defaultImage || (product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/600');
    
    const mainImage = document.getElementById('main-image');
    if (mainImage) {
        mainImage.src = defaultImg;
        mainImage.alt = product.name;
    }
    
    const thumbContainer = document.getElementById('thumbnail-container');
    if (thumbContainer) {
        thumbContainer.innerHTML = '';
        if (product.images && product.images.length > 1) {
            product.images.forEach(imgUrl => {
                const thumb = document.createElement('img');
                thumb.src = imgUrl;
                thumb.className = `thumbnail-img ${imgUrl === defaultImg ? 'active' : ''}`;
                thumb.alt = 'Thumbnail';
                thumb.onclick = function() {
                    if (mainImage) {
                        mainImage.src = this.src;
                    }
                    document.querySelectorAll('.thumbnail-img').forEach(el => el.classList.remove('active'));
                    this.classList.add('active');
                };
                thumbContainer.appendChild(thumb);
            });
        }
    }
    
    // Specs
    const specsTbody = document.getElementById('detail-specs');
    specsTbody.innerHTML = '';
    if (product.details) {
        for (const [key, value] of Object.entries(product.details)) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<th>${key}</th><td>${value}</td>`;
            specsTbody.appendChild(tr);
        }
    }
    
    // WhatsApp logic
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const defaultNumber = "919106770262";
    const phoneNumber = siteConfig.whatsappNumber ? siteConfig.whatsappNumber.replace(/[^0-9]/g, '') : defaultNumber;
    let absImage = defaultImg;
    if (!absImage.startsWith('http')) {
        absImage = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/') + absImage;
    }
    const message = encodeURIComponent(`Hi,\nI'm interested in the ${product.name} (ID: ${product.id})\nPrice: ₹${product.price}\nImage: ${absImage}`);
    whatsappBtn.href = `https://wa.me/${phoneNumber}?text=${message}`;
}

// Global carousel move function
window.moveCarousel = function(event, productId, direction) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const track = document.getElementById(`track-${productId}`);
    const dotsContainer = document.getElementById(`dots-${productId}`);
    if (!track) return;
    
    const total = parseInt(track.getAttribute('data-total'));
    let current = parseInt(track.getAttribute('data-current'));
    
    current += direction;
    
    // Looping logic
    if (current < 0) current = total - 1;
    if (current >= total) current = 0;
    
    track.setAttribute('data-current', current);
    track.style.transform = `translateX(-${current * 100}%)`;
    
    // Update dots
    if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            if (index === current) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
};

window.goToCarousel = function(event, productId, index) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const track = document.getElementById(`track-${productId}`);
    if (!track) return;
    
    track.setAttribute('data-current', index);
    track.style.transform = `translateX(-${index * 100}%)`;
    
    const dotsContainer = document.getElementById(`dots-${productId}`);
    if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, idx) => {
            if (idx === index) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
};

// Touch swipe support
let touchStartX = 0;
let touchStartY = 0;
let wasSwipe = false;

document.addEventListener('touchstart', e => {
    wasSwipe = false;
    const container = e.target.closest('.carousel-container');
    if (container) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }
}, { passive: true });

document.addEventListener('touchend', e => {
    const container = e.target.closest('.carousel-container');
    if (container) {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
            wasSwipe = true;
            const track = container.querySelector('.carousel-track');
            if (track) {
                const productId = track.id.replace('track-', '');
                if (deltaX < 0) {
                    window.moveCarousel(null, productId, 1);
                } else {
                    window.moveCarousel(null, productId, -1);
                }
            }
        }
    }
}, { passive: true });

document.addEventListener('click', e => {
    if (wasSwipe) {
        const container = e.target.closest('.carousel-container');
        if (container) {
            e.preventDefault();
            e.stopPropagation();
            wasSwipe = false;
        }
    }
}, true);
