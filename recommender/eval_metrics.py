"""
ĐÁNH GIÁ OFFLINE THUẬT TOÁN GỢI Ý TOP-K (KLCN111)

Cài đặt lại bằng Python đúng thuật toán của web (web/src/lib/recommender-core.ts) và đúng
quy trình đánh giá của web (web/src/lib/recommender-eval.ts), để kiểm chứng chéo kết quả
trên file seed_database_complete.json.

Quy trình (temporal hold-out theo từng người dùng):
  1. Sắp tương tác của mỗi người dùng theo thời gian: 80% đầu = tập học, 20% cuối = tập kiểm tra.
  2. Hồ sơ Content-Based chỉ dựng từ tập học; thuật toán không được thấy tập kiểm tra.
  3. Ground truth = phòng có tương tác trong tập kiểm tra và chưa gặp trong tập học.
     Độ liên quan: VIEW = 1, BOOKMARK = 2, BOOK_VIEWING = 3.
  4. Ứng viên = toàn bộ phòng trừ các phòng đã gặp trong tập học.
  5. Độ đo: Precision@K, Recall@K (chia cho TỔNG số phòng liên quan), NDCG@K (gain 2^rel - 1),
     HitRate@K, MRR@10, với K = 5 và 10.
  6. So sánh với: Ngẫu nhiên (giá trị kỳ vọng), Phổ biến nhất, Chỉ Rule-Based.

Chạy:  python recommender/eval_metrics.py            (từ thư mục gốc KLCN)
       python recommender/eval_metrics.py --data đường_dẫn_khác.json

Độ trễ API (p95 < 500 ms) KHÔNG đo ở đây: đo bằng nút "Chạy đánh giá" trong trang Admin
hoặc script web/scripts/benchmark-recommend-api.mjs (gọi HTTP thật tới /api/rooms/recommend).
"""
import argparse
import json
import math
import os
import sys
from collections import defaultdict
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    getattr(sys.stdout, 'reconfigure')(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATA_PATH = os.path.join(SCRIPT_DIR, '..', 'seed_database_complete.json')

# ----------------------------------------------------------------------------
# 1. THUẬT TOÁN (giống hệt web/src/lib/recommender-core.ts)
# ----------------------------------------------------------------------------
CANONICAL_AMENITY_KEYS = [
    'máy lạnh', 'wc riêng', 'gác', 'kệ bếp', 'tủ lạnh', 'máy giặt',
    'ban công', 'vân tay', 'giờ giấc tự do', 'thang máy', 'giữ xe', 'wifi',
]
INTERACTION_WEIGHTS = {'VIEW': 1.0, 'BOOKMARK': 2.0, 'BOOK_VIEWING': 3.0}
RULE_WEIGHTS = {'price': 0.40, 'distance': 0.35, 'amenity': 0.25}
HYBRID_WEIGHTS = {'rule': 0.70, 'history': 0.30}
HISTORY_WINDOW = 40
KS = [5, 10]
MRR_CUTOFF = 10
TRAIN_RATIO = 0.8


def js_round4(value):
    """Làm tròn 4 chữ số giống Number(x.toFixed(4)) của JavaScript (đủ dùng cho xếp hạng)."""
    return float(f'{value:.4f}')


def haversine_distance(lat1, lon1, lat2, lon2):
    r = 6371.0
    d_lat = (lat2 - lat1) * math.pi / 180
    d_lon = (lon2 - lon1) * math.pi / 180
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) * math.sin(d_lon / 2) ** 2)
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def cosine(vec_a, vec_b):
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = sum(a * a for a in vec_a)
    norm_b = sum(b * b for b in vec_b)
    if norm_a <= 0 or norm_b <= 0:
        return 0.0
    return dot / (math.sqrt(norm_a) * math.sqrt(norm_b))


def room_vector(room):
    amen_lower = [a.lower() for a in room['amenities']]
    price_norm = min(1.0, max(0.0, room['price'] / 10_000_000))
    area_norm = min(1.0, max(0.0, room['area'] / 50))
    balcony_bit = 1.0 if room.get('has_balcony') else 0.0
    bits = [1.0 if any(key in a for a in amen_lower) else 0.0 for key in CANONICAL_AMENITY_KEYS]
    return [price_norm, area_norm, balcony_bit] + bits


def user_history_vector(history, room_by_id, room_vectors):
    """history: [(room_id, action)] đã sắp mới nhất trước."""
    if not history:
        return None
    dim = 3 + len(CANONICAL_AMENITY_KEYS)
    acc = [0.0] * dim
    total = 0.0
    for room_id, action in history[:HISTORY_WINDOW]:
        if room_id not in room_by_id:
            continue
        weight = INTERACTION_WEIGHTS.get(action, 1.0)
        vec = room_vectors[room_id]
        for i in range(dim):
            acc[i] += vec[i] * weight
        total += weight
    return [v / total for v in acc] if total > 0 else None


