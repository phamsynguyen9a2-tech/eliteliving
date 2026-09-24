import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

// Configurable backend URL: use 10.0.2.2 for Android Emulator, or localhost for Windows/Web
const String kBaseUrl = 'http://localhost:3000';

void main() {
  runApp(const SmartTroApp());
}

class SmartTroApp extends StatelessWidget {
  const SmartTroApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartTro - Khóa luận KLCN111',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          primary: const Color(0xFF2563EB),
          surface: const Color(0xFFF8FAFC),
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 1,
          iconTheme: IconThemeData(color: Color(0xFF0F172A)),
          titleTextStyle: TextStyle(
            color: Color(0xFF0F172A),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      home: const MainNavigationScreen(),
    );
  }
}

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const HomeScreen(),
    const ExploreRoomsScreen(),
    const MyAppointmentsScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: Colors.white,
        elevation: 8,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: Color(0xFF2563EB)),
            label: 'Trang chủ',
          ),
          NavigationDestination(
            icon: Icon(Icons.search_outlined),
            selectedIcon: Icon(Icons.search, color: Color(0xFF2563EB)),
            label: 'Tìm phòng',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month, color: Color(0xFF2563EB)),
            label: 'Lịch hẹn',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: Color(0xFF2563EB)),
            label: 'Cá nhân',
          ),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// 1. HOME SCREEN (With Top-K Recommendations & Highlights)
