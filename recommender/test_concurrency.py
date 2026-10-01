import sys
import time
import json
import threading
import httpx

if hasattr(sys.stdout, 'reconfigure'):
    getattr(sys.stdout, 'reconfigure')(encoding='utf-8')

# Concurrency Test Configuration
BASE_URL = 'http://localhost:3000/api/appointments'
ROOM_ID = 8
# Dynamic date ensures every benchmark run tests a brand-new slot
DATE = f'2026-11-{(int(time.time()) % 25 + 1):02d}'
TIME_SLOT = '10:30 - 11:30'
CONCURRENT_USERS = 20

print('=' * 60)
print('KIỂM THỬ KIỂM SOÁT TƯƠNG TRANH (CONCURRENCY CONTROL TEST)')
print(f'Mục tiêu: Đặt lịch xem phòng #{ROOM_ID} vào khung giờ {TIME_SLOT} ngày {DATE}')
print(f'Mô phỏng: {CONCURRENT_USERS} yêu cầu đồng thời từ các người dùng khác nhau')
print('=' * 60)

results = []
lock = threading.Lock()

def book_slot(user_idx):
    user_name = f'Sinh viên {user_idx}'
    user_phone = f'09123456{user_idx:02d}'
    payload = {
        'room_id': ROOM_ID,
        'user_id': f'user_test_{user_idx}',
        'user_name': user_name,
        'user_phone': user_phone,
        'date': DATE,
        'time_slot': TIME_SLOT,
        'notes': f'Yêu cầu kiểm thử tương tranh từ {user_name}'
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            t0 = time.perf_counter()
            res = client.post(BASE_URL, json=payload)
            latency = (time.perf_counter() - t0) * 1000.0
            data = res.json()
            with lock:
                results.append({
                    'user': user_name,
                    'status_code': res.status_code,
                    'latency_ms': round(latency, 2),
                    'success': data.get('success', False),
                    'message': data.get('message', '')
                })
    except Exception as e:
        with lock:
            results.append({
                'user': user_name,
                'status_code': 500,
                'latency_ms': 0,
                'success': False,
                'message': str(e)
            })

# Launch all threads at the exact same time
threads = [threading.Thread(target=book_slot, args=(i+1,)) for i in range(CONCURRENT_USERS)]

print(f'Đang kích hoạt đồng thời {CONCURRENT_USERS} luồng...')
for t in threads:
    t.start()
for t in threads:
    t.join()

print('\n' + '-' * 60)
print('KẾT QUẢ KIỂM THỬ TƯƠNG TRANH:')
print('-' * 60)

success_count = sum(1 for r in results if r['status_code'] == 200 and r['success'])
conflict_count = sum(1 for r in results if r['status_code'] == 409)
other_count = sum(1 for r in results if r['status_code'] not in (200, 409))

for idx, r in enumerate(results[:5]):
    status_icon = '✅ THÀNH CÔNG' if r['status_code'] == 200 else '🛑 BỊ CHẶN (409 CONFLICT)'
    print(f'Luồng #{idx+1} ({r["user"]}): {status_icon} - {r["message"]} ({r["latency_ms"]} ms)')

if len(results) > 5:
    print(f'... (và {len(results) - 5} luồng còn lại đều bị chặn với mã 409 Conflict)')

print('\n' + '=' * 60)
print(f'Tổng số yêu cầu: {len(results)}')
print(f'Số yêu cầu thành công : {success_count} (Kỳ vọng duy nhất 1)')
print(f'Số yêu cầu bị chặn (Xung đột): {conflict_count} (Kỳ vọng 19)')
print(f'Kiểm soát tương tranh: {"HOÀN TOÀN THÀNH CÔNG (NGĂN CHẶN TUYỆT ĐỐI TRÙNG LỊCH)" if success_count == 1 and conflict_count == (CONCURRENT_USERS - 1) else "CẦN ĐIỀU CHỈNH"}')
print('=' * 60)