def score_rooms(rooms, room_vectors, pref, history_vec, exclude):
    """Lọc cứng ngân sách/bán kính rồi chấm điểm (người dùng seed không chọn lối sống / loại phòng)."""
    scored = []
    budget = pref['budget_max']
    radius = pref['max_radius_km']
    wanted = pref['preferred_amenities']
    for room in rooms:
        if room['id'] in exclude:
            continue
        if budget > 0 and room['price'] > budget:
            continue
        price_score = 0.8 + 0.2 * (1 - room['price'] / budget) if budget > 0 else 1.0
        dist = haversine_distance(pref['target_lat'], pref['target_lng'], room['latitude'], room['longitude'])
        if radius > 0 and dist > radius:
            continue
        dist_score = max(0.0, 1 - dist / max(1.0, radius))
        amen_lower = [a.lower() for a in room['amenities']]
        if wanted:
            room_bits = [1.0 if any(w.lower() in a for a in amen_lower) else 0.0 for w in wanted]
            amenity_score = cosine([1.0] * len(wanted), room_bits)
        else:
            amenity_score = 1.0
        rule = (RULE_WEIGHTS['price'] * price_score
                + RULE_WEIGHTS['distance'] * dist_score
                + RULE_WEIGHTS['amenity'] * amenity_score)
        raw = rule
        if history_vec is not None:
            raw = HYBRID_WEIGHTS['rule'] * rule + HYBRID_WEIGHTS['history'] * cosine(history_vec, room_vectors[room['id']])
        scored.append((min(1.0, max(0.0, js_round4(raw))), room['id']))
    scored.sort(key=lambda item: (-item[0], item[1]))
    return [room_id for _, room_id in scored]


# ----------------------------------------------------------------------------
# 2. ĐỘ ĐO
# ----------------------------------------------------------------------------
def dcg(gains):
    return sum((2 ** g - 1) / math.log2(i + 2) for i, g in enumerate(gains))


def metrics_for_ranking(ranked, gains):
    ideal = sorted(gains.values(), reverse=True)
    out = {'precision': {}, 'recall': {}, 'ndcg': {}, 'hit_rate': {}, 'mrr': 0.0}
    for k in KS:
        top = ranked[:k]
        hits = sum(1 for rid in top if rid in gains)
        out['precision'][k] = hits / k
        out['recall'][k] = hits / len(gains) if gains else 0.0
        out['hit_rate'][k] = 1.0 if hits > 0 else 0.0
        idcg = dcg(ideal[:k])
        out['ndcg'][k] = dcg([gains.get(rid, 0) for rid in top]) / idcg if idcg > 0 else 0.0
    first_hit = next((i for i, rid in enumerate(ranked[:MRR_CUTOFF]) if rid in gains), None)
    out['mrr'] = 1 / (first_hit + 1) if first_hit is not None else 0.0
    return out


def expected_random_metrics(n_candidates, gains):
    """Giá trị kỳ vọng khi xếp ngẫu nhiên đều N ứng viên (tính giải tích, không cần seed)."""
    n, g = n_candidates, len(gains)
    ideal = sorted(gains.values(), reverse=True)
    mean_gain = sum(2 ** v - 1 for v in gains.values()) / n if n > 0 else 0.0
    out = {'precision': {}, 'recall': {}, 'ndcg': {}, 'hit_rate': {}, 'mrr': 0.0}
    for k in KS:
        kk = min(k, n)
        out['precision'][k] = (g / n) * (kk / k) if n > 0 else 0.0
        out['recall'][k] = kk / n if n > 0 else 0.0
        p_miss = 1.0
        for i in range(kk):
            p_miss *= max(0, n - g - i) / (n - i)
        out['hit_rate'][k] = 1 - p_miss
        expected_dcg = sum(mean_gain / math.log2(i + 2) for i in range(kk))
        idcg = dcg(ideal[:k])
        out['ndcg'][k] = expected_dcg / idcg if idcg > 0 else 0.0
    p_no_hit, mrr = 1.0, 0.0
    for i in range(min(MRR_CUTOFF, n)):
        mrr += p_no_hit * (g / (n - i)) / (i + 1)
        p_no_hit *= max(0, n - g - i) / (n - i)
    out['mrr'] = mrr
    return out


