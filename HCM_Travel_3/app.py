from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from heapq import heappush, heappop
import math
import os
import json

# Thiết lập đường dẫn
template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')

# Khởi tạo Flask app
app = Flask(__name__, 
    template_folder=template_dir,
    static_folder=static_dir,
    static_url_path='/static')
CORS(app)

# Đọc dữ liệu thành phố từ file JSON
def load_cities_data():
    json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cities.json')
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

# Load dữ liệu thành phố
CITIES = load_cities_data()

# Bảng giá vận chuyển (VND/km)
TRANSPORT_COSTS = {
    'bus': 300,     # 300 VND/km
    'car': 1000,    # 1,000 VND/km
    'motorbike': 500,  # 500 VND/km
    'taxi': 1500     # 1,500 VND/km
}

# Tốc độ trung bình (km/h)
TRANSPORT_SPEEDS = {
    'bus': 20,
    'car': 25,
    'motorbike': 30,
    'taxi': 25
}

def get_preference_score(city, preference):
    """Tính điểm sở thích cho thành phố."""
    base_scores = {
        'cultural': CITIES[city]['cultural_score'],
        'nature': CITIES[city]['nature_score'],
        'food': CITIES[city]['food_score']
    }
    
    preference_score = base_scores.get(preference, 5)
    
    # Tính điểm bonus
    keywords = {
        'cultural': ['museum', 'temple', 'church', 'historic', 'palace'],
        'nature': ['park', 'garden', 'lake', 'ecological'],
        'food': ['market', 'restaurant', 'food', 'cuisine']
    }
    
    if preference in keywords:
        if any(word in attr.lower() for attr in CITIES[city]['attractions'] 
               for word in keywords[preference]):
            preference_score += 2
            
    return preference_score

def calculate_distance(city1, city2):
    """
    Tính khoảng cách giữa hai thành phố.
    Returns: khoảng cách theo km
    """
    # Kiểm tra xem có khoảng cách tùy chỉnh không
    if 'distances' in CITIES[city1] and city2 in CITIES[city1]['distances']:
        return float(CITIES[city1]['distances'][city2])
    elif 'distances' in CITIES[city2] and city1 in CITIES[city2]['distances']:
        return float(CITIES[city2]['distances'][city1])
    
    # Nếu không có khoảng cách tùy chỉnh, tính theo tọa độ thực
    try:
        lat1, lon1 = CITIES[city1]['coords']
        lat2, lon2 = CITIES[city2]['coords']
        
        # Chuyển đổi sang radians
        lat1, lon1 = math.radians(lat1), math.radians(lon1)
        lat2, lon2 = math.radians(lat2), math.radians(lon2)
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of earth in kilometers = 6371 km
        return c * 6371
    except Exception as e:
        print(f"Error calculating distance between {city1} and {city2}: {str(e)}")
        # Trả về khoảng cách mặc định nếu có lỗi
        return 5.0  # giá trị mặc định 5km


def get_visit_info(preference):
    """Lấy thông tin gợi ý thời gian thăm quan."""
    info = {
        'cultural': {
            'duration': '2-3 giờ',
            'tips': 'Nên ghé thăm vào buổi sáng để tránh đông người'
        },
        'nature': {
            'duration': '1-2 giờ',
            'tips': 'Thích hợp cho hoạt động ngoài trời vào chiều mát'
        },
        'food': {
            'duration': '1-1.5 giờ',
            'tips': 'Nên ghé vào giờ ăn chính để đảm bảo món ăn ngon nhất'
        }
    }
    return info.get(preference, {
        'duration': '1-2 giờ',
        'tips': 'Linh hoạt theo thời gian của bạn'
    })


