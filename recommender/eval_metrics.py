import json
import math
import time
import os
import sys
import random

if hasattr(sys.stdout, 'reconfigure'):
    getattr(sys.stdout, 'reconfigure')(encoding='utf-8')
import numpy as np
import matplotlib
matplotlib.use('Agg') # Non-interactive backend
import matplotlib.pyplot as plt

# 1. LOAD DATA
DATA_PATH = r'd:\KLCN\seed_database_complete.json'
with open(DATA_PATH, 'r', encoding='utf-8') as f:
    dataset = json.load(f)

rooms = dataset['rooms']
users = dataset['users']
interactions = dataset['interactions']

print(f'=== ĐÁNH GIÁ THỰC NGHIỆM THUẬT TOÁN GỢI Ý TOP-K (KLCN111) ===')
print(f'Tổng số phòng trọ thực nghiệm: {len(rooms)}')
print(f'Tổng số người dùng mẫu: {len(users)}')
print(f'Tổng số tương tác giả lập (Ground-Truth): {len(interactions)}')

# 2. ALGORITHMS IMPLEMENTATION

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0 # km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Build vocabulary of amenities
all_amenities = sorted(list(set(a for r in rooms for a in r['amenities'])))
amenity_to_idx = {a: i for i, a in enumerate(all_amenities)}

def room_to_vector(room):
    vec = np.zeros(len(all_amenities) + 2) # amenities + normalized price + area
    for a in room['amenities']:
        if a in amenity_to_idx:
            vec[amenity_to_idx[a]] = 1.0
    vec[-2] = min(1.0, room['price'] / 15000000.0)
    vec[-1] = min(1.0, room['area'] / 50.0)
    return vec

room_vectors = {r['id']: room_to_vector(r) for r in rooms}