// -------------------------------------------------------------
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<dynamic> _topKRooms = [];
  List<dynamic> _recentRooms = [];
  bool _isLoading = true;
  String _selectedDistrict = 'all';

  final NumberFormat _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      // 1. Fetch Top-K recommendations
      final recRes = await http.get(Uri.parse('$kBaseUrl/api/rooms/recommend?k=5&budget=5500000'));
      if (recRes.statusCode == 200) {
        final data = jsonDecode(utf8.decode(recRes.bodyBytes));
        if (data['success']) {
          _topKRooms = data['data'];
        }
      }

      // 2. Fetch list of rooms
      final roomsRes = await http.get(Uri.parse('$kBaseUrl/api/rooms?limit=10&district=$_selectedDistrict'));
      if (roomsRes.statusCode == 200) {
        final data = jsonDecode(utf8.decode(roomsRes.bodyBytes));
        if (data['success']) {
          _recentRooms = data['data']['items'];
        }
      }
    } catch (e) {
      debugPrint('Error loading data: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.location_on, size: 16, color: Colors.redAccent),
                const SizedBox(width: 4),
                Text(
                  'Khu vực ĐH Công Thương (HUIT)',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontWeight: FontWeight.normal),
                ),
              ],
            ),
            const Text('SmartTro TP.HCM', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none),
            onPressed: () {},
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.only(bottom: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Search bar trigger
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey.shade200),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 4)),
                          ],
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.search, color: Colors.grey.shade500),
                            const SizedBox(width: 10),
                            Text(
                              'Tìm đường, quận, gác lửng, giá rẻ...',
                              style: TextStyle(color: Colors.grey.shade400, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // TOP-K RECOMMENDATION BANNER & CAROUSEL (CLO3)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF1E3A8A), Color(0xFF3B82F6)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.auto_awesome, color: Colors.amberAccent, size: 18),
                                    SizedBox(width: 6),
                                    Text(
                                      'Gợi ý Top-K dành cho bạn',
                                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Text(
                                    'P@5 ≥ 74%',
                                    style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Tính toán theo Weighted Rule-Based & Cosine Similarity',
                              style: TextStyle(color: Colors.blue.shade100, fontSize: 11),
                            ),
                            const SizedBox(height: 14),

                            // Top-K horizontal list
                            SizedBox(
                              height: 200,
                              child: ListView.separated(
                                scrollDirection: Axis.horizontal,
                                itemCount: _topKRooms.length,
                                separatorBuilder: (_, index) => const SizedBox(width: 12),
                                itemBuilder: (context, index) {
                                  final room = _topKRooms[index];
                                  final matchScore = ((room['score'] ?? 0.85) * 100).round();
                                  final images = room['images'] as List<dynamic>?;
                                  final imageUrl = (images != null && images.isNotEmpty)
                                      ? images[0]
                                      : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600';

                                  return GestureDetector(
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => RoomDetailScreen(room: room),
                                        ),
                                      );
                                    },
                                    child: Container(
                                      width: 160,
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(16),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.1),
                                            blurRadius: 6,
                                            offset: const Offset(0, 3),
                                          ),
                                        ],
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Stack(
                                            children: [
                                              ClipRRect(
                                                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                                                child: Image.network(
                                                  imageUrl,
                                                  height: 100,
                                                  width: 160,
                                                  fit: BoxFit.cover,
                                                ),
                                              ),
                                              Positioned(
                                                top: 6,
                                                left: 6,
                                                child: Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: Colors.blue.shade700,
                                                    borderRadius: BorderRadius.circular(8),
                                                  ),
                                                  child: Text(
                                                    '$matchScore% phù hợp',
                                                    style: const TextStyle(
                                                        color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                          Padding(
                                            padding: const EdgeInsets.all(8.0),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  room['title'] ?? '',
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  room['address'] ?? '',
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: TextStyle(color: Colors.grey.shade600, fontSize: 10),
                                                ),
                                                const SizedBox(height: 6),
                                                Text(
                                                  _currencyFormat.format(room['price'] ?? 0),
                                                  style: const TextStyle(
                                                    color: Color(0xFF2563EB),
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 12,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),

                    // District filter chips
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Khám phá theo quận',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 10),
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                _buildFilterChip('all', 'Tất cả'),
                                _buildFilterChip('tân phú', 'Quận Tân Phú'),
                                _buildFilterChip('tân bình', 'Quận Tân Bình'),
                                _buildFilterChip('gò vấp', 'Quận Gò Vấp'),
                                _buildFilterChip('quận 10', 'Quận 10'),
                                _buildFilterChip('thủ đức', 'Thủ Đức'),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 18),

                    // Rooms List
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Phòng mới đăng tải (EzHouse)',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          Text(
                            '${_recentRooms.length} phòng',
                            style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 10),

                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _recentRooms.length,
                      itemBuilder: (context, index) {
                        final room = _recentRooms[index];
                        final images = room['images'] as List<dynamic>?;
                        final imageUrl = (images != null && images.isNotEmpty)
                            ? images[0]
                            : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600';

                        return GestureDetector(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => RoomDetailScreen(room: room)),
                            );
                          },
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: Row(
                              children: [
                                ClipRRect(
                                  borderRadius: const BorderRadius.horizontal(left: Radius.circular(16)),
                                  child: Image.network(
                                    imageUrl,
                                    width: 110,
                                    height: 100,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          room['title'] ?? '',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          room['address'] ?? '',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
                                        ),
                                        const SizedBox(height: 6),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              _currencyFormat.format(room['price'] ?? 0),
                                              style: const TextStyle(
                                                color: Color(0xFF2563EB),
                                                fontWeight: FontWeight.bold,
                                                fontSize: 13,
                                              ),
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: Colors.green.shade50,
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                '${room['area'] ?? 25} m²',
                                                style: TextStyle(
                                                    color: Colors.green.shade700,
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.bold),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildFilterChip(String slug, String label) {
    final isSelected = _selectedDistrict == slug;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (val) {
          setState(() {
            _selectedDistrict = slug;
          });
          _loadData();
        },
        selectedColor: const Color(0xFF2563EB),
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : Colors.black87,
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
        backgroundColor: Colors.white,
        side: BorderSide(color: isSelected ? const Color(0xFF2563EB) : Colors.grey.shade300),
      ),
    );
  }
}

// -------------------------------------------------------------
// 2. ROOM DETAIL & BOOKING SCREEN
// -------------------------------------------------------------
class RoomDetailScreen extends StatefulWidget {
  final Map<String, dynamic> room;
  const RoomDetailScreen({super.key, required this.room});

  @override
  State<RoomDetailScreen> createState() => _RoomDetailScreenState();
}

class _RoomDetailScreenState extends State<RoomDetailScreen> {
  final NumberFormat _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

  void _openBookingSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => BookingBottomSheet(room: widget.room),
    );
  }

  @override
  Widget build(BuildContext context) {
    final room = widget.room;
    final images = (room['images'] as List<dynamic>?) ?? [];
    final amenities = (room['amenities'] as List<dynamic>?) ?? [];

    return Scaffold(
      appBar: AppBar(
        title: Text(room['room_code'] ?? 'Chi tiết phòng'),
        actions: [
          IconButton(icon: const Icon(Icons.share_outlined), onPressed: () {}),
          IconButton(icon: const Icon(Icons.favorite_border), onPressed: () {}),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -2)),
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Giá thuê phòng', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  Text(
                    _currencyFormat.format(room['price'] ?? 0),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                  ),
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: _openBookingSheet,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Đặt Lịch Xem Phòng', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Carousel
            if (images.isNotEmpty)
              SizedBox(
                height: 250,
                child: PageView.builder(
                  itemCount: images.length,
                  itemBuilder: (context, idx) {
                    return Image.network(
                      images[idx],
                      width: double.infinity,
                      fit: BoxFit.cover,
                    );
                  },
                ),
              ),

            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title & Address
                  Text(
                    room['title'] ?? '',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 16, color: Colors.redAccent),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          room['address'] ?? '',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Room Specs Grid
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildSpecItem(Icons.square_foot, 'Diện tích', '${room['area'] ?? 25} m²'),
                        _buildSpecItem(Icons.meeting_room, 'Loại phòng', room['room_type'] ?? 'Có gác'),
                        _buildSpecItem(Icons.security, 'Cọc phòng', _currencyFormat.format(room['deposit'] ?? room['price'])),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Utilities table
                  const Text('Bảng giá dịch vụ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      children: [
                        _buildFeeRow('⚡ Tiền điện', '${room['electricity_rate'] ?? 3800} đ/kWh'),
                        const Divider(height: 16),
                        _buildFeeRow('💧 Tiền nước', '25.000 đ/m³ (hoặc 100k/người)'),
                        const Divider(height: 16),
                        _buildFeeRow('🌐 Wifi / Internet', '${room['internet_fee'] ?? 100000} đ/phòng'),
                        const Divider(height: 16),
                        _buildFeeRow('🧹 Phí dịch vụ & Quản lý', '${room['service_fee'] ?? 150000} đ/tháng'),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Amenities
                  const Text('Tiện ích & Nội thất', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: amenities.map((a) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.check_circle, size: 14, color: Color(0xFF2563EB)),
                            const SizedBox(width: 6),
                            Text(
                              a.toString(),
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF1E3A8A)),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 20),

                  // Description
                  const Text('Mô tả chi tiết', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 6),
                  Text(
                    room['description'] ?? 'Phòng mới đẹp, giờ giấc tự do, an ninh 24/7.',
                    style: TextStyle(color: Colors.grey.shade700, fontSize: 13, height: 1.5),
                  ),

                  const SizedBox(height: 20),

                  // Landlord contact card
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: const Color(0xFF2563EB),
                          child: Text(
                            (room['landlord_name'] ?? 'C')[0],
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(room['landlord_name'] ?? 'Chủ trọ', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              Text('SĐT: ${room['landlord_phone'] ?? '0903123456'}', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.phone, color: Colors.green),
                          onPressed: () {},
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSpecItem(IconData icon, String title, String value) {
    return Column(
      children: [
        Icon(icon, size: 20, color: const Color(0xFF2563EB)),
        const SizedBox(height: 4),
        Text(title, style: TextStyle(color: Colors.grey.shade500, fontSize: 10)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
      ],
    );
  }

  Widget _buildFeeRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
      ],
    );
  }
}

// -------------------------------------------------------------
// 3. BOOKING BOTTOM SHEET WITH CONCURRENCY CONTROL
// -------------------------------------------------------------
class BookingBottomSheet extends StatefulWidget {
  final Map<String, dynamic> room;
  const BookingBottomSheet({super.key, required this.room});

  @override
  State<BookingBottomSheet> createState() => _BookingBottomSheetState();
}

class _BookingBottomSheetState extends State<BookingBottomSheet> {
  final TextEditingController _nameController = TextEditingController(text: 'Phạm Sỹ Nguyên');
  final TextEditingController _phoneController = TextEditingController(text: '0918526619');
  final String _selectedDate = '2026-09-28';
  String _selectedTimeSlot = '09:30 - 10:30';
  bool _isLoading = false;
  String? _errorMessage;
  String? _successMessage;

  final List<String> _slots = [
    '08:30 - 09:30',
    '09:30 - 10:30',
    '10:30 - 11:30',
    '14:00 - 15:00',
    '15:30 - 16:30',
    '17:00 - 18:00',
  ];

  Future<void> _submitBooking() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/appointments'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'room_id': widget.room['id'],
          'user_id': 'mobile_tenant_1',
          'user_name': _nameController.text,
          'user_phone': _phoneController.text,
          'date': _selectedDate,
          'time_slot': _selectedTimeSlot,
          'notes': 'Đặt hẹn qua Mobile App Flutter'
        }),
      );

      final data = jsonDecode(utf8.decode(res.bodyBytes));

      if (res.statusCode == 409) {
        // Concurrency control conflict
        setState(() {
          _errorMessage = '⚠️ [Concurrency Control] Khung giờ này vừa có người đặt trước! Vui lòng chọn khung giờ khác.';
        });
      } else if (res.statusCode == 200 && data['success']) {
        setState(() {
          _successMessage = '✅ Đặt lịch xem phòng thành công! Chủ trọ sẽ liên hệ.';
        });
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) Navigator.pop(context);
        });
      } else {
        setState(() {
          _errorMessage = data['message'] ?? 'Đặt lịch thất bại.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Lỗi kết nối đến máy chủ: $e';
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Đặt lịch xem phòng', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const Text(
              'Kiểm soát tương tranh: Tránh trùng lặp khung giờ xem phòng',
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
            const SizedBox(height: 16),

            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(10),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(10)),
                child: Text(_errorMessage!, style: TextStyle(color: Colors.red.shade800, fontSize: 12)),
              ),

            if (_successMessage != null)
              Container(
                padding: const EdgeInsets.all(10),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(10)),
                child: Text(_successMessage!, style: TextStyle(color: Colors.green.shade800, fontSize: 12)),
              ),

            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Họ và tên người xem',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Số điện thoại',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),

            const Text('Khung giờ rảnh:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _slots.map((s) {
                final isSel = _selectedTimeSlot == s;
                return ChoiceChip(
                  label: Text(s, style: TextStyle(fontSize: 11, color: isSel ? Colors.white : Colors.black87)),
                  selected: isSel,
                  selectedColor: const Color(0xFF2563EB),
                  onSelected: (_) => setState(() => _selectedTimeSlot = s),
                );
              }).toList(),
            ),

            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _submitBooking,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Xác nhận đặt lịch hẹn', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// -------------------------------------------------------------
// 4. EXPLORE / SEARCH SCREEN
// -------------------------------------------------------------
class ExploreRoomsScreen extends StatelessWidget {
  const ExploreRoomsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tìm kiếm & Lọc phòng')),
      body: const Center(
        child: Text('Chức năng tìm kiếm nâng cao đa tiêu chí'),
      ),
    );
  }
}

// -------------------------------------------------------------
// 5. APPOINTMENTS SCREEN
// -------------------------------------------------------------
class MyAppointmentsScreen extends StatelessWidget {
  const MyAppointmentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lịch hẹn xem phòng của tôi')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Phòng 507 - Quận 12', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    Chip(
                      label: Text('Đã xác nhận', style: TextStyle(fontSize: 10, color: Colors.green)),
                      backgroundColor: Color(0xFFE8F5E9),
                    ),
                  ],
                ),
                SizedBox(height: 6),
                Text('Thời gian: 09:30 - 10:30, Ngày 28/09/2026', style: TextStyle(fontSize: 12, color: Colors.black87)),
                Text('Chủ trọ: Nguyễn Văn Hùng (0903123456)', style: TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// 6. PROFILE SCREEN
// -------------------------------------------------------------
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hồ sơ cá nhân')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Center(
            child: CircleAvatar(
              radius: 40,
              backgroundColor: Color(0xFF2563EB),
              child: Text('N', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(height: 12),
          const Center(
            child: Text('Phạm Sỹ Nguyên', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ),
          const Center(
            child: Text('MSSV: 2001230583 • Lớp: 14DHTH04', style: TextStyle(color: Colors.grey, fontSize: 12)),
          ),
          const SizedBox(height: 24),
          const ListTile(
            leading: Icon(Icons.tune, color: Color(0xFF2563EB)),
            title: Text('Thiết lập tiêu chí gợi ý Top-K'),
            subtitle: Text('Ngân sách, bán kính di chuyển, tiện ích'),
            trailing: Icon(Icons.chevron_right),
          ),
          const Divider(),
          const ListTile(
            leading: Icon(Icons.assignment, color: Color(0xFF2563EB)),
            title: Text('Đề tài Khóa Luận Tốt Nghiệp'),
            subtitle: Text('Mã đề tài: CNTT-KLCN111 - GVHD: Phan Thị Ngọc Mai'),
          ),
        ],
      ),
    );
  }
}