# ----------------------------------------------------------------------------
# 3. QUY TRÌNH ĐÁNH GIÁ
# ----------------------------------------------------------------------------
def parse_ts(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()


def temporal_split(logs):
    ordered = sorted(logs, key=lambda log: (log['ts'], log['id']))
    cut = max(1, min(len(ordered) - 1, int(math.floor(len(ordered) * TRAIN_RATIO))))
    return ordered[:cut], ordered[cut:]


def evaluate(dataset):
    rooms = sorted(dataset['rooms'], key=lambda r: r['id'])
    room_by_id = {r['id']: r for r in rooms}
    room_vectors = {r['id']: room_vector(r) for r in rooms}
    users = dataset['users']

    logs_by_user = defaultdict(list)
    for item in dataset['interactions']:
        if item['room_id'] not in room_by_id:
            continue
        logs_by_user[item['user_id']].append({
            'id': item['id'],
            'room_id': item['room_id'],
            'action': item.get('interaction_type') or item.get('action', 'VIEW'),
            'ts': parse_ts(item['timestamp']),
        })

    splits = {}
    for u in users:
        logs = logs_by_user.get(u['id'], [])
        if len(logs) >= 2:
            splits[u['id']] = temporal_split(logs)

    popularity = defaultdict(float)
    for train, _ in splits.values():
        for log in train:
            popularity[log['room_id']] += INTERACTION_WEIGHTS.get(log['action'], 1.0)
    popularity_ranking = [r['id'] for r in sorted(rooms, key=lambda r: (-popularity.get(r['id'], 0.0), r['id']))]

    methods = ['hybrid', 'rule_only', 'popularity', 'random']
    sums = {m: {'precision': defaultdict(float), 'recall': defaultdict(float), 'ndcg': defaultdict(float),
                'hit_rate': defaultdict(float), 'mrr': 0.0} for m in methods}
    evaluated = 0
    counts = {'train': 0, 'test': 0, 'relevant': 0}

    for u in users:
        if u['id'] not in splits:
            continue
        train, test = splits[u['id']]
        counts['train'] += len(train)
        counts['test'] += len(test)
        seen = {log['room_id'] for log in train}
        gains = {}
        for log in test:
            if log['room_id'] in seen:
                continue
            gains[log['room_id']] = max(gains.get(log['room_id'], 0), INTERACTION_WEIGHTS.get(log['action'], 1.0))
        if not gains:
            continue
        evaluated += 1
        counts['relevant'] += len(gains)

        pref = u['preferences']
        history = [(log['room_id'], log['action'])
                   for log in sorted(train, key=lambda log: (log['ts'], log['id']), reverse=True)]
        history_vec = user_history_vector(history, room_by_id, room_vectors)

        results = {
            'hybrid': metrics_for_ranking(score_rooms(rooms, room_vectors, pref, history_vec, seen), gains),
            'rule_only': metrics_for_ranking(score_rooms(rooms, room_vectors, pref, None, seen), gains),
            'popularity': metrics_for_ranking([rid for rid in popularity_ranking if rid not in seen], gains),
            'random': expected_random_metrics(len(rooms) - len(seen), gains),
        }
        for m in methods:
            for key in ('precision', 'recall', 'ndcg', 'hit_rate'):
                for k in KS:
                    sums[m][key][k] += results[m][key][k]
            sums[m]['mrr'] += results[m]['mrr']

    denom = max(evaluated, 1)
    summary = {}
    for m in methods:
        summary[m] = {
            'precision_at_5': round(sums[m]['precision'][5] / denom * 100, 2),
            'precision_at_10': round(sums[m]['precision'][10] / denom * 100, 2),
            'recall_at_5': round(sums[m]['recall'][5] / denom * 100, 2),
            'recall_at_10': round(sums[m]['recall'][10] / denom * 100, 2),
            'ndcg_at_5': round(sums[m]['ndcg'][5] / denom, 4),
            'ndcg_at_10': round(sums[m]['ndcg'][10] / denom, 4),
            'hit_rate_at_5': round(sums[m]['hit_rate'][5] / denom * 100, 2),
            'hit_rate_at_10': round(sums[m]['hit_rate'][10] / denom * 100, 2),
            'mrr_at_10': round(sums[m]['mrr'] / denom, 4),
        }
    return {
        'protocol': 'Temporal hold-out theo từng người dùng (80% học / 20% kiểm tra); '
                    'ground truth = phòng tương tác trong tập kiểm tra, chưa gặp trong tập học; '
                    'ứng viên = toàn bộ phòng trừ phòng đã gặp trong tập học',
        'dataset': {
            'rooms': len(rooms),
            'users_total': len(users),
            'users_evaluated': evaluated,
            'interactions_total': len(dataset['interactions']),
            'train_interactions': counts['train'],
            'test_interactions': counts['test'],
            'relevant_test_rooms': counts['relevant'],
        },
        'methods': summary,
    }


LABELS = {
    'hybrid': 'Hybrid (hệ thống)',
    'rule_only': 'Chỉ Rule-Based',
    'popularity': 'Phổ biến nhất',
    'random': 'Ngẫu nhiên (kỳ vọng)',
}


def print_report(result):
    d = result['dataset']
    print('=== ĐÁNH GIÁ OFFLINE THUẬT TOÁN GỢI Ý TOP-K (KLCN111) ===')
    print(f"Phòng: {d['rooms']} | Người dùng: {d['users_evaluated']}/{d['users_total']} được đánh giá | "
          f"Tương tác: {d['interactions_total']} (học {d['train_interactions']} / kiểm tra {d['test_interactions']})")
    print(f"Quy trình: {result['protocol']}")
    header = f"{'Phương pháp':<24}{'P@5':>8}{'P@10':>8}{'R@10':>8}{'NDCG@5':>9}{'NDCG@10':>9}{'HR@10':>8}{'MRR':>8}"
    print('\n' + header)
    print('-' * len(header))
    for key, label in LABELS.items():
        m = result['methods'][key]
        print(f"{label:<24}{m['precision_at_5']:>7.2f}%{m['precision_at_10']:>7.2f}%{m['recall_at_10']:>7.2f}%"
              f"{m['ndcg_at_5']:>9.4f}{m['ndcg_at_10']:>9.4f}{m['hit_rate_at_10']:>7.2f}%{m['mrr_at_10']:>8.4f}")
    hybrid = result['methods']['hybrid']
    print('\nSo với mục tiêu đề cương:')
    print(f"  Precision@5 = {hybrid['precision_at_5']:.2f}% (mục tiêu >= 70%) -> "
          f"{'ĐẠT' if hybrid['precision_at_5'] >= 70 else 'CHƯA ĐẠT'}")
    print(f"  NDCG@5      = {hybrid['ndcg_at_5']:.4f} (mục tiêu >= 0.75) -> "
          f"{'ĐẠT' if hybrid['ndcg_at_5'] >= 0.75 else 'CHƯA ĐẠT'}")
    print('  Độ trễ p95: đo trên web (trang Admin > Chất lượng gợi ý, hoặc web/scripts/benchmark-recommend-api.mjs)')


def save_chart(result, chart_path):
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
    except ImportError:
        print('Không có matplotlib, bỏ qua bước vẽ biểu đồ.')
        return
    metrics = [('precision_at_5', 'P@5 (%)'), ('precision_at_10', 'P@10 (%)'),
               ('recall_at_10', 'Recall@10 (%)'), ('hit_rate_at_10', 'HitRate@10 (%)')]
    ndcg_metrics = [('ndcg_at_5', 'NDCG@5'), ('ndcg_at_10', 'NDCG@10'), ('mrr_at_10', 'MRR@10')]
    keys = list(LABELS.keys())
    colors = ['#B89C66', '#0F223A', '#64748B', '#CBD5E1']
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))
    width = 0.2
    for idx, key in enumerate(keys):
        xs = [i + (idx - 1.5) * width for i in range(len(metrics))]
        ax1.bar(xs, [result['methods'][key][m] for m, _ in metrics], width, label=LABELS[key], color=colors[idx])
        xs2 = [i + (idx - 1.5) * width for i in range(len(ndcg_metrics))]
        ax2.bar(xs2, [result['methods'][key][m] for m, _ in ndcg_metrics], width, label=LABELS[key], color=colors[idx])
    ax1.set_xticks(range(len(metrics)), [label for _, label in metrics])
    ax1.set_title('Precision / Recall / HitRate (temporal hold-out 80/20)', fontweight='bold')
    ax1.set_ylabel('%')
    ax1.grid(axis='y', linestyle=':', alpha=0.6)
    ax1.legend(fontsize=8)
    ax2.set_xticks(range(len(ndcg_metrics)), [label for _, label in ndcg_metrics])
    ax2.set_title('NDCG / MRR', fontweight='bold')
    ax2.grid(axis='y', linestyle=':', alpha=0.6)
    plt.tight_layout()
    plt.savefig(chart_path, dpi=200)
    print(f'Đã lưu biểu đồ: {chart_path}')


def main():
    parser = argparse.ArgumentParser(description='Đánh giá offline thuật toán gợi ý Top-K')
    parser.add_argument('--data', default=DEFAULT_DATA_PATH, help='Đường dẫn file seed JSON')
    args = parser.parse_args()

    with open(args.data, 'r', encoding='utf-8') as f:
        dataset = json.load(f)

    result = evaluate(dataset)
    print_report(result)

    summary_path = os.path.join(SCRIPT_DIR, 'evaluation_summary.json')
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f'Đã lưu kết quả: {summary_path}')
    save_chart(result, os.path.join(SCRIPT_DIR, 'metrics_evaluation_chart.png'))


if __name__ == '__main__':
    main()