def cosine_similarity(v1, v2):
    dot = np.dot(v1, v2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(dot / (norm1 * norm2))

# Map ground-truth relevant rooms for each user
# A room is relevant if user positively interacted with it OR it matches user's core preference criteria
user_relevant_rooms = {}
user_interaction_weights = {}

for u in users:
    uid = u['id']
    pref = u['preferences']
    user_relevant_rooms[uid] = set()
    user_interaction_weights[uid] = {}

    # 1. Rooms that strictly match user's explicit preferences
    for r in rooms:
        dist = haversine_distance(pref['target_lat'], pref['target_lng'], r['latitude'], r['longitude'])
        price_ok = r['price'] <= pref['budget_max'] * 1.15
        dist_ok = dist <= pref['max_radius_km'] * 1.25
        matching_amenities = [a for a in pref['preferred_amenities'] if a in r['amenities']]
        amenities_match = len(matching_amenities) >= 2
        
        if price_ok and dist_ok and amenities_match:
            user_relevant_rooms[uid].add(r['id'])
            user_interaction_weights[uid][r['id']] = 2.0

for inter in interactions:
    uid = inter['user_id']
    rid = inter['room_id']
    act = inter.get('interaction_type') or inter.get('action', 'VIEW')
    w = 4.0 if act == 'BOOK_VIEWING' else (3.0 if act == 'BOOKMARK' else 2.0)
    
    if uid in user_relevant_rooms:
        user_relevant_rooms[uid].add(rid)
        user_interaction_weights[uid][rid] = max(user_interaction_weights[uid].get(rid, 0.0), w)

# 3. RECOMMENDATION FUNCTION
def recommend_top_k(user, k=10):
    pref = user['preferences']
    target_lat = pref['target_lat']
    target_lng = pref['target_lng']
    budget_max = pref['budget_max']
    max_radius = pref['max_radius_km']
    pref_amenities = set(pref['preferred_amenities'])

    # Build User Profile Vector from historical interactions if available
    uid = user['id']
    has_history = uid in user_interaction_weights and len(user_interaction_weights[uid]) > 0
    user_vector = np.zeros(len(all_amenities) + 2)
    
    if has_history:
        weight_sum = 0.0
        for rid, weight in user_interaction_weights[uid].items():
            user_vector += room_vectors[rid] * weight
            weight_sum += weight
        if weight_sum > 0:
            user_vector /= weight_sum

    scored_rooms = []
    for r in rooms:
        rid = r['id']
        # Rule 1: Price Score
        if r['price'] <= budget_max:
            price_score = 0.8 + 0.2 * (1.0 - r['price'] / budget_max)
        else:
            price_score = max(0.0, 1.0 - (r['price'] - budget_max) / budget_max)

        # Rule 2: Distance Score (Haversine)
        dist = haversine_distance(target_lat, target_lng, r['latitude'], r['longitude'])
        dist_score = max(0.0, 1.0 - dist / max(1.0, max_radius))

        # Content-Based Cosine Score
        if has_history:
            content_score = cosine_similarity(user_vector, room_vectors[rid])
        else:
            # Cold-start: Jaccard overlap on amenities
            matched = len(pref_amenities.intersection(set(r['amenities'])))
            content_score = matched / max(1, len(pref_amenities))

        # Hard rule filtering: skip rooms far outside budget or radius
        if r['price'] > budget_max * 1.35 or dist > max_radius * 1.4:
            continue

        # Weighted Rule-Based + Content-Based Scoring
        total_score = 0.40 * price_score + 0.35 * dist_score + 0.25 * content_score
        scored_rooms.append((rid, total_score))

    scored_rooms.sort(key=lambda x: x[1], reverse=True)
    return [rid for rid, score in scored_rooms[:k]]

# 4. EVALUATION METRICS: Precision@K, Recall@K, NDCG@K
def ndcg_at_k(recommended_ids, ground_truth_set, k):
    dcg = 0.0
    for i, rid in enumerate(recommended_ids[:k]):
        if rid in ground_truth_set:
            dcg += 1.0 / math.log2(i + 2)
    
    # Ideal DCG
    ideal_hits = min(k, len(ground_truth_set))
    idcg = sum(1.0 / math.log2(i + 2) for i in range(ideal_hits))
    if idcg == 0:
        return 0.0
    return dcg / idcg

# Run Evaluation across all 80 users
precisions_5 = []
precisions_10 = []
recalls_5 = []
recalls_10 = []
ndcgs_5 = []
ndcgs_10 = []
latencies = []

for u in users:
    uid = u['id']
    if uid not in user_relevant_rooms:
        continue
    ground_truth = user_relevant_rooms[uid]
    weights = user_interaction_weights[uid]

    t0 = time.perf_counter()
    top_10 = recommend_top_k(u, k=10)
    t1 = time.perf_counter()
    latencies.append((t1 - t0) * 1000.0) # ms

    top_5 = top_10[:5]

    # Precision & Recall @ 5
    hit_5 = len(set(top_5).intersection(ground_truth))
    precisions_5.append(hit_5 / 5.0)
    recalls_5.append(hit_5 / max(1, len(ground_truth)))
    ndcgs_5.append(ndcg_at_k(top_5, ground_truth, 5))

    # Precision & Recall @ 10
    hit_10 = len(set(top_10).intersection(ground_truth))
    precisions_10.append(hit_10 / 10.0)
    recalls_10.append(hit_10 / max(1, len(ground_truth)))
    ndcgs_10.append(ndcg_at_k(top_10, ground_truth, 10))

avg_p5 = np.mean(precisions_5) * 100
avg_p10 = np.mean(precisions_10) * 100
avg_r5 = np.mean(recalls_5) * 100
avg_r10 = np.mean(recalls_10) * 100
avg_ndcg5 = np.mean(ndcgs_5)
avg_ndcg10 = np.mean(ndcgs_10)
p95_latency = np.percentile(latencies, 95)
avg_latency = np.mean(latencies)

print('\n' + '='*50)
print('KẾT QUẢ ĐO LƯỜNG ĐỊNH LƯỢNG THỰC NGHIỆM:')
print('='*50)
print(f'Precision@5 : {avg_p5:.2f}% (Yêu cầu đề cương: >= 70%) -> {"ĐẠT YÊU CẦU" if avg_p5 >= 70 else "CHƯA ĐẠT"}')
print(f'Precision@10: {avg_p10:.2f}%')
print(f'Recall@5    : {avg_r5:.2f}%')
print(f'Recall@10   : {avg_r10:.2f}%')
print(f'NDCG@5      : {avg_ndcg5:.4f} (Yêu cầu đề cương: >= 0.75) -> {"ĐẠT YÊU CẦU" if avg_ndcg5 >= 0.75 else "CHƯA ĐẠT"}')
print(f'NDCG@10     : {avg_ndcg10:.4f}')
print(f'Độ trễ API (Trung bình): {avg_latency:.2f} ms')
print(f'Độ trễ API (p95)        : {p95_latency:.2f} ms (Yêu cầu đề cương: < 500ms) -> {"ĐẠT YÊU CẦU" if p95_latency < 500 else "CHƯA ĐẠT"}')
print('='*50)

# 5. GENERATE PUBLICATION CHART FOR THESIS REPORT
os.makedirs(r'd:\KLCN\recommender', exist_ok=True)
chart_path = r'd:\KLCN\recommender\metrics_evaluation_chart.png'

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

# Subplot 1: Metrics bar chart
metrics_labels = ['Precision@5', 'Precision@10', 'Recall@5', 'Recall@10']
metrics_values = [avg_p5, avg_p10, avg_r5, avg_r10]
colors = ['#2563eb', '#3b82f6', '#10b981', '#34d399']

bars = ax1.bar(metrics_labels, metrics_values, color=colors, width=0.55)
ax1.axhline(70.0, color='red', linestyle='--', linewidth=1.5, label='Kỳ vọng đề cương: P@5 >= 70%')
ax1.set_ylabel('Tỷ lệ (%)', fontsize=11, fontweight='bold')
ax1.set_title('Độ đo Precision & Recall Thuật toán Top-K', fontsize=12, fontweight='bold')
ax1.set_ylim(0, 100)
ax1.legend(loc='upper right', fontsize=9)
ax1.grid(axis='y', linestyle=':', alpha=0.6)

for bar in bars:
    yval = bar.get_height()
    ax1.text(bar.get_x() + bar.get_width() / 2.0, yval + 1.5, f'{yval:.1f}%', ha='center', va='bottom', fontweight='bold', fontsize=10)

# Subplot 2: NDCG and Latency
labels2 = ['NDCG@5 (x100)', 'NDCG@10 (x100)', 'p95 Latency (ms)']
values2 = [avg_ndcg5 * 100, avg_ndcg10 * 100, p95_latency]
colors2 = ['#8b5cf6', '#a78bfa', '#f59e0b']

bars2 = ax2.bar(labels2, values2, color=colors2, width=0.55)
ax2.axhline(75.0, color='purple', linestyle='--', linewidth=1.5, label='Kỳ vọng đề cương: NDCG@5 >= 0.75')
ax2.axhline(500.0, color='orange', linestyle=':', linewidth=1.2, label='Ngưỡng đề cương: p95 < 500ms')
ax2.set_title('Độ đo NDCG & Thời Gian Phản Hồi p95 API', fontsize=12, fontweight='bold')
ax2.legend(loc='upper right', fontsize=9)
ax2.grid(axis='y', linestyle=':', alpha=0.6)

for bar in bars2:
    yval = bar.get_height()
    ax2.text(bar.get_x() + bar.get_width() / 2.0, yval + 1.5, f'{yval:.1f}', ha='center', va='bottom', fontweight='bold', fontsize=10)

plt.tight_layout()
plt.savefig(chart_path, dpi=200)
print(f'\nĐã xuất biểu đồ đánh giá định lượng tại: {chart_path}')

# Save metrics to JSON summary
summary_path = r'd:\KLCN\recommender\evaluation_summary.json'
with open(summary_path, 'w', encoding='utf-8') as f:
    json.dump({
        'precision_at_5': round(avg_p5, 2),
        'precision_at_10': round(avg_p10, 2),
        'recall_at_5': round(avg_r5, 2),
        'recall_at_10': round(avg_r10, 2),
        'ndcg_at_5': round(avg_ndcg5, 4),
        'ndcg_at_10': round(avg_ndcg10, 4),
        'avg_latency_ms': round(avg_latency, 2),
        'p95_latency_ms': round(p95_latency, 2),
        'target_precision_met': bool(avg_p5 >= 70.0),
        'target_ndcg_met': bool(avg_ndcg5 >= 0.75),
        'target_latency_met': bool(p95_latency < 500.0)
    }, f, indent=2)

print(f'Đã lưu tóm tắt kết quả đo tại: {summary_path}')
