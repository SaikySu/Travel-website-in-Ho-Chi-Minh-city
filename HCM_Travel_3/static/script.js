// Biến toàn cục
let markers = [];
let routingControl;
let selectedTransport = 'car';
let selectedPreference = 'cultural';
let map;

// Khởi tạo bản đồ
function initializeMap() {
    map = L.map('map', {
        zoomControl: false
    }).setView([10.7756, 106.7019], 12);

    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
}

// Populate các select box
function populateSelects() {
    const startSelect = document.getElementById('start');
    const endSelect = document.getElementById('end');
    
    Object.keys(cities).forEach(cityId => {
        const city = cities[cityId];
        const startOption = new Option(city.name, cityId);
        const endOption = new Option(city.name, cityId);
        
        startSelect.add(startOption);
        endSelect.add(endOption);
    });
}

// Thêm markers cho các thành phố
function addCityMarkers() {
    Object.keys(cities).forEach(cityId => {
        const city = cities[cityId];
        const marker = L.marker(city.coords).addTo(map);
        
        const popupContent = `
            <div class="city-popup">
                <h3>${city.name}</h3>
                <div class="city-info">
                    <strong>Địa điểm du lịch: </strong>
                    <ul>
                        ${city.attractions.map(attr => `<li>${attr}</li>`).join('')}
                    </ul>
                    <strong>Các quán ăn nổi tiếng: </strong>
                    <ul>
                        ${city.foods.map(food => `<li>${food}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        markers.push(marker);
    });
}

// Tìm đường đi
async function findPath() {
    const start = document.getElementById('start').value;
    const end = document.getElementById('end').value;
    
    if (!start || !end) {
        alert('Vui lòng chọn điểm xuất phát và điểm đến');
        return;
    }
    
    if (start === end) {
        alert('Vui lòng chọn điểm đến khác điểm xuất phát');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch('/find_route', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                start: start,
                end: end,
                preference: selectedPreference,
                transport: selectedTransport
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
            return;
        }
        
        if (data.stops && data.stops.length > 0) {
            displayPath(data);
        } else {
            alert('Không tìm thấy đường đi phù hợp');
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('Có lỗi xảy ra khi tìm đường');
    } finally {
        hideLoading();
    }
}

// Hiển thị đường đi
async function displayPath(route_data) {
    try {
        // Xóa route cũ
        if (routingControl) {
            map.removeControl(routingControl);
        }

        // Xóa markers cũ
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        const waypoints = route_data.stops.map(stop => L.latLng(stop.coords[0], stop.coords[1]));

        // Thêm markers mới
        route_data.stops.forEach((stop, index) => {
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="marker-pin">${index + 1}</div>`,
                iconSize: [30, 42],
                iconAnchor: [15, 42]
            });

            const marker = L.marker(stop.coords, { icon }).addTo(map);
            const popupContent = `
                <div class="city-popup">
                    <h3>${stop.name}</h3>
                    <div class="city-info">
                        <strong>Địa điểm du lịch:</strong>
                        <ul>
                            ${stop.attractions.map(attr => `<li>${attr}</li>`).join('')}
                        </ul>
                        <strong>Món ăn đặc trưng:</strong>
                        <ul>
                            ${stop.foods.map(food => `<li>${food}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
            marker.bindPopup(popupContent);
            markers.push(marker);
        });

        // Tạo route sử dụng Routing Machine
        routingControl = L.Routing.control({
            waypoints: waypoints,
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            lineOptions: {
                styles: [{
                    color: '#2196F3',
                    weight: 5,
                    opacity: 0.7
                }]
            },
            createMarker: function() { return null; }
        }).addTo(map);

        routingControl.hide();

        // Lắng nghe sự kiện route found
        routingControl.on('routesfound', function(e) {
            const routes = e.routes;
            const route = routes[0];

            // Tính toán thống kê
            const distance = route.summary.totalDistance / 1000;
            const time = route.summary.totalTime / 3600;
            const cost = calculateCost(distance, selectedTransport);

            // Hiển thị kết quả
            displayRouteInfo(route_data.stops, distance, time, cost, route_data.preference);
        });

        // Fit bounds
        const bounds = L.latLngBounds(waypoints);
        map.fitBounds(bounds, { padding: [50, 50] });

    } catch (error) {
        console.error('Error in displayPath:', error);
        alert('Có lỗi xảy ra khi hiển thị đường đi');
    }
}

// Hiển thị thông tin route
function displayRouteInfo(stops, distance, time, cost, preference) {
    // Hiển thị thống kê
    const statsDiv = document.getElementById('stats');
    statsDiv.innerHTML = `
        <h3><i class="fas fa-info-circle"></i> Thông Tin Hành Trình</h3>
        <div class="stat-item">
            <i class="fas fa-road"></i>
            <div>
                <strong>Tổng quãng đường:</strong>
                <div>${distance.toFixed(1)} km</div>
            </div>
        </div>
        <div class="stat-item">
            <i class="fas fa-clock"></i>
            <div>
                <strong>Thời gian di chuyển:</strong>
                <div>${time.toFixed(1)} giờ</div>
            </div>
        </div>
        <div class="stat-item">
            <i class="fas fa-coins"></i>
            <div>
                <strong>Chi phí ước tính:</strong>
                <div>${new Intl.NumberFormat('vi-VN', { 
                    style: 'currency', 
                    currency: 'VND' 
                }).format(cost)}</div>
            </div>
        </div>
    `;

    // Hiển thị timeline
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
        <div class="timeline">
            ${stops.map((stop, index) => `
                <div class="timeline-item" data-step="${index + 1}">
                    <h4>
                        <i class="fas fa-map-marker-alt"></i> 
                        ${stop.name}
                        ${getPreferenceIcon(stop.attraction_type)}
                    </h4>
                    <div class="timeline-content">
                        <div class="visit-info">
                            <p class="duration">
                                <i class="fas fa-clock"></i> 
                                ${stop.suggested_duration}
                            </p>
                            <p class="tips">
                                <i class="fas fa-lightbulb"></i> 
                                ${stop.visit_tips}
                            </p>
                        </div>
                        <div class="attractions">
                            <strong>
                                ${getAttractionIcon(stop.attraction_type)}
                                Địa điểm gợi ý:
                            </strong>
                            <ul>
                                ${stop.attractions
                                    .map(attr => `<li>${attr}</li>`)
                                    .join('')}
                            </ul>
                        </div>
                        ${stop.foods.length > 0 ? `
                            <div class="foods">
                                <strong>
                                    <i class="fas fa-utensils"></i> 
                                    Quán ăn nổi tiếng:
                                </strong>
                                <ul>
                                    ${stop.foods
                                        .map(food => `<li>${food}</li>`)
                                        .join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Helper functions
function getPreferenceIcon(type) {
    switch(type) {
        case 'cultural':
            return '<i class="fas fa-landmark"></i>';
        case 'nature':
            return '<i class="fas fa-tree"></i>';
        case 'food':
            return '<i class="fas fa-utensils"></i>';
        default:
            return '<i class="fas fa-map-marker-alt"></i>';
    }
}

function getAttractionIcon(type) {
    switch(type) {
        case 'cultural':
            return '<i class="fas fa-monument"></i>';
        case 'nature':
            return '<i class="fas fa-leaf"></i>';
        case 'food':
            return '<i class="fas fa-store"></i>';
        default:
            return '<i class="fas fa-map-pin"></i>';
    }
}

// Tính chi phí di chuyển
function calculateCost(distance, transport) {
    const costs = {
        'bus': 300,
        'car': 1000,
        'motorbike': 500,
        'taxi': 1500
    };
    return distance * costs[transport];
}

// Loading handlers
function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Event listeners
document.querySelectorAll('.transport-option').forEach(option => {
    option.addEventListener('click', function() {
        document.querySelectorAll('.transport-option').forEach(opt => 
            opt.classList.remove('selected'));
        this.classList.add('selected');
        selectedTransport = this.dataset.transport;
    });
});

document.querySelectorAll('.preference-option').forEach(option => {
    option.addEventListener('click', function() {
        document.querySelectorAll('.preference-option').forEach(opt => 
            opt.classList.remove('selected'));
        this.classList.add('selected');
        selectedPreference = this.dataset.preference;
    });
});

// Initialization
window.onload = function() {
    initializeMap();
    populateSelects();
    addCityMarkers();
    // Select defaults
    document.querySelector('[data-transport="car"]').classList.add('selected');
    document.querySelector('[data-preference="cultural"]').classList.add('selected');
};