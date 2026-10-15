import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import 'auth.dart';
import 'auth_screen.dart';
import 'main.dart' show EliteColors;
import 'roommate.dart';

final NumberFormat _vnd = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

const String _fallbackImage =
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';

/// Opens the login screen when needed. Returns true once signed in.
Future<bool> ensureSignedIn(BuildContext context, String reason) async {
  if (AuthService.isSignedIn) return true;
  final goLogin = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('Cần đăng nhập'),
      content: Text(reason),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(dialogContext, false),
          child: const Text('Để sau'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(dialogContext, true),
          style: FilledButton.styleFrom(backgroundColor: EliteColors.champagne),
          child: const Text('Đăng nhập'),
        ),
      ],
    ),
  );
  if (goLogin != true || !context.mounted) return false;
  final signedIn = await Navigator.push<bool>(
    context,
    MaterialPageRoute(builder: (_) => const AuthScreen()),
  );
  return signedIn == true && AuthService.isSignedIn;
}

void _copyPhone(BuildContext context, String phone) {
  Clipboard.setData(ClipboardData(text: phone));
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text('Đã sao chép SĐT $phone (dùng để gọi hoặc Zalo).')),
  );
}

// -------------------------------------------------------------
// LIST
// -------------------------------------------------------------
class RoommateScreen extends StatefulWidget {
  const RoommateScreen({super.key});

  @override
  State<RoommateScreen> createState() => _RoommateScreenState();
}

class _RoommateScreenState extends State<RoommateScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<RoommatePost> _posts = [];
  bool _isLoading = true;
  String? _error;
  String _district = 'all';
  String _gender = 'all';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final posts = await RoommateApi.fetchPosts(
        district: _district,
        gender: _gender,
        search: _searchController.text,
      );
      if (mounted) setState(() => _posts = posts);
    } on RoommateApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _openCreate() async {
    final ok = await ensureSignedIn(
      context,
      'Đăng nhập để đăng bài và nhận yêu cầu ở ghép từ người khác.',
    );
    if (!ok || !mounted) return;
    final created = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const RoommateCreateScreen()),
    );
    if (created == true) _load();
  }

  Future<void> _openInbox() async {
    final ok = await ensureSignedIn(
      context,
      'Đăng nhập để xem yêu cầu ở ghép đã gửi và đã nhận.',
    );
    if (!ok || !mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const RoommateInboxScreen()),
    );
    _load();
  }

  Widget _chip(String label, bool selected, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
        showCheckmark: false,
        selectedColor: EliteColors.champagne,
        backgroundColor: Colors.white,
        side: BorderSide(
          color: selected ? EliteColors.champagne : EliteColors.border,
        ),
        labelStyle: TextStyle(
          color: selected ? Colors.white : EliteColors.deepNavy,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          fontSize: 12,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tìm bạn ở ghép'),
        actions: [
          IconButton(
            tooltip: 'Yêu cầu ở ghép của tôi',
            icon: const Icon(Icons.inbox_outlined),
            onPressed: _openInbox,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        backgroundColor: EliteColors.champagne,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.edit_note_rounded),
        label: const Text('Đăng bài'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
          children: [
            TextField(
              controller: _searchController,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _load(),
              decoration: InputDecoration(
                hintText: 'Tìm theo khu vực, thói quen, tiêu đề...',
                prefixIcon: const Icon(
                  Icons.search_rounded,
                  color: EliteColors.champagneHover,
                ),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.arrow_forward_rounded),
                  onPressed: _load,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _chip('Tất cả khu vực', _district == 'all', () {
                    setState(() => _district = 'all');
                    _load();
                  }),
                  for (final d in kRoommateDistricts)
                    _chip(d, _district == d, () {
                      setState(() => _district = d);
                      _load();
                    }),
                ],
              ),
            ),
            const SizedBox(height: 6),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _chip('Mọi giới tính', _gender == 'all', () {
                    setState(() => _gender = 'all');
                    _load();
                  }),
                  for (final g in const ['Nữ', 'Nam'])
                    _chip('Tìm bạn $g', _gender == g, () {
                      setState(() => _gender = g);
                      _load();
                    }),
                ],
              ),
            ),
            const SizedBox(height: 14),
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.only(top: 48),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              _MessageBox(
                icon: Icons.cloud_off_rounded,
                title: 'Không tải được bài đăng',
                message: _error!,
                actionLabel: 'Thử lại',
                onAction: _load,
              )
            else if (_posts.isEmpty)
              const _MessageBox(
                icon: Icons.group_off_outlined,
                title: 'Chưa có bài đăng phù hợp',
                message: 'Thử đổi bộ lọc hoặc tự đăng bài tìm bạn ở ghép.',
              )
            else ...[
              Text(
                '${_posts.length} bài đăng đang tìm bạn',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
              ),
              const SizedBox(height: 8),
              for (final post in _posts)
                _RoommatePostCard(
                  post: post,
                  onTap: () async {
                    await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => RoommateDetailScreen(post: post),
                      ),
                    );
                  },
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RoommatePostCard extends StatelessWidget {
  const _RoommatePostCard({required this.post, required this.onTap});

  final RoommatePost post;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final image = post.images.isNotEmpty ? post.images.first : _fallbackImage;
    final score = post.compatibilityScore;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: EliteColors.border),
          boxShadow: [
            BoxShadow(
              color: EliteColors.deepNavy.withValues(alpha: 0.06),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(16),
                  ),
                  child: Image.network(
                    image,
                    height: 150,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(
                      height: 150,
                      color: EliteColors.border,
                      child: const Icon(Icons.image_not_supported_outlined),
                    ),
                  ),
                ),
                Positioned(
                  top: 10,
                  left: 10,
                  child: _Badge(
                    text: 'Tìm bạn ${post.genderPreference.toLowerCase()}',
                  ),
                ),
                if (score != null)
                  Positioned(
                    top: 10,
                    right: 10,
                    child: _Badge(
                      text: '${score.round()}% hợp',
                      color: EliteColors.deepNavy,
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    post.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: EliteColors.deepNavy,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(
                        Icons.location_on_outlined,
                        size: 14,
                        color: Colors.grey.shade600,
                      ),
                      const SizedBox(width: 3),
                      Expanded(
                        child: Text(
                          [
                            post.address,
                            post.district,
                          ].where((v) => v.isNotEmpty).join(', '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        '${_vnd.format(post.sharedRent)}/người',
                        style: const TextStyle(
                          color: EliteColors.champagneHover,
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                        ),
                      ),
                      const Spacer(),
                      Icon(
                        Icons.people_alt_outlined,
                        size: 15,
                        color: Colors.grey.shade700,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Còn ${post.slotsLeft} chỗ',
                        style: TextStyle(
                          color: Colors.grey.shade700,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  if (post.requiredHabits.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final h in post.requiredHabits.take(3))
                          _HabitTag(label: h),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// -------------------------------------------------------------
// DETAIL
// -------------------------------------------------------------
class RoommateDetailScreen extends StatefulWidget {
  const RoommateDetailScreen({super.key, required this.post});

  final RoommatePost post;

  @override
  State<RoommateDetailScreen> createState() => _RoommateDetailScreenState();
}

class _RoommateDetailScreenState extends State<RoommateDetailScreen> {
  late RoommatePost _post = widget.post;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    try {
      final fresh = await RoommateApi.fetchPost(widget.post.id);
      if (mounted) setState(() => _post = fresh);
    } on RoommateApiException {
      // Keep the list version if the detail call fails.
    }
  }

  bool get _isMine => AuthService.currentUser.value?.id == _post.userId;

  Future<void> _connect() async {
    final ok = await ensureSignedIn(
      context,
      'Đăng nhập để gửi yêu cầu ở ghép kèm SĐT của bạn cho người đăng.',
    );
    if (!ok || !mounted) return;
    final sent = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: EliteColors.canvas,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _ConnectSheet(post: _post),
    );
    if (sent == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Đã gửi yêu cầu! Theo dõi trạng thái trong mục Yêu cầu ở ghép.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final post = _post;
    final image = post.images.isNotEmpty ? post.images.first : _fallbackImage;
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết ở ghép')),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: _isMine
              ? OutlinedButton.icon(
                  onPressed: null,
                  icon: const Icon(Icons.person_pin_outlined),
                  label: const Text('Đây là bài đăng của bạn'),
                )
              : FilledButton.icon(
                  onPressed: post.slotsLeft == 0 ? null : _connect,
                  icon: const Icon(Icons.handshake_outlined),
                  label: Text(
                    post.slotsLeft == 0 ? 'Đã đủ người' : 'Gửi yêu cầu ở ghép',
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: EliteColors.champagne,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(50),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            Image.network(
              image,
              height: 220,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) =>
                  Container(height: 220, color: EliteColors.border),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      _Badge(
                        text: 'Tìm bạn ${post.genderPreference.toLowerCase()}',
                      ),
                      _Badge(
                        text: '${post.currentPeople}/${post.maxPeople} người',
                        color: EliteColors.deepNavy,
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    post.title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: EliteColors.deepNavy,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${_vnd.format(post.sharedRent)} / người / tháng',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: EliteColors.champagneHover,
                    ),
                  ),
                  const SizedBox(height: 14),
                  _InfoRow(
                    icon: Icons.location_on_outlined,
                    text: [
                      post.address,
                      post.district,
                    ].where((v) => v.isNotEmpty).join(', '),
                  ),
                  if (post.roomTitle != null && post.roomTitle!.isNotEmpty)
                    _InfoRow(
                      icon: Icons.apartment_outlined,
                      text: post.roomTitle!,
                    ),
                  _InfoRow(
                    icon: Icons.person_outline_rounded,
                    text: 'Người đăng: ${post.userName}',
                  ),
                  if (post.createdAt != null)
                    _InfoRow(
                      icon: Icons.schedule_rounded,
                      text:
                          'Đăng ngày ${DateFormat('dd/MM/yyyy').format(post.createdAt!.toLocal())}',
                    ),
                  const SizedBox(height: 14),
                  const _SectionTitle('Mô tả'),
                  Text(
                    post.description,
                    style: const TextStyle(height: 1.5, fontSize: 14),
                  ),
                  if (post.requiredHabits.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    const _SectionTitle('Thói quen mong muốn'),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final h in post.requiredHabits)
                          _HabitTag(label: h),
                      ],
                    ),
                  ],
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: EliteColors.border),
                    ),
                    child: const Row(
                      children: [
                        Icon(
                          Icons.shield_outlined,
                          color: EliteColors.champagneHover,
                        ),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'SĐT người đăng được chia sẻ sau khi họ chấp nhận yêu cầu của bạn.',
                            style: TextStyle(fontSize: 12),
                          ),
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
}

class _ConnectSheet extends StatefulWidget {
  const _ConnectSheet({required this.post});

  final RoommatePost post;

  @override
  State<_ConnectSheet> createState() => _ConnectSheetState();
}

class _ConnectSheetState extends State<_ConnectSheet> {
  late final TextEditingController _messageController = TextEditingController(
    text:
        'Chào bạn, mình quan tâm đến bài "${widget.post.title}". Mình muốn ở ghép, bạn liên hệ mình nhé!',
  );
  bool _isSending = false;
  String? _error;

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    setState(() {
      _isSending = true;
      _error = null;
    });
    try {
      await RoommateApi.sendRequest(
        postId: widget.post.id,
        message: _messageController.text.trim(),
      );
      if (mounted) Navigator.pop(context, true);
    } on RoommateApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser.value;
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Gửi yêu cầu ở ghép',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: EliteColors.deepNavy,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Người đăng sẽ thấy tên và SĐT ${user?.phone.isNotEmpty == true ? user!.phone : 'của bạn'} để liên hệ.',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _messageController,
            maxLines: 4,
            maxLength: 500,
            decoration: const InputDecoration(labelText: 'Lời nhắn'),
          ),
          if (_error != null) ...[
            Text(
              _error!,
              style: const TextStyle(color: Colors.red, fontSize: 12),
            ),
            const SizedBox(height: 8),
          ],
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed: _isSending ? null : _send,
              style: FilledButton.styleFrom(
                backgroundColor: EliteColors.champagne,
                foregroundColor: Colors.white,
              ),
              child: _isSending
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Gửi yêu cầu'),
            ),
          ),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// CREATE POST
// -------------------------------------------------------------
class RoommateCreateScreen extends StatefulWidget {
  const RoommateCreateScreen({super.key});

  @override
  State<RoommateCreateScreen> createState() => _RoommateCreateScreenState();
}

class _RoommateCreateScreenState extends State<RoommateCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _rentController = TextEditingController();
  final _addressController = TextEditingController();
  late final _phoneController = TextEditingController(
    text: AuthService.currentUser.value?.phone ?? '',
  );
  String _district = kRoommateDistricts.first;
  String _gender = 'Không yêu cầu';
  int _maxPeople = 2;
  int _currentPeople = 1;
  final Set<String> _habits = {'Sạch sẽ'};
  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _rentController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      await RoommateApi.createPost(
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        sharedRent: double.parse(
          _rentController.text.replaceAll(RegExp(r'[^0-9]'), ''),
        ),
        maxPeople: _maxPeople,
        currentPeople: _currentPeople,
        genderPreference: _gender,
        requiredHabits: _habits.toList(),
        district: _district,
        address: _addressController.text.trim(),
        contactPhone: _phoneController.text.replaceAll(RegExp(r'[\s-]'), ''),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đăng tin tìm bạn ở ghép thành công!')),
      );
      Navigator.pop(context, true);
    } on RoommateApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Widget _counter(
    String label,
    int value,
    int min,
    int max,
    ValueChanged<int> onChanged,
  ) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: EliteColors.border),
        ),
        child: Column(
          children: [
            Text(label, style: const TextStyle(fontSize: 12)),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  onPressed: value > min ? () => onChanged(value - 1) : null,
                  icon: const Icon(Icons.remove_circle_outline),
                ),
                Text(
                  '$value',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                IconButton(
                  onPressed: value < max ? () => onChanged(value + 1) : null,
                  icon: const Icon(Icons.add_circle_outline),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Đăng tin tìm bạn ở ghép')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            TextFormField(
              controller: _titleController,
              maxLength: 120,
              decoration: const InputDecoration(
                labelText: 'Tiêu đề',
                hintText: 'VD: Tìm 1 bạn nữ ở ghép studio gần HUIT',
              ),
              validator: (v) => (v ?? '').trim().length < 10
                  ? 'Tiêu đề tối thiểu 10 ký tự.'
                  : null,
            ),
            const SizedBox(height: 6),
            TextFormField(
              controller: _rentController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Tiền phòng chia mỗi người (VNĐ/tháng)',
                hintText: 'VD: 2100000',
              ),
              validator: (v) {
                final amount = int.tryParse(
                  (v ?? '').replaceAll(RegExp(r'[^0-9]'), ''),
                );
                return amount == null || amount < 100000
                    ? 'Nhập số tiền hợp lệ (tối thiểu 100.000đ).'
                    : null;
              },
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _district,
              decoration: const InputDecoration(labelText: 'Khu vực'),
              items: [
                for (final d in kRoommateDistricts)
                  DropdownMenuItem(value: d, child: Text(d)),
              ],
              onChanged: (v) => setState(() => _district = v ?? _district),
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _addressController,
              decoration: const InputDecoration(
                labelText: 'Địa chỉ / tòa nhà',
                hintText: 'VD: 140 Lê Trọng Tấn, Tây Thạnh',
              ),
              validator: (v) =>
                  (v ?? '').trim().isEmpty ? 'Vui lòng nhập địa chỉ.' : null,
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                _counter(
                  'Số người tối đa',
                  _maxPeople,
                  2,
                  8,
                  (v) => setState(() {
                    _maxPeople = v;
                    if (_currentPeople >= v) _currentPeople = v - 1;
                  }),
                ),
                const SizedBox(width: 10),
                _counter(
                  'Đang ở',
                  _currentPeople,
                  1,
                  _maxPeople - 1,
                  (v) => setState(() => _currentPeople = v),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const _SectionTitle('Tìm bạn giới tính'),
            Wrap(
              spacing: 8,
              children: [
                for (final g in kRoommateGenderOptions)
                  ChoiceChip(
                    label: Text(g),
                    selected: _gender == g,
                    showCheckmark: false,
                    selectedColor: EliteColors.champagne,
                    labelStyle: TextStyle(
                      color: _gender == g ? Colors.white : EliteColors.deepNavy,
                    ),
                    onSelected: (_) => setState(() => _gender = g),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            const _SectionTitle('Thói quen mong muốn'),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                for (final h in kRoommateHabitOptions)
                  FilterChip(
                    label: Text(h, style: const TextStyle(fontSize: 12)),
                    selected: _habits.contains(h),
                    selectedColor: EliteColors.champagne.withValues(
                      alpha: 0.22,
                    ),
                    checkmarkColor: EliteColors.champagneHover,
                    onSelected: (on) =>
                        setState(() => on ? _habits.add(h) : _habits.remove(h)),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descriptionController,
              maxLines: 5,
              maxLength: 1500,
              decoration: const InputDecoration(
                labelText: 'Mô tả phòng và bản thân',
                alignLabelWithHint: true,
              ),
              validator: (v) => (v ?? '').trim().length < 30
                  ? 'Mô tả tối thiểu 30 ký tự để người khác hiểu rõ hơn.'
                  : null,
            ),
            const SizedBox(height: 6),
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'SĐT liên hệ'),
              validator: (v) =>
                  RegExp(
                    r'^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$',
                  ).hasMatch((v ?? '').replaceAll(RegExp(r'[\s-]'), ''))
                  ? null
                  : 'SĐT Việt Nam không hợp lệ.',
            ),
            const SizedBox(height: 16),
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 10),
            ],
            SizedBox(
              height: 50,
              child: FilledButton(
                onPressed: _isSubmitting ? null : _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: EliteColors.champagne,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Đăng bài',
                        style: TextStyle(fontWeight: FontWeight.w700),
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
// INBOX: received / sent requests and my posts
// -------------------------------------------------------------
class RoommateInboxScreen extends StatefulWidget {
  const RoommateInboxScreen({super.key});

  @override
  State<RoommateInboxScreen> createState() => _RoommateInboxScreenState();
}

class _RoommateInboxScreenState extends State<RoommateInboxScreen> {
  List<RoommateRequest> _received = [];
  List<RoommateRequest> _sent = [];
  List<RoommatePost> _myPosts = [];
  bool _isLoading = true;
  String? _error;
  final Set<String> _updating = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = AuthService.currentUser.value;
    if (user == null) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        RoommateApi.fetchReceivedRequests(user.id),
        RoommateApi.fetchSentRequests(user.id),
        RoommateApi.fetchPosts(authorId: user.id),
      ]);
      if (!mounted) return;
      setState(() {
        _received = results[0] as List<RoommateRequest>;
        _sent = results[1] as List<RoommateRequest>;
        _myPosts = results[2] as List<RoommatePost>;
      });
    } on RoommateApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _setStatus(RoommateRequest request, String status) async {
    setState(() => _updating.add(request.id));
    try {
      await RoommateApi.updateRequestStatus(request.id, status);
      await _load();
    } on RoommateApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _updating.remove(request.id));
    }
  }

  Widget _body(List<Widget> children, String emptyText) {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: _isLoading
            ? const [
                Padding(
                  padding: EdgeInsets.only(top: 48),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ]
            : _error != null
            ? [
                _MessageBox(
                  icon: Icons.cloud_off_rounded,
                  title: 'Không tải được dữ liệu',
                  message: _error!,
                  actionLabel: 'Thử lại',
                  onAction: _load,
                ),
              ]
            : children.isEmpty
            ? [
                _MessageBox(
                  icon: Icons.inbox_outlined,
                  title: 'Chưa có gì ở đây',
                  message: emptyText,
                ),
              ]
            : children,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Yêu cầu ở ghép'),
          bottom: TabBar(
            labelColor: EliteColors.deepNavy,
            unselectedLabelColor: Colors.grey,
            indicatorColor: EliteColors.champagne,
            tabs: [
              Tab(text: 'Đã nhận (${_received.length})'),
              Tab(text: 'Đã gửi (${_sent.length})'),
              Tab(text: 'Bài của tôi (${_myPosts.length})'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _body([
              for (final r in _received)
                _RequestCard(
                  request: r,
                  incoming: true,
                  isUpdating: _updating.contains(r.id),
                  onAccept: () => _setStatus(r, 'ACCEPTED'),
                  onReject: () => _setStatus(r, 'REJECTED'),
                ),
            ], 'Khi có người muốn ở ghép với bạn, yêu cầu sẽ hiện tại đây.'),
            _body([
              for (final r in _sent) _RequestCard(request: r, incoming: false),
            ], 'Bạn chưa gửi yêu cầu ở ghép nào.'),
            _body([
              for (final p in _myPosts)
                _RoommatePostCard(
                  post: p,
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => RoommateDetailScreen(post: p),
                    ),
                  ),
                ),
            ], 'Bạn chưa đăng bài tìm bạn ở ghép nào.'),
          ],
        ),
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.request,
    required this.incoming,
    this.isUpdating = false,
    this.onAccept,
    this.onReject,
  });

  final RoommateRequest request;
  final bool incoming;
  final bool isUpdating;
  final VoidCallback? onAccept;
  final VoidCallback? onReject;

  (String, Color) get _statusStyle => switch (request.status) {
    'ACCEPTED' => ('Đã chấp nhận', const Color(0xFF2F6FB5)),
    'REJECTED' => ('Đã từ chối', Colors.grey),
    _ => ('Đang chờ phản hồi', EliteColors.champagneHover),
  };

  @override
  Widget build(BuildContext context) {
    final (statusText, statusColor) = _statusStyle;
    final showPhone =
        incoming &&
        request.status == 'ACCEPTED' &&
        request.requesterPhone.isNotEmpty;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: EliteColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  incoming ? request.requesterName : request.postTitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: EliteColors.deepNavy,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          if (incoming) ...[
            const SizedBox(height: 2),
            Text(
              'Bài: ${request.postTitle}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
            ),
          ],
          if (request.message.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              '“${request.message}”',
              style: const TextStyle(fontSize: 13, height: 1.4),
            ),
          ],
          if (request.createdAt != null) ...[
            const SizedBox(height: 6),
            Text(
              DateFormat(
                'HH:mm dd/MM/yyyy',
              ).format(request.createdAt!.toLocal()),
              style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
            ),
          ],
          if (showPhone) ...[
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () => _copyPhone(context, request.requesterPhone),
              icon: const Icon(Icons.phone_outlined, size: 18),
              label: Text('Liên hệ ${request.requesterPhone}'),
              style: OutlinedButton.styleFrom(
                foregroundColor: EliteColors.deepNavy,
                side: const BorderSide(color: EliteColors.champagne),
              ),
            ),
          ],
          if (incoming && request.status == 'PENDING') ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: isUpdating ? null : onReject,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: EliteColors.deepNavy,
                      side: const BorderSide(color: EliteColors.border),
                    ),
                    child: const Text('Từ chối'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: isUpdating ? null : onAccept,
                    style: FilledButton.styleFrom(
                      backgroundColor: EliteColors.champagne,
                      foregroundColor: Colors.white,
                    ),
                    child: isUpdating
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Chấp nhận'),
                  ),
                ),
              ],
            ),
          ],
          if (!incoming && request.status == 'ACCEPTED') ...[
            const SizedBox(height: 8),
            const Text(
              'Người đăng đã chấp nhận và sẽ liên hệ bạn qua SĐT đã đăng ký.',
              style: TextStyle(fontSize: 12, color: Color(0xFF2F6FB5)),
            ),
          ],
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// SMALL WIDGETS
// -------------------------------------------------------------
class _Badge extends StatelessWidget {
  const _Badge({required this.text, this.color = EliteColors.champagneHover});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _HabitTag extends StatelessWidget {
  const _HabitTag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: EliteColors.champagne.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 11, color: EliteColors.deepNavy),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 17, color: EliteColors.champagneHover),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(
          fontWeight: FontWeight.w800,
          fontSize: 15,
          color: EliteColors.deepNavy,
        ),
      ),
    );
  }
}

class _MessageBox extends StatelessWidget {
  const _MessageBox({
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: EliteColors.border),
      ),
      child: Column(
        children: [
          Icon(icon, size: 36, color: EliteColors.champagneHover),
          const SizedBox(height: 8),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              color: EliteColors.deepNavy,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
          ),
          if (actionLabel != null && onAction != null)
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(
                foregroundColor: EliteColors.champagneHover,
              ),
              child: Text(actionLabel!),
            ),
        ],
      ),
    );
  }
}