# Hàm A* để tính toán đường đi ngắn nhất theo yêu cầu
def find_route(start, end, preference, transport):
    # Tìm đường đi tối ưu theo sở thích 
    frontier = [] # Hàng đợi ưu tiên 
    # Mỗi phần tử trong frontier có dạng: (priority, current_city, path, actual_distance)
    heappush(frontier, (0, start, [start], 0)) 
    cost_so_far = {start: 0}
    
    while frontier:
        current_cost, current_city, path, actual_distance = heappop(frontier)
        
        if current_city == end:
            # Tạo thông tin lộ trình
            route_info = {
                'route': path,
                'distance': round(actual_distance, 2),
                'time': round(actual_distance / TRANSPORT_SPEEDS[transport], 1),
                'cost': round(actual_distance * TRANSPORT_COSTS[transport]),
                'preference': preference,
                'stops': []
            }
            
            # Xử lý từng điểm dừng
            for city in path:
                visit_info = get_visit_info(preference)
                attractions = filter_attractions(CITIES[city]['attractions'], preference)
                
                city_info = {
                    'id': city,
                    'name': CITIES[city]['name'],
                    'coords': CITIES[city]['coords'],
                    'attractions': attractions,
                    'foods': CITIES[city]['foods'][:3] if preference == 'food' else CITIES[city]['foods'][:2],
                    'attraction_type': preference,
                    'suggested_duration': visit_info['duration'],
                    'visit_tips': visit_info['tips'],
                    'scores': {
                        'cultural': CITIES[city]['cultural_score'],
                        'nature': CITIES[city]['nature_score'],
                        'food': CITIES[city]['food_score']
                    }
                }
                
                route_info['stops'].append(city_info)
            
            return route_info
        
        for next_city in CITIES[current_city]['connections']:
            
            # Tính khoảng cách
            distance = calculate_distance(current_city, next_city)
            new_distance = actual_distance + distance
            
            # Tính điểm sở thích và trọng số
            score = get_preference_score(next_city, preference)
            weight = 2.0 - (score / 10.0)
            new_cost = cost_so_far[current_city] + (distance * weight)
            
            # Thêm vào danh sách nếu là đường đi tốt hơn
            if next_city not in cost_so_far or new_cost < cost_so_far[next_city]:
                cost_so_far[next_city] = new_cost
                priority = new_cost + calculate_distance(next_city, end)
                heappush(frontier, (priority, next_city, path + [next_city], new_distance))
    
    return None
def filter_attractions(attractions, preference):
    # Lọc địa điểm theo sở thích.
    keywords = {
        'cultural': ['museum', 'temple', 'church', 'historic', 'palace'],
        'nature': ['park', 'garden', 'lake', 'ecological'],
        'food': ['market', 'restaurant', 'food', 'cuisine']
    }
    
    if preference in keywords:
        filtered = [attr for attr in attractions 
                   if any(word in attr.lower() for word in keywords[preference])]
        return filtered[:3] if filtered else attractions[:2]
    
    return attractions[:2]

@app.route('/')
def home():
    """Route trang chủ."""
    cities_data = {city: {
        'name': data['name'],
        'coords': data['coords'],
        'connections': data['connections'],
        'attractions': data['attractions'],
        'foods': data['foods'],
        'scores': {
            'cultural': data['cultural_score'],
            'nature': data['nature_score'],
            'food': data['food_score']
        }
    } for city, data in CITIES.items()}
    
    return render_template('index.html', cities=cities_data)

@app.route('/find_route', methods=['POST'])
def find_route_api():
    """API endpoint tìm đường."""
    try:
        data = request.get_json()
        start = data.get('start')
        end = data.get('end')
        preference = data.get('preference', 'cultural')
        transport = data.get('transport', 'car')
        
        if not all([start, end]):
            return jsonify({'error': 'Thiếu thông tin điểm đi hoặc điểm đến'}), 400
        
        route = find_route(start, end, preference, transport)
        if route:
            return jsonify(route)
        
        return jsonify({'error': 'Không tìm thấy đường đi phù hợp'}), 404
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': 'Lỗi server'}), 500

if __name__ == '__main__':
    app.run(debug=True)