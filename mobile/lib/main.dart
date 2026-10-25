import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

import 'auth.dart';
import 'auth_screen.dart';
import 'bill_reminder.dart';
import 'roommate_screens.dart';
import 'account_screens.dart';
import 'explore_screen.dart';
import 'rental_screens.dart';
import 'tenant_api.dart';
import 'ui_kit.dart' show showSnack;
import 'nearby_screen.dart';
import 'preferences_screen.dart';
import 'push_service.dart';
import 'reschedule_sheet.dart';

// Configurable backend URL: 10.0.2.2 for Android Emulator, localhost for Windows/Web.
// Override for a real phone: flutter run --dart-define=API_BASE_URL=http://<LAN-IP>:3000
const String _kApiBaseUrlOverride = String.fromEnvironment('API_BASE_URL');
final String kBaseUrl = _kApiBaseUrlOverride.isNotEmpty
    ? _kApiBaseUrlOverride
    : (!kIsWeb && defaultTargetPlatform == TargetPlatform.android)
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

abstract final class EliteColors {
  static const champagne = Color(0xFFB89C66);
  static const champagneHover = Color(0xFFA38752);
  static const deepNavy = Color(0xFF0F223A);
  static const canvas = Color(0xFFF8F8F6);
  static const border = Color(0xFFE5E3DE);
}

class TenantAppointment {
  const TenantAppointment({
    required this.id,
    required this.roomTitle,
    required this.date,
    required this.timeSlot,
    required this.status,
    this.roomId,
    this.landlordName,
    this.landlordPhone,
  });

  final String id;
  final int? roomId;
  final String roomTitle;
  final DateTime date;
  final String timeSlot;
  final String status;
  final String? landlordName;
  final String? landlordPhone;
}

abstract final class TenantAppointmentStore {
  static final ValueNotifier<List<TenantAppointment>> appointments =
      ValueNotifier<List<TenantAppointment>>(<TenantAppointment>[]);

  static void add(TenantAppointment appointment) {
    appointments.value = <TenantAppointment>[
      appointment,
      ...appointments.value.where((item) => item.id != appointment.id),
    ];
  }

  /// Loads the signed-in tenant's appointments from the backend
  /// (GET /api/appointments filters by the session user), or clears the
  /// list after logout.
  static Future<void> syncWithAccount(AuthUser? user) async {
    if (user == null) {
      appointments.value = <TenantAppointment>[];
      return;
    }
    try {
      final res = await http
          .get(
            Uri.parse('$kBaseUrl/api/appointments'),
            headers: AuthService.authHeaders,
          )
          .timeout(const Duration(seconds: 15));
      if (res.statusCode != 200) return;
      final body = jsonDecode(utf8.decode(res.bodyBytes));
      if (body is! Map || body['success'] != true || body['data'] is! List) {
        return;
      }
      appointments.value = [
        for (final raw in body['data'] as List)
          if (raw is Map)
            TenantAppointment(
              id: '${raw['id']}',
              roomId: (raw['room_id'] as num?)?.toInt(),
              roomTitle:
                  raw['room_title'] ??
                  raw['room_code'] ??
                  'Phòng #${raw['room_id']}',
              date: DateTime.tryParse('${raw['date']}') ?? DateTime.now(),
              timeSlot: '${raw['time_slot'] ?? ''}',
              status: '${raw['status'] ?? 'PENDING'}',
            ),
      ];
    } catch (e) {
      debugPrint('Appointment sync failed: $e');
    }
  }
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  AuthService.currentUser.addListener(() {
    TenantAppointmentStore.syncWithAccount(AuthService.currentUser.value);
    BillReminderStore.refresh();
  });
  // Restore the saved login in the background so a slow backend never blocks startup.
  AuthService.restore();
  FavoritesStore.load();
  // Thông báo đẩy FCM (chỉ chạy khi đã cấu hình Firebase qua --dart-define)
  PushService.init();
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
          seedColor: EliteColors.champagne,
          primary: EliteColors.champagne,
          secondary: EliteColors.deepNavy,
          surface: EliteColors.canvas,
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: EliteColors.canvas,
        appBarTheme: const AppBarTheme(
          backgroundColor: EliteColors.canvas,
          foregroundColor: EliteColors.deepNavy,
          elevation: 0,
          scrolledUnderElevation: 0,
          iconTheme: IconThemeData(color: EliteColors.deepNavy),
          titleTextStyle: TextStyle(
            color: EliteColors.deepNavy,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: Colors.white,
          indicatorColor: EliteColors.champagne.withValues(alpha: 0.16),
          iconTheme: WidgetStateProperty.resolveWith((states) {
            return IconThemeData(
              color: states.contains(WidgetState.selected)
                  ? EliteColors.champagneHover
                  : EliteColors.deepNavy.withValues(alpha: 0.62),
            );
          }),
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            return TextStyle(
              color: states.contains(WidgetState.selected)
                  ? EliteColors.deepNavy
                  : EliteColors.deepNavy.withValues(alpha: 0.62),
              fontSize: 11,
              fontWeight: states.contains(WidgetState.selected)
                  ? FontWeight.w700
                  : FontWeight.w500,
            );
          }),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          labelStyle: const TextStyle(color: EliteColors.deepNavy),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: EliteColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(
              color: EliteColors.champagne,
              width: 1.5,
            ),
          ),
        ),
        dividerTheme: const DividerThemeData(
          color: EliteColors.border,
          thickness: 1,
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
  bool _billBannerShown = false;

  @override
  void initState() {
    super.initState();
    BillReminderStore.state.addListener(_maybeShowBillBanner);
    PushService.foregroundMessage.addListener(_onPushMessage);
  }

  @override
  void dispose() {
    BillReminderStore.state.removeListener(_maybeShowBillBanner);
    PushService.foregroundMessage.removeListener(_onPushMessage);
    super.dispose();
  }

  /// Thông báo đẩy đến khi app đang mở: hiện SnackBar và đồng bộ lịch hẹn / hóa đơn ngay.
  void _onPushMessage() {
    final message = PushService.foregroundMessage.value;
    if (message == null || !mounted) return;
    final title = message.notification?.title ?? 'Thông báo mới';
    final body = message.notification?.body ?? '';
    TenantAppointmentStore.syncWithAccount(AuthService.currentUser.value);
    BillReminderStore.refresh();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(body.isEmpty ? title : '$title: $body'),
        action: SnackBarAction(
          label: 'Xem',
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const NotificationsScreen()),
          ),
        ),
      ),
    );
  }

  /// Shown once per app launch when there are new or overdue bills.
  void _maybeShowBillBanner() {
    final reminder = BillReminderStore.state.value;
    if (_billBannerShown || !reminder.needsAttention || !mounted) return;
    _billBannerShown = true;
    final overdue = reminder.overdue;
    final message = overdue.isNotEmpty
        ? 'Bạn có ${overdue.length} hóa đơn quá hạn '
              '(lâu nhất ${overdue.first.daysOverdue()} ngày). '
              'Phí phạt 50.000đ/ngày theo nội quy.'
        : 'Bạn có ${reminder.newCount} hóa đơn mới cần thanh toán.';
    final messenger = ScaffoldMessenger.of(context);
    messenger.showMaterialBanner(
      MaterialBanner(
        backgroundColor: overdue.isNotEmpty
            ? const Color(0xFFFDECEA)
            : const Color(0xFFFFF4E5),
        leading: Icon(
          overdue.isNotEmpty
              ? Icons.warning_amber_rounded
              : Icons.receipt_long_rounded,
          color: overdue.isNotEmpty
              ? const Color(0xFFC0392B)
              : EliteColors.champagneHover,
        ),
        content: Text(
          message,
          style: const TextStyle(color: EliteColors.deepNavy, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: messenger.hideCurrentMaterialBanner,
            child: const Text('Để sau'),
          ),
          FilledButton(
            onPressed: () {
              messenger.hideCurrentMaterialBanner();
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const RentalHubScreen()),
              );
            },
            style: FilledButton.styleFrom(
              backgroundColor: EliteColors.champagne,
            ),
            child: const Text('Xem hóa đơn'),
          ),
        ],
      ),
    );
  }

  final List<Widget> _screens = [
    const HomeScreen(),
    const ExploreRoomsScreen(),
    const RoommateScreen(),
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
        elevation: 0,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Trang chủ',
          ),
          NavigationDestination(
            icon: Icon(Icons.travel_explore_outlined),
            selectedIcon: Icon(Icons.travel_explore_rounded),
            label: 'Tìm phòng',
          ),
          NavigationDestination(
            icon: Icon(Icons.groups_outlined),
            selectedIcon: Icon(Icons.groups_rounded),
            label: 'Ở ghép',
          ),
          NavigationDestination(
            icon: Icon(Icons.event_note_outlined),
            selectedIcon: Icon(Icons.event_note_rounded),
            label: 'Lịch hẹn',
          ),
          NavigationDestination(
            icon: _BillBadge(child: Icon(Icons.account_circle_outlined)),
            selectedIcon: _BillBadge(child: Icon(Icons.account_circle_rounded)),
            label: 'Cá nhân',
          ),
        ],
      ),
    );
  }
}

/// Red-dot count of new or overdue bills, driven by [BillReminderStore].
class _BillBadge extends StatelessWidget {
  const _BillBadge({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<BillReminderState>(
      valueListenable: BillReminderStore.state,
      builder: (context, reminder, _) => Badge(
        isLabelVisible: reminder.needsAttention,
        label: Text('${reminder.badgeCount}'),
        backgroundColor: reminder.overdue.isNotEmpty
            ? const Color(0xFFC0392B)
            : EliteColors.champagneHover,
        child: child,
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
  // Mã lượt hiển thị danh sách gợi ý (gửi kèm khi mở / đặt lịch phòng để đo CTR)
  String? _recommendationId;
  List<dynamic> _recentRooms = [];
  bool _isLoading = true;
  bool _recommendationsLoading = true;
  bool _recentRoomsLoading = true;
  int _homeLoadVersion = 0;
  String? _loadError;
  String _selectedDistrict = 'all';

  final NumberFormat _currencyFormat = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: 'đ',
  );

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    final loadVersion = ++_homeLoadVersion;
    final district = _selectedDistrict;
    setState(() {
      _isLoading = _topKRooms.isEmpty && _recentRooms.isEmpty;
      _recommendationsLoading = true;
      _recentRoomsLoading = true;
      _loadError = null;
    });
    // Local compilation and a cold database connection can exceed 15 seconds.
    const timeout = Duration(seconds: 45);
    final errors = <String>[];

    Future<void> loadSection(Uri uri, {required bool recommendations}) async {
      final label = recommendations ? 'Gợi ý Top-K' : 'Danh sách phòng';
      dynamic data;
      try {
        // Gửi kèm phiên đăng nhập để gợi ý được cá nhân hóa theo hồ sơ nhu cầu + lịch sử xem/lưu/đặt lịch
        final response = await http
            .get(uri, headers: AuthService.authHeaders)
            .timeout(timeout);
        if (!mounted || loadVersion != _homeLoadVersion) return;
        data = _decodeSuccess(response, label, errors);
        if (recommendations) {
          try {
            final body = jsonDecode(utf8.decode(response.bodyBytes));
            final meta = body is Map ? body['metadata'] : null;
            _recommendationId =
                meta is Map ? meta['recommendation_id'] as String? : null;
          } catch (_) {
            _recommendationId = null;
          }
        }
      } on TimeoutException {
        errors.add('$label: máy chủ phản hồi chậm. Vui lòng thử lại.');
      } catch (e) {
        debugPrint('Error loading $label: $e');
        errors.add('$label: không kết nối được máy chủ. Vui lòng thử lại.');
      }
      if (!mounted || loadVersion != _homeLoadVersion) return;
      setState(() {
        if (recommendations) {
          if (data is List) _topKRooms = data;
          _recommendationsLoading = false;
        } else {
          if (data is Map && data['items'] is List) {
            _recentRooms = data['items'];
          }
          _recentRoomsLoading = false;
        }
        _loadError = errors.isEmpty ? null : errors.join('\n');
        _isLoading = false;
      });
    }

    // Each section renders as soon as it completes, even if the other fails.
    await Future.wait([
      loadSection(
        Uri.parse(
          '$kBaseUrl/api/rooms/recommend',
        ).replace(queryParameters: {'k': '5', 'source': 'MOBILE_HOME'}),
        recommendations: true,
      ),
      loadSection(
        Uri.parse(
          '$kBaseUrl/api/rooms',
        ).replace(
          queryParameters: {'limit': '10', 'district': district, 'log': '0'},
        ),
        recommendations: false,
      ),
    ]);
  }

  /// Returns `data` from a `{success: true, data: ...}` response, or records
  /// a readable error (e.g. 404 when the wrong backend is running).
  dynamic _decodeSuccess(http.Response res, String label, List<String> errors) {
    if (res.statusCode != 200) {
      errors.add('$label: máy chủ trả về HTTP ${res.statusCode}');
      return null;
    }
    try {
      final body = jsonDecode(utf8.decode(res.bodyBytes));
      if (body is Map && body['success'] == true) return body['data'];
      errors.add(
        '$label: ${body is Map ? body['message'] ?? 'phản hồi không hợp lệ' : 'phản hồi không hợp lệ'}',
      );
    } on FormatException {
      errors.add('$label: phản hồi không phải JSON');
    }
    return null;
  }

  Widget _buildLoadErrorBanner() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF4E5),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: EliteColors.champagne),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(
                  Icons.cloud_off_rounded,
                  color: EliteColors.champagneHover,
                  size: 18,
                ),
                SizedBox(width: 6),
                Text(
                  'Không tải được dữ liệu',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: EliteColors.deepNavy,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              _loadError!,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 4),
            Text(
              'Kiểm tra kết nối và bấm Thử lại để tải phần dữ liệu còn thiếu.',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: _loadData,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Thử lại'),
                style: TextButton.styleFrom(
                  foregroundColor: EliteColors.champagneHover,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyHint(String text, {Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      child: Center(
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, color: color ?? Colors.grey.shade500),
        ),
      ),
    );
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
                const Icon(
                  Icons.location_on_rounded,
                  size: 16,
                  color: EliteColors.champagne,
                ),
                const SizedBox(width: 4),
                Text(
                  'Khu vực ĐH Công Thương (HUIT)',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.normal,
                  ),
                ),
              ],
            ),
            const Text(
              'SmartTro TP.HCM',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded),
            tooltip: 'Thông báo',
            onPressed: () {
              if (!AuthService.isSignedIn) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Đăng nhập để xem thông báo.')),
                );
                return;
              }
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
              );
            },
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
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: EliteColors.border),
                          boxShadow: [
                            BoxShadow(
                              color: EliteColors.champagne.withValues(
                                alpha: 0.12,
                              ),
                              blurRadius: 14,
                              offset: const Offset(0, 5),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.search_rounded,
                              color: EliteColors.champagneHover,
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Tìm đường, quận, gác lửng, giá rẻ...',
                              style: TextStyle(
                                color: Colors.grey.shade400,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Tìm phòng quanh vị trí GPS hiện tại
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      child: OutlinedButton.icon(
                        onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const NearbyRoomsScreen(),
                          ),
                        ),
                        icon: const Icon(Icons.near_me_rounded),
                        label: const Text('Tìm phòng gần vị trí của tôi'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: EliteColors.deepNavy,
                          side: const BorderSide(color: EliteColors.champagne),
                          minimumSize: const Size.fromHeight(44),
                        ),
                      ),
                    ),

                    if (_loadError != null) _buildLoadErrorBanner(),

                    // TOP-K RECOMMENDATION BANNER & CAROUSEL (CLO3)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [
                              EliteColors.deepNavy,
                              EliteColors.champagneHover,
                            ],
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
                                    Icon(
                                      Icons.auto_awesome_rounded,
                                      color: EliteColors.champagne,
                                      size: 18,
                                    ),
                                    SizedBox(width: 6),
                                    Text(
                                      'Gợi ý Top-K dành cho bạn',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15,
                                      ),
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 3,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Text(
                                    'Cá nhân hóa',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Theo hồ sơ nhu cầu và lịch sử xem, lưu, đặt lịch của bạn',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.82),
                                fontSize: 11,
                              ),
                            ),
                            const SizedBox(height: 14),

                            // Top-K horizontal list
                            if (_recommendationsLoading)
                              _buildEmptyHint(
                                'Đang tải gợi ý phòng…',
                                color: Colors.white.withValues(alpha: 0.82),
                              )
                            else if (_topKRooms.isEmpty)
                              _buildEmptyHint(
                                'Chưa có gợi ý phù hợp. Kéo xuống để tải lại.',
                                color: Colors.white.withValues(alpha: 0.82),
                              )
                            else
                              SizedBox(
                                height: 200,
                                child: ListView.separated(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: _topKRooms.length,
                                  separatorBuilder: (_, index) =>
                                      const SizedBox(width: 12),
                                  itemBuilder: (context, index) {
                                    final room = _topKRooms[index];
                                    final matchScore =
                                        ((room['score'] ?? 0.85) * 100).round();
                                    final images =
                                        room['images'] as List<dynamic>?;
                                    final imageUrl =
                                        (images != null && images.isNotEmpty)
                                        ? images[0]
                                        : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600';

                                    return GestureDetector(
                                      onTap: () {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (_) => RoomDetailScreen(
                                              room: room,
                                              recommendationId:
                                                  _recommendationId,
                                            ),
                                          ),
                                        );
                                      },
                                      child: Container(
                                        width: 160,
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius: BorderRadius.circular(
                                            16,
                                          ),
                                          boxShadow: [
                                            BoxShadow(
                                              color: EliteColors.deepNavy
                                                  .withValues(alpha: 0.14),
                                              blurRadius: 10,
                                              offset: const Offset(0, 4),
                                            ),
                                          ],
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Stack(
                                              children: [
                                                ClipRRect(
                                                  borderRadius:
                                                      const BorderRadius.vertical(
                                                        top: Radius.circular(
                                                          16,
                                                        ),
                                                      ),
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
                                                    padding:
                                                        const EdgeInsets.symmetric(
                                                          horizontal: 6,
                                                          vertical: 2,
                                                        ),
                                                    decoration: BoxDecoration(
                                                      color: EliteColors
                                                          .champagneHover,
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                            8,
                                                          ),
                                                    ),
                                                    child: Text(
                                                      '$matchScore% phù hợp',
                                                      style: const TextStyle(
                                                        color: Colors.white,
                                                        fontSize: 9,
                                                        fontWeight:
                                                            FontWeight.bold,
                                                      ),
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            Padding(
                                              padding: const EdgeInsets.all(
                                                8.0,
                                              ),
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    room['title'] ?? '',
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                    style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.bold,
                                                      fontSize: 12,
                                                    ),
                                                  ),
                                                  const SizedBox(height: 2),
                                                  Text(
                                                    room['address'] ?? '',
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                    style: TextStyle(
                                                      color:
                                                          Colors.grey.shade600,
                                                      fontSize: 10,
                                                    ),
                                                  ),
                                                  const SizedBox(height: 6),
                                                  Text(
                                                    _currencyFormat.format(
                                                      room['price'] ?? 0,
                                                    ),
                                                    style: const TextStyle(
                                                      color: EliteColors
                                                          .champagneHover,
                                                      fontWeight:
                                                          FontWeight.bold,
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
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
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
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          Text(
                            '${_recentRooms.length} phòng',
                            style: TextStyle(
                              color: Colors.grey.shade500,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 10),

                    if (_recentRoomsLoading)
                      _buildEmptyHint('Đang tải danh sách phòng…'),
                    if (!_recentRoomsLoading &&
                        _recentRooms.isEmpty &&
                        _loadError == null)
                      _buildEmptyHint('Chưa có phòng nào trong khu vực này.'),

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
                              MaterialPageRoute(
                                builder: (_) => RoomDetailScreen(room: room),
                              ),
                            );
                          },
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: EliteColors.border),
                            ),
                            child: Row(
                              children: [
                                ClipRRect(
                                  borderRadius: const BorderRadius.horizontal(
                                    left: Radius.circular(16),
                                  ),
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
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 8.0,
                                      horizontal: 4.0,
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          room['title'] ?? '',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                          ),
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          room['address'] ?? '',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            color: Colors.grey.shade500,
                                            fontSize: 11,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              _currencyFormat.format(
                                                room['price'] ?? 0,
                                              ),
                                              style: const TextStyle(
                                                color:
                                                    EliteColors.champagneHover,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 13,
                                              ),
                                            ),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: 6,
                                                    vertical: 2,
                                                  ),
                                              decoration: BoxDecoration(
                                                color: EliteColors.champagne
                                                    .withValues(alpha: 0.12),
                                                borderRadius:
                                                    BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                '${room['area'] ?? 25} m²',
                                                style: const TextStyle(
                                                  color: EliteColors.deepNavy,
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                ),
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
        selectedColor: EliteColors.champagne,
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : Colors.black87,
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
        backgroundColor: Colors.white,
        side: BorderSide(
          color: isSelected ? EliteColors.champagne : EliteColors.border,
        ),
      ),
    );
  }
}

// -------------------------------------------------------------
// 2. ROOM DETAIL & BOOKING SCREEN
// -------------------------------------------------------------
class RoomDetailScreen extends StatefulWidget {
  final Map<String, dynamic> room;

  /// Mã danh sách gợi ý Top-K nếu mở phòng từ gợi ý (để đo CTR / tỉ lệ đặt lịch)
  final String? recommendationId;
  const RoomDetailScreen({
    super.key,
    required this.room,
    this.recommendationId,
  });

  @override
  State<RoomDetailScreen> createState() => _RoomDetailScreenState();
}

class _RoomDetailScreenState extends State<RoomDetailScreen> {
  final NumberFormat _currencyFormat = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: 'đ',
  );
  bool get _isFavorite => FavoritesStore.contains(widget.room['id']);

  @override
  void initState() {
    super.initState();
    final id = (widget.room['id'] as num?)?.toInt();
    // Ghi lượt xem (cá nhân hóa gợi ý) và lượt bấm từ danh sách gợi ý (CTR)
    if (id != null) {
      TenantApi.recordView(id, recommendationId: widget.recommendationId);
    }
  }

  String? _optionalText(dynamic value) {
    final text = value?.toString().trim() ?? '';
    return text.isEmpty ? null : text;
  }

  void _showFeedback(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _copyRoomInfo() async {
    final title = _optionalText(widget.room['title']) ?? 'Phòng trọ';
    final address = _optionalText(widget.room['address']);
    final details = <String>[
      title,
      ?address,
      'Giá thuê: ${_currencyFormat.format(widget.room['price'] ?? 0)}',
    ].join('\n');

    await Clipboard.setData(ClipboardData(text: details));
    if (mounted) {
      _showFeedback('Đã sao chép thông tin phòng để bạn chia sẻ.');
    }
  }

  Future<void> _toggleFavorite() async {
    final added = await FavoritesStore.toggle(
      Map<String, dynamic>.from(widget.room),
    );
    if (!mounted) return;
    setState(() {});
    _showFeedback(
      added
          ? 'Đã lưu phòng vào danh sách yêu thích.'
          : 'Đã bỏ phòng khỏi danh sách yêu thích.',
    );
  }

  Future<void> _copyLandlordPhone() async {
    final phone = _optionalText(widget.room['landlord_phone']);
    if (phone == null) {
      _showFeedback('Chủ trọ chưa công khai số điện thoại.');
      return;
    }

    await Clipboard.setData(ClipboardData(text: phone));
    if (mounted) {
      _showFeedback('Đã sao chép số $phone.');
    }
  }

  void _openBookingSheet() {
    final status = (widget.room['status'] ?? 'AVAILABLE')
        .toString()
        .toUpperCase();
    if (status == 'RESERVED' || status == 'RENTED') {
      _showFeedback('Phòng này hiện không còn nhận lịch xem mới.');
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: EliteColors.canvas,
      barrierColor: EliteColors.deepNavy.withValues(alpha: 0.45),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => BookingBottomSheet(
        room: widget.room,
        recommendationId: widget.recommendationId,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final room = widget.room;
    final images = (room['images'] as List<dynamic>?) ?? [];
    final amenities = (room['amenities'] as List<dynamic>?) ?? [];
    final roomStatus = (room['status'] ?? 'AVAILABLE').toString().toUpperCase();
    final canBook = roomStatus != 'RESERVED' && roomStatus != 'RENTED';
    final bookingLabel = switch (roomStatus) {
      'RESERVED' => 'Phòng đang được giữ chỗ',
      'RENTED' => 'Phòng đang được thuê',
      _ => 'Đặt lịch xem phòng',
    };
    final landlordName = _optionalText(room['landlord_name']) ?? 'Chủ trọ';
    final landlordPhone = _optionalText(room['landlord_phone']);
    final landlordInitial = landlordName.characters.first.toUpperCase();

    return Scaffold(
      appBar: AppBar(
        title: Text(room['room_code'] ?? 'Chi tiết phòng'),
        actions: [
          IconButton(
            icon: const Icon(Icons.ios_share_rounded),
            tooltip: 'Sao chép thông tin để chia sẻ',
            onPressed: _copyRoomInfo,
          ),
          IconButton(
            icon: Icon(
              _isFavorite
                  ? Icons.favorite_rounded
                  : Icons.favorite_border_rounded,
              color: _isFavorite ? EliteColors.champagneHover : null,
            ),
            tooltip: _isFavorite ? 'Bỏ yêu thích' : 'Lưu phòng yêu thích',
            onPressed: _toggleFavorite,
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(top: BorderSide(color: EliteColors.border)),
          boxShadow: [
            BoxShadow(
              color: EliteColors.champagne.withValues(alpha: 0.12),
              blurRadius: 14,
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Giá thuê phòng',
                    style: TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                  Text(
                    _currencyFormat.format(room['price'] ?? 0),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: EliteColors.champagneHover,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: canBook ? _openBookingSheet : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: EliteColors.champagne,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: EliteColors.border,
                    disabledForegroundColor: EliteColors.deepNavy,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        canBook
                            ? Icons.calendar_month_rounded
                            : Icons.lock_outline_rounded,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        bookingLabel,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
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
                    style: const TextStyle(
                      color: EliteColors.deepNavy,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on_rounded,
                        size: 16,
                        color: EliteColors.champagne,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          room['address'] ?? '',
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 13,
                          ),
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
                      border: Border.all(color: EliteColors.border),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildSpecItem(
                          Icons.straighten_rounded,
                          'Diện tích',
                          '${room['area'] ?? 25} m²',
                        ),
                        _buildSpecItem(
                          Icons.bedroom_parent_outlined,
                          'Loại phòng',
                          room['room_type'] ?? 'Có gác',
                        ),
                        _buildSpecItem(
                          Icons.verified_user_outlined,
                          'Cọc phòng',
                          _currencyFormat.format(
                            room['deposit'] ?? room['price'],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Utilities table
                  const Text(
                    'Bảng giá dịch vụ',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: EliteColors.border),
                    ),
                    child: Column(
                      children: [
                        _buildFeeRow(
                          'Tiền điện',
                          '${room['electricity_rate'] ?? 3800} đ/kWh',
                        ),
                        const Divider(height: 16),
                        _buildFeeRow(
                          'Tiền nước',
                          '25.000 đ/m³ (hoặc 100k/người)',
                        ),
                        const Divider(height: 16),
                        _buildFeeRow(
                          'Wifi / Internet',
                          '${room['internet_fee'] ?? 100000} đ/phòng',
                        ),
                        const Divider(height: 16),
                        _buildFeeRow(
                          'Phí dịch vụ & Quản lý',
                          '${room['service_fee'] ?? 150000} đ/tháng',
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Amenities
                  const Text(
                    'Tiện ích & Nội thất',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: amenities.map((a) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: EliteColors.champagne.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: EliteColors.champagne.withValues(
                              alpha: 0.24,
                            ),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.check_rounded,
                              size: 14,
                              color: EliteColors.champagneHover,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              a.toString(),
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: EliteColors.deepNavy,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 20),

                  // Description
                  const Text(
                    'Mô tả chi tiết',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    room['description'] ??
                        'Phòng mới đẹp, giờ giấc tự do, an ninh 24/7.',
                    style: TextStyle(
                      color: Colors.grey.shade700,
                      fontSize: 13,
                      height: 1.5,
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Landlord contact card
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: EliteColors.border),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: EliteColors.deepNavy,
                          child: Text(
                            landlordInitial,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                landlordName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                              Text(
                                landlordPhone == null
                                    ? 'Chưa công khai số điện thoại'
                                    : 'SĐT: $landlordPhone',
                                style: TextStyle(
                                  color: Colors.grey.shade600,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          style: IconButton.styleFrom(
                            backgroundColor: EliteColors.champagne.withValues(
                              alpha: 0.14,
                            ),
                          ),
                          icon: const Icon(
                            Icons.call_rounded,
                            color: EliteColors.champagneHover,
                          ),
                          tooltip: 'Sao chép số điện thoại chủ trọ',
                          onPressed: _copyLandlordPhone,
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
        Icon(icon, size: 20, color: EliteColors.champagneHover),
        const SizedBox(height: 4),
        Text(
          title,
          style: TextStyle(color: Colors.grey.shade500, fontSize: 10),
        ),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
        ),
      ],
    );
  }

  Widget _buildFeeRow(String label, String value) {
    final icon = switch (label) {
      'Tiền điện' => Icons.bolt_rounded,
      'Tiền nước' => Icons.water_drop_outlined,
      'Wifi / Internet' => Icons.wifi_rounded,
      _ => Icons.cleaning_services_outlined,
    };

    return Row(
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: EliteColors.champagne.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(9),
          ),
          child: Icon(icon, size: 16, color: EliteColors.champagneHover),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(color: EliteColors.deepNavy, fontSize: 12),
          ),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(
              color: EliteColors.deepNavy,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ),
      ],
    );
  }
}

// -------------------------------------------------------------
// 3. BOOKING BOTTOM SHEET WITH CONCURRENCY CONTROL
// -------------------------------------------------------------
class BookingBottomSheet extends StatefulWidget {
  final Map<String, dynamic> room;
  final String? recommendationId;
  const BookingBottomSheet({
    super.key,
    required this.room,
    this.recommendationId,
  });

  @override
  State<BookingBottomSheet> createState() => _BookingBottomSheetState();
}

class _BookingBottomSheetState extends State<BookingBottomSheet> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  late DateTime _selectedDate;
  String _selectedTimeSlot = '09:30 - 10:30';
  bool _isLoading = false;
  String? _errorMessage;
  String? _successMessage;

  // Khung giờ đón khách do chủ trọ cấu hình (tải từ máy chủ); danh sách dưới chỉ dùng khi chưa tải được
  LandlordAvailability? _availability;
  static const List<String> _fallbackSlots = [
    '08:30 - 09:30',
    '09:30 - 10:30',
    '10:30 - 11:30',
    '14:00 - 15:00',
    '15:30 - 16:30',
    '17:00 - 18:00',
  ];

  List<String> get _slots =>
      _availability?.slotsFor(_selectedDate) ?? _fallbackSlots;

  Future<void> _loadAvailability() async {
    final roomId = (widget.room['id'] as num?)?.toInt();
    if (roomId == null) return;
    try {
      final availability = await TenantApi.fetchAvailability(roomId);
      if (!mounted) return;
      setState(() {
        _availability = availability;
        // Ngày mặc định: ngày gần nhất chủ trọ có đón khách
        var day = _selectedDate;
        for (var i = 0;
            i < 14 &&
                (!availability.isOpenOn(day) ||
                    availability.slotsFor(day).isEmpty);
            i++) {
          day = day.add(const Duration(days: 1));
        }
        _selectedDate = day;
        final slots = availability.slotsFor(day);
        if (slots.isNotEmpty && !slots.contains(_selectedTimeSlot)) {
          _selectedTimeSlot = slots.first;
        }
      });
    } catch (e) {
      debugPrint('Không tải được khung giờ đón khách: $e');
    }
  }

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    _selectedDate = today.add(const Duration(days: 1));
    _loadAvailability();
    final user = AuthService.currentUser.value;
    if (user != null) {
      _nameController.text = user.name;
      _phoneController.text = user.phone;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  String get _dateForApi => DateFormat('yyyy-MM-dd').format(_selectedDate);

  String? _optionalText(dynamic value) {
    final text = value?.toString().trim() ?? '';
    return text.isEmpty ? null : text;
  }

  String? _validateName(String? value) {
    final name = value?.trim() ?? '';
    if (name.isEmpty) return 'Vui lòng nhập họ và tên.';
    if (name.length < 2) return 'Họ và tên phải có ít nhất 2 ký tự.';
    if (name.length > 100) return 'Họ và tên không được quá 100 ký tự.';
    return null;
  }

  String? _validatePhone(String? value) {
    final phone = (value ?? '').replaceAll(RegExp(r'[\s-]'), '');
    final isValid = RegExp(
      r'^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$',
    ).hasMatch(phone);
    if (phone.isEmpty) return 'Vui lòng nhập số điện thoại.';
    if (!isValid) return 'Số điện thoại Việt Nam không hợp lệ.';
    return null;
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate.isBefore(today) ? today : _selectedDate,
      firstDate: today,
      lastDate: DateTime(today.year + 1, today.month, today.day),
      helpText: 'Chọn ngày xem phòng',
      cancelText: 'Hủy',
      confirmText: 'Chọn ngày',
    );

    if (picked != null && mounted) {
      setState(() {
        _selectedDate = DateTime(picked.year, picked.month, picked.day);
        _errorMessage = null;
        final availability = _availability;
        if (availability != null && !availability.isOpenOn(_selectedDate)) {
          _errorMessage =
              'Chủ trọ không đón khách vào ${LandlordAvailability.dayCode(_selectedDate)}. Vui lòng chọn ngày khác.';
        }
        final slots = _slots;
        if (slots.isNotEmpty && !slots.contains(_selectedTimeSlot)) {
          _selectedTimeSlot = slots.first;
        }
      });
    }
  }

  Future<void> _submitBooking() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) {
      setState(
        () => _errorMessage = 'Vui lòng kiểm tra lại thông tin liên hệ.',
      );
      return;
    }

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    if (_selectedDate.isBefore(today)) {
      setState(() => _errorMessage = 'Ngày xem phòng không được ở quá khứ.');
      return;
    }

    final roomId = widget.room['id'];
    if (roomId == null) {
      setState(() => _errorMessage = 'Không xác định được phòng cần đặt lịch.');
      return;
    }

    final normalizedPhone = _phoneController.text.replaceAll(
      RegExp(r'[\s-]'),
      '',
    );

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final res = await http
          .post(
            Uri.parse('$kBaseUrl/api/appointments'),
            headers: {
              ...AuthService.authHeaders,
              'Content-Type': 'application/json',
            },
            body: jsonEncode({
              'room_id': roomId,
              'user_name': _nameController.text.trim(),
              'user_phone': normalizedPhone,
              'date': _dateForApi,
              'time_slot': _selectedTimeSlot,
              'notes': 'Đặt hẹn qua Mobile App Flutter',
              'recommendation_id': ?widget.recommendationId,
            }),
          )
          .timeout(const Duration(seconds: 15));

      Map<String, dynamic> data;
      try {
        final decoded = jsonDecode(utf8.decode(res.bodyBytes));
        data = decoded is Map<String, dynamic> ? decoded : {};
      } on FormatException {
        data = {'message': 'Máy chủ trả về HTTP ${res.statusCode}.'};
      }
      if (!mounted) return;

      if (res.statusCode == 409 || res.statusCode == 429) {
        // Trùng khung giờ (kiểm soát tương tranh), tin chưa duyệt, hoặc vượt giới hạn đặt lịch
        setState(() {
          _errorMessage =
              data['message'] as String? ??
              'Khung giờ này vừa có người đặt trước. Vui lòng chọn khung giờ khác.';
        });
      } else if (res.statusCode >= 200 &&
          res.statusCode < 300 &&
          data['success'] == true) {
        final rawAppointment = data['data'];
        final responseId = rawAppointment is Map
            ? _optionalText(rawAppointment['id'])
            : null;
        final responseStatus = rawAppointment is Map
            ? _optionalText(rawAppointment['status'])
            : null;
        final roomTitle =
            _optionalText(widget.room['title']) ??
            _optionalText(widget.room['room_code']) ??
            'Phòng #$roomId';

        TenantAppointmentStore.add(
          TenantAppointment(
            roomId: (roomId as num?)?.toInt(),
            id:
                responseId ??
                '${roomId}_${_dateForApi}_${_selectedTimeSlot}_${DateTime.now().millisecondsSinceEpoch}',
            roomTitle: roomTitle,
            date: _selectedDate,
            timeSlot: _selectedTimeSlot,
            status: responseStatus ?? 'PENDING',
            landlordName: _optionalText(widget.room['landlord_name']),
            landlordPhone: _optionalText(widget.room['landlord_phone']),
          ),
        );

        setState(() {
          _successMessage =
              'Đặt lịch xem phòng thành công! Chủ trọ sẽ liên hệ.';
        });
        Future.delayed(const Duration(milliseconds: 1200), () {
          if (mounted) Navigator.pop(context);
        });
      } else {
        setState(() {
          _errorMessage = data['message'] ?? 'Đặt lịch thất bại.';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Lỗi kết nối đến máy chủ $kBaseUrl: $e';
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
            Center(
              child: Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: EliteColors.border,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(
                      Icons.calendar_month_rounded,
                      color: EliteColors.champagneHover,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Đặt lịch xem phòng',
                      style: TextStyle(
                        color: EliteColors.deepNavy,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const Row(
              children: [
                Icon(
                  Icons.lock_clock_outlined,
                  size: 15,
                  color: EliteColors.champagneHover,
                ),
                SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Khung giờ được khóa để tránh trùng lịch khi xác nhận.',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(10),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.error_outline_rounded,
                      color: Colors.red.shade800,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: TextStyle(
                          color: Colors.red.shade800,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            if (_successMessage != null)
              Container(
                padding: const EdgeInsets.all(10),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: EliteColors.champagne.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: EliteColors.champagne.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.check_circle_outline_rounded,
                      color: EliteColors.champagneHover,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _successMessage!,
                        style: const TextStyle(
                          color: EliteColors.deepNavy,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _nameController,
                    textInputAction: TextInputAction.next,
                    textCapitalization: TextCapitalization.words,
                    autofillHints: const [AutofillHints.name],
                    autovalidateMode: AutovalidateMode.onUserInteraction,
                    validator: _validateName,
                    decoration: const InputDecoration(
                      labelText: 'Họ và tên người xem',
                      hintText: 'Nhập họ và tên của bạn',
                      prefixIcon: Icon(Icons.person_outline_rounded),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    textInputAction: TextInputAction.done,
                    autofillHints: const [AutofillHints.telephoneNumber],
                    autovalidateMode: AutovalidateMode.onUserInteraction,
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s-]')),
                    ],
                    validator: _validatePhone,
                    decoration: const InputDecoration(
                      labelText: 'Số điện thoại',
                      hintText: 'Ví dụ: 0912 345 678',
                      prefixIcon: Icon(Icons.phone_outlined),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            const Text(
              'Ngày xem phòng:',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
            const SizedBox(height: 6),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _isLoading ? null : _pickDate,
                icon: const Icon(
                  Icons.calendar_today_rounded,
                  size: 18,
                  color: EliteColors.champagneHover,
                ),
                label: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    DateFormat('dd/MM/yyyy').format(_selectedDate),
                    style: const TextStyle(
                      color: EliteColors.deepNavy,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 14,
                  ),
                  side: const BorderSide(color: EliteColors.border),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),

            const Text(
              'Khung giờ rảnh:',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _slots.map((s) {
                final isSel = _selectedTimeSlot == s;
                return ChoiceChip(
                  avatar: isSel
                      ? const Icon(
                          Icons.schedule_rounded,
                          size: 15,
                          color: Colors.white,
                        )
                      : null,
                  label: Text(
                    s,
                    style: TextStyle(
                      fontSize: 11,
                      color: isSel ? Colors.white : EliteColors.deepNavy,
                    ),
                  ),
                  selected: isSel,
                  selectedColor: EliteColors.champagne,
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: EliteColors.border),
                  showCheckmark: false,
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
                  backgroundColor: EliteColors.champagne,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.event_available_rounded, size: 18),
                          SizedBox(width: 8),
                          Text(
                            'Xác nhận đặt lịch hẹn',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
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

  /// Multi-criteria search, same filters as the web home page.
  @override
  Widget build(BuildContext context) => const RoomSearchScreen();
}

// -------------------------------------------------------------
// 5. APPOINTMENTS SCREEN
// -------------------------------------------------------------
class MyAppointmentsScreen extends StatelessWidget {
  const MyAppointmentsScreen({super.key});

  String _statusLabel(String status) {
    return switch (status.toUpperCase()) {
      'CONFIRMED' => 'Đã xác nhận',
      'CANCELLED' => 'Đã hủy',
      'COMPLETED' => 'Đã hoàn tất',
      _ => 'Chờ xác nhận',
    };
  }

  IconData _statusIcon(String status) {
    return switch (status.toUpperCase()) {
      'CONFIRMED' => Icons.event_available_rounded,
      'CANCELLED' => Icons.event_busy_rounded,
      'COMPLETED' => Icons.task_alt_rounded,
      _ => Icons.hourglass_top_rounded,
    };
  }

  Future<void> _cancelAppointment(
    BuildContext context,
    TenantAppointment appointment,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Hủy lịch hẹn?'),
        content: const Text('Khung giờ sẽ được mở lại cho khách thuê khác.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Không'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: FilledButton.styleFrom(
              backgroundColor: EliteColors.champagne,
            ),
            child: const Text('Hủy lịch'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await TenantApi.cancelAppointment(appointment.id);
      await TenantAppointmentStore.syncWithAccount(
        AuthService.currentUser.value,
      );
      if (context.mounted) {
        showSnack(context, 'Đã hủy lịch hẹn xem phòng.');
      }
    } on ApiException catch (e) {
      if (context.mounted) showSnack(context, e.message);
    }
  }

  Future<void> _reschedule(
    BuildContext context,
    TenantAppointment appointment,
  ) async {
    final message = await showRescheduleSheet(
      context,
      appointmentId: appointment.id,
      roomId: appointment.roomId!,
      currentLabel:
          '${appointment.timeSlot}, ${DateFormat('dd/MM/yyyy').format(appointment.date)}',
    );
    if (message == null) return;
    await TenantAppointmentStore.syncWithAccount(AuthService.currentUser.value);
    if (context.mounted) showSnack(context, message);
  }

  Widget _buildAppointmentCard(
    TenantAppointment appointment, [
    BuildContext? context,
  ]) {
    final canCancel =
        context != null &&
        AuthService.isSignedIn &&
        const {
          'PENDING',
          'CONFIRMED',
        }.contains(appointment.status.toUpperCase());
    final landlordName = appointment.landlordName?.trim();
    final landlordPhone = appointment.landlordPhone?.trim();
    final hasLandlordName = landlordName != null && landlordName.isNotEmpty;
    final hasLandlordPhone = landlordPhone != null && landlordPhone.isNotEmpty;
    final contactText = hasLandlordName || hasLandlordPhone
        ? [
            if (hasLandlordName) landlordName,
            if (hasLandlordPhone) landlordPhone,
          ].join(' • ')
        : 'Chủ trọ sẽ liên hệ qua số điện thoại bạn đã cung cấp.';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: EliteColors.border),
        boxShadow: [
          BoxShadow(
            color: EliteColors.champagne.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  appointment.roomTitle,
                  style: const TextStyle(
                    color: EliteColors.deepNavy,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Chip(
                avatar: Icon(
                  _statusIcon(appointment.status),
                  size: 15,
                  color: EliteColors.champagneHover,
                ),
                label: Text(
                  _statusLabel(appointment.status),
                  style: const TextStyle(
                    fontSize: 10,
                    color: EliteColors.deepNavy,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                backgroundColor: EliteColors.champagne.withValues(alpha: 0.12),
                side: BorderSide.none,
              ),
            ],
          ),
          const Divider(height: 18),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.schedule_rounded,
                size: 17,
                color: EliteColors.champagneHover,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${appointment.timeSlot}, ngày ${DateFormat('dd/MM/yyyy').format(appointment.date)}',
                  style: const TextStyle(fontSize: 12, color: Colors.black87),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.person_outline_rounded,
                size: 17,
                color: EliteColors.champagneHover,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  contactText,
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ),
            ],
          ),
          if (canCancel)
            Align(
              alignment: Alignment.centerRight,
              child: Wrap(
                spacing: 4,
                children: [
                  if (appointment.roomId != null)
                    TextButton.icon(
                      onPressed: () => _reschedule(context, appointment),
                      icon: const Icon(Icons.edit_calendar_rounded, size: 18),
                      label: const Text('Đổi lịch'),
                      style: TextButton.styleFrom(
                        foregroundColor: EliteColors.champagneHover,
                      ),
                    ),
                  TextButton.icon(
                    onPressed: () => _cancelAppointment(context, appointment),
                    icon: const Icon(Icons.event_busy_rounded, size: 18),
                    label: const Text('Hủy lịch hẹn'),
                    style: TextButton.styleFrom(
                      foregroundColor: EliteColors.deepNavy,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lịch hẹn xem phòng của tôi')),
      body: ValueListenableBuilder<List<TenantAppointment>>(
        valueListenable: TenantAppointmentStore.appointments,
        builder: (context, appointments, child) {
          if (appointments.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: EliteColors.champagne.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.event_note_rounded,
                        color: EliteColors.champagneHover,
                        size: 30,
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Chưa có lịch hẹn',
                      style: TextStyle(
                        color: EliteColors.deepNavy,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Lịch xem phòng bạn vừa đặt sẽ xuất hiện tại đây.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: appointments.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) =>
                _buildAppointmentCard(appointments[index], context),
          );
        },
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
      body: ValueListenableBuilder<AuthUser?>(
        valueListenable: AuthService.currentUser,
        builder: (context, user, _) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Center(
              child: Container(
                padding: const EdgeInsets.all(3),
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: EliteColors.champagne,
                ),
                child: CircleAvatar(
                  radius: 38,
                  backgroundColor: EliteColors.deepNavy,
                  child: Text(
                    user == null || user.name.isEmpty
                        ? '?'
                        : user.name.trim()[0].toUpperCase(),
                    style: const TextStyle(
                      color: EliteColors.champagne,
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Center(
              child: Text(
                user?.name ?? 'Khách thuê',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
            Center(
              child: Text(
                user == null
                    ? 'Hoàn thiện hồ sơ để đồng bộ lịch hẹn và hợp đồng'
                    : [
                        user.email,
                        user.phone,
                      ].where((v) => v.isNotEmpty).join(' · '),
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ),
            const SizedBox(height: 16),
            if (user == null)
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: () => _openAuth(context, 0),
                      style: FilledButton.styleFrom(
                        backgroundColor: EliteColors.champagne,
                        foregroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(46),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Đăng nhập'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _openAuth(context, 1),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: EliteColors.deepNavy,
                        side: const BorderSide(color: EliteColors.champagne),
                        minimumSize: const Size.fromHeight(46),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Đăng ký'),
                    ),
                  ),
                ],
              )
            else
              OutlinedButton.icon(
                onPressed: () => _confirmLogout(context),
                icon: const Icon(Icons.logout_rounded),
                label: const Text('Đăng xuất'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: EliteColors.deepNavy,
                  side: const BorderSide(color: EliteColors.border),
                  minimumSize: const Size.fromHeight(46),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            const SizedBox(height: 24),
            if (user != null) ...[
              ValueListenableBuilder<BillReminderState>(
                valueListenable: BillReminderStore.state,
                builder: (context, reminder, _) => _menuTile(
                  context,
                  Icons.home_work_outlined,
                  'Thuê phòng của tôi',
                  reminder.overdue.isNotEmpty
                      ? '${reminder.overdue.length} hóa đơn quá hạn cần thanh toán'
                      : reminder.newCount > 0
                      ? '${reminder.newCount} hóa đơn mới'
                      : 'Đặt cọc, hợp đồng, bàn giao, hóa đơn',
                  const RentalHubScreen(),
                  badge: reminder.badgeCount,
                ),
              ),
              _menuTile(
                context,
                Icons.notifications_none_rounded,
                'Thông báo',
                'Hóa đơn, hợp đồng, lịch hẹn',
                const NotificationsScreen(),
              ),
              if (!user.phoneVerified)
                _menuTile(
                  context,
                  Icons.verified_user_outlined,
                  'Xác minh số điện thoại',
                  'Bắt buộc trước khi đặt cọc và ký hợp đồng',
                  const PhoneVerifyScreen(),
                ),
              _menuTile(
                context,
                Icons.tune_rounded,
                'Hồ sơ nhu cầu',
                'Ngân sách, vị trí, tiện ích cho gợi ý Top-K',
                const PreferenceProfileScreen(),
              ),
              _menuTile(
                context,
                Icons.manage_accounts_outlined,
                'Sửa hồ sơ',
                'Họ tên, số điện thoại',
                const EditProfileScreen(),
              ),
              _menuTile(
                context,
                Icons.diversity_3_outlined,
                'Hồ sơ ở ghép',
                'Thói quen, tính cách để ghép bạn phù hợp',
                const RoommateProfileScreen(),
              ),
            ],
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: EliteColors.border),
              ),
              child: const ListTile(
                leading: CircleAvatar(
                  backgroundColor: EliteColors.deepNavy,
                  child: Icon(
                    Icons.tune_rounded,
                    color: EliteColors.champagne,
                    size: 20,
                  ),
                ),
                title: Text('Thiết lập tiêu chí gợi ý Top-K'),
                subtitle: Text('Ngân sách, bán kính di chuyển, tiện ích'),
                trailing: Icon(
                  Icons.chevron_right_rounded,
                  color: EliteColors.champagneHover,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: EliteColors.border),
              ),
              child: const ListTile(
                leading: CircleAvatar(
                  backgroundColor: EliteColors.deepNavy,
                  child: Icon(
                    Icons.school_outlined,
                    color: EliteColors.champagne,
                    size: 20,
                  ),
                ),
                title: Text('Đề tài Khóa Luận Tốt Nghiệp'),
                subtitle: Text(
                  'Mã đề tài: CNTT-KLCN111 - GVHD: Phan Thị Ngọc Mai',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _menuTile(
    BuildContext context,
    IconData icon,
    String title,
    String subtitle,
    Widget screen, {
    int badge = 0,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: EliteColors.border),
      ),
      child: ListTile(
        leading: Badge(
          isLabelVisible: badge > 0,
          label: Text('$badge'),
          child: CircleAvatar(
            backgroundColor: EliteColors.deepNavy,
            child: Icon(icon, color: EliteColors.champagne, size: 20),
          ),
        ),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(
          Icons.chevron_right_rounded,
          color: EliteColors.champagneHover,
        ),
        onTap: () =>
            Navigator.push(context, MaterialPageRoute(builder: (_) => screen)),
      ),
    );
  }

  Future<void> _openAuth(BuildContext context, int tab) async {
    final signedIn = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => AuthScreen(initialTab: tab)),
    );
    if (signedIn == true && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Xin chào ${AuthService.currentUser.value?.name ?? ''}!',
          ),
        ),
      );
    }
  }

  Future<void> _confirmLogout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Đăng xuất?'),
        content: const Text('Bạn sẽ cần đăng nhập lại để đồng bộ lịch hẹn.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: FilledButton.styleFrom(
              backgroundColor: EliteColors.champagne,
            ),
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
    if (confirmed == true) await AuthService.logout();
  }
}
