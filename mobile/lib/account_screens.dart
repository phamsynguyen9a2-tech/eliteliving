import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'auth.dart';
import 'main.dart' show EliteColors;
import 'roommate.dart' show kRoommateHabitOptions;
import 'tenant_api.dart';
import 'ui_kit.dart';

final RegExp _vnPhone = RegExp(
  r'^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$',
);

String _cleanPhone(String v) => v.replaceAll(RegExp(r'[\s-]'), '');

// -------------------------------------------------------------
// EDIT PROFILE
// -------------------------------------------------------------
class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController(
    text: AuthService.currentUser.value?.name ?? '',
  );
  final _phoneController = TextEditingController(
    text: AuthService.currentUser.value?.phone ?? '',
  );
  bool _isSaving = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isSaving = true;
      _error = null;
    });
    final name = _nameController.text.trim();
    final phone = _cleanPhone(_phoneController.text);
    try {
      final message = await TenantApi.updateProfile(name: name, phone: phone);
      final phoneChanged = phone != AuthService.currentUser.value?.phone;
      await AuthService.updateSession({
        'name': name,
        'phone': phone,
        // A new number must be verified again before deposits/contracts.
        if (phoneChanged) 'phoneVerified': false,
      });
      if (!mounted) return;
      showSnack(context, message);
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final email = AuthService.currentUser.value?.email ?? '';
    return Scaffold(
      appBar: AppBar(title: const Text('Sửa hồ sơ')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              initialValue: email,
              enabled: false,
              decoration: const InputDecoration(labelText: 'Email'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _nameController,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Họ và tên'),
              validator: (v) {
                final length = (v ?? '').trim().length;
                return length < 2 || length > 100
                    ? 'Họ tên phải từ 2 đến 100 ký tự.'
                    : null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Số điện thoại'),
              validator: (v) => _vnPhone.hasMatch(_cleanPhone(v ?? ''))
                  ? null
                  : 'SĐT Việt Nam không hợp lệ.',
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _isSaving ? null : _save,
              style: eliteFilledStyle(height: 50),
              child: Text(_isSaving ? 'Đang lưu...' : 'Lưu thay đổi'),
            ),
          ],
        ),
      ),
    );
  }
}

// -------------------------------------------------------------
// CHANGE PASSWORD (same rules as web PATCH /api/user/profile)
// -------------------------------------------------------------
const kMinPasswordLength = 6;

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();
  // Accounts created via Google / OTP have no password: first set needs no current one.
  bool _hasPassword = true;
  bool _isLoading = true;
  bool _isSaving = false;
  bool _obscure = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _currentController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final profile = await TenantApi.fetchProfile();
      if (mounted) setState(() => _hasPassword = profile.hasPassword);
    } on ApiException {
      // Keep asking for the current password; the server decides anyway.
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isSaving = true;
      _error = null;
    });
    try {
      final message = await TenantApi.changePassword(
        currentPassword: _hasPassword ? _currentController.text : '',
        newPassword: _newController.text,
        confirmPassword: _confirmController.text,
      );
      if (!mounted) return;
      showSnack(context, message);
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  InputDecoration _decoration(String label) => InputDecoration(
    labelText: label,
    suffixIcon: IconButton(
      tooltip: _obscure ? 'Hiện mật khẩu' : 'Ẩn mật khẩu',
      icon: Icon(
        _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
      ),
      onPressed: () => setState(() => _obscure = !_obscure),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final title = _hasPassword ? 'Đổi mật khẩu' : 'Đặt mật khẩu';
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(
                    _hasPassword
                        ? 'Nhập mật khẩu hiện tại để xác nhận trước khi đặt mật khẩu mới.'
                        : 'Tài khoản đăng nhập bằng Google / OTP chưa có mật khẩu. '
                              'Đặt mật khẩu để đăng nhập bằng email hoặc SĐT.',
                    style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                  ),
                  const SizedBox(height: 16),
                  if (_hasPassword) ...[
                    TextFormField(
                      controller: _currentController,
                      obscureText: _obscure,
                      decoration: _decoration('Mật khẩu hiện tại'),
                      validator: (v) => (v ?? '').isEmpty
                          ? 'Vui lòng nhập mật khẩu hiện tại.'
                          : null,
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextFormField(
                    controller: _newController,
                    obscureText: _obscure,
                    decoration: _decoration('Mật khẩu mới'),
                    validator: (v) {
                      final value = v ?? '';
                      if (value.length < kMinPasswordLength) {
                        return 'Mật khẩu mới phải có tối thiểu $kMinPasswordLength ký tự.';
                      }
                      if (_hasPassword && value == _currentController.text) {
                        return 'Mật khẩu mới phải khác mật khẩu hiện tại.';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _confirmController,
                    obscureText: _obscure,
                    decoration: _decoration('Nhập lại mật khẩu mới'),
                    validator: (v) => v != _newController.text
                        ? 'Mật khẩu xác nhận không khớp với mật khẩu mới.'
                        : null,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 10),
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _isSaving ? null : _save,
                    style: eliteFilledStyle(height: 50),
                    child: Text(_isSaving ? 'Đang lưu...' : title),
                  ),
                ],
              ),
            ),
    );
  }
}

// -------------------------------------------------------------
// PHONE VERIFICATION (OTP)
// -------------------------------------------------------------
class PhoneVerifyScreen extends StatefulWidget {
  const PhoneVerifyScreen({super.key});

  @override
  State<PhoneVerifyScreen> createState() => _PhoneVerifyScreenState();
}

class _PhoneVerifyScreenState extends State<PhoneVerifyScreen> {
  final _phoneController = TextEditingController(
    text: AuthService.currentUser.value?.phone ?? '',
  );
  final _codeController = TextEditingController();
  bool _codeSent = false;
  bool _busy = false;
  String? _info;
  String? _error;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _requestCode() async {
    final phone = _cleanPhone(_phoneController.text);
    if (!_vnPhone.hasMatch(phone)) {
      setState(() => _error = 'SĐT Việt Nam không hợp lệ.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await TenantApi.requestPhoneOtp(phone);
      if (!mounted) return;
      setState(() {
        _codeSent = true;
        _info = result.developmentCode == null
            ? result.message
            : '${result.message}\nMã thử nghiệm: ${result.developmentCode}';
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    final phone = _cleanPhone(_phoneController.text);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await TenantApi.verifyPhoneOtp(phone, _codeController.text.trim());
      await AuthService.updateSession({'phone': phone, 'phoneVerified': true});
      if (!mounted) return;
      showSnack(context, 'Xác minh số điện thoại thành công!');
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Xác minh số điện thoại')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'SĐT đã xác minh được dùng để đặt cọc, nhận hợp đồng điện tử '
            'và để chủ trọ liên hệ.',
            style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            enabled: !_codeSent,
            decoration: const InputDecoration(labelText: 'Số điện thoại'),
          ),
          if (_codeSent) ...[
            const SizedBox(height: 12),
            TextField(
              controller: _codeController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              decoration: const InputDecoration(labelText: 'Mã OTP 6 số'),
            ),
          ],
          if (_info != null)
            EliteCard(
              margin: const EdgeInsets.only(top: 8),
              child: Text(_info!, style: const TextStyle(fontSize: 13)),
            ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : (_codeSent ? _verify : _requestCode),
            style: eliteFilledStyle(height: 50),
            child: Text(
              _busy
                  ? 'Đang xử lý...'
                  : _codeSent
                  ? 'Xác minh'
                  : 'Gửi mã OTP',
            ),
          ),
          if (_codeSent)
            TextButton(
              onPressed: _busy
                  ? null
                  : () => setState(() {
                      _codeSent = false;
                      _info = null;
                      _codeController.clear();
                    }),
              child: const Text('Đổi số / gửi lại mã'),
            ),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// NOTIFICATIONS
// -------------------------------------------------------------
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<AppNotification> _items = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final email = AuthService.currentUser.value?.email ?? '';
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final items = await TenantApi.fetchNotifications(email);
      if (mounted) setState(() => _items = items);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _markRead(AppNotification n) async {
    if (n.isRead) return;
    try {
      await TenantApi.markNotificationRead(n.id);
      _load();
    } on ApiException {
      // Non-critical.
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Thông báo')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.only(top: 48),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              EliteMessageBox(
                icon: Icons.cloud_off_rounded,
                title: 'Không tải được thông báo',
                message: _error!,
                actionLabel: 'Thử lại',
                onAction: _load,
              )
            else if (_items.isEmpty)
              const EliteMessageBox(
                icon: Icons.notifications_none_rounded,
                title: 'Chưa có thông báo',
                message:
                    'Thông báo hóa đơn, hợp đồng và lịch hẹn sẽ hiện tại đây.',
              )
            else
              for (final n in _items)
                EliteCard(
                  onTap: () => _markRead(n),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        n.isRead
                            ? Icons.mark_email_read_outlined
                            : Icons.mark_email_unread_rounded,
                        color: EliteColors.champagneHover,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              n.subject,
                              style: TextStyle(
                                fontWeight: n.isRead
                                    ? FontWeight.w500
                                    : FontWeight.w800,
                                color: EliteColors.deepNavy,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              n.summary,
                              style: TextStyle(
                                color: Colors.grey.shade700,
                                fontSize: 12,
                              ),
                            ),
                            if (n.sentAt != null)
                              Text(
                                DateFormat(
                                  'HH:mm dd/MM/yyyy',
                                ).format(n.sentAt!.toLocal()),
                                style: TextStyle(
                                  color: Colors.grey.shade500,
                                  fontSize: 11,
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

// -------------------------------------------------------------
// ROOMMATE PROFILE (same fields as web /o-ghep/ho-so)
// -------------------------------------------------------------
class RoommateProfileScreen extends StatefulWidget {
  const RoommateProfileScreen({super.key});

  @override
  State<RoommateProfileScreen> createState() => _RoommateProfileScreenState();
}

class _RoommateProfileScreenState extends State<RoommateProfileScreen> {
  final _ageController = TextEditingController();
  final _occupationController = TextEditingController();
  final _bioController = TextEditingController();
  String _gender = 'Nữ';
  String _lifestyle = 'Introvert';
  final Set<String> _habits = {};
  bool _petFriendly = false;
  bool _smoking = false;
  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _ageController.dispose();
    _occupationController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final p = await TenantApi.fetchRoommateProfile();
      if (p != null && mounted) {
        setState(() {
          _gender = p.gender;
          _lifestyle = p.lifestyle;
          _habits
            ..clear()
            ..addAll(p.habits);
          _petFriendly = p.petFriendly;
          _smoking = p.smokingStatus;
          _ageController.text = p.age?.toString() ?? '';
          _occupationController.text = p.occupation;
          _bioController.text = p.bio;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _save() async {
    setState(() {
      _isSaving = true;
      _error = null;
    });
    try {
      await TenantApi.saveRoommateProfile(
        RoommateProfileData(
          gender: _gender,
          age: int.tryParse(_ageController.text),
          occupation: _occupationController.text.trim(),
          lifestyle: _lifestyle,
          habits: _habits.toList(),
          bio: _bioController.text.trim(),
          petFriendly: _petFriendly,
          smokingStatus: _smoking,
        ),
      );
      if (!mounted) return;
      showSnack(context, 'Cập nhật hồ sơ ở ghép thành công!');
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hồ sơ ở ghép')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  'Hồ sơ giúp hệ thống tính độ phù hợp khi bạn tìm bạn ở ghép.',
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                ),
                const SizedBox(height: 12),
                const EliteSectionTitle('Giới tính'),
                EliteChoiceChips<String>(
                  options: const [
                    ('Nữ', 'Nữ'),
                    ('Nam', 'Nam'),
                    ('Khác', 'Khác'),
                  ],
                  selected: _gender,
                  onSelected: (v) => setState(() => _gender = v),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    SizedBox(
                      width: 90,
                      child: TextField(
                        controller: _ageController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Tuổi'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _occupationController,
                        decoration: const InputDecoration(
                          labelText: 'Nghề nghiệp / trường',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const EliteSectionTitle('Tính cách'),
                EliteChoiceChips<String>(
                  options: const [
                    ('Introvert', 'Hướng nội'),
                    ('Extrovert', 'Hướng ngoại'),
                    ('Ambivert', 'Linh hoạt'),
                  ],
                  selected: _lifestyle,
                  onSelected: (v) => setState(() => _lifestyle = v),
                ),
                const SizedBox(height: 12),
                const EliteSectionTitle('Thói quen của bạn'),
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
                        onSelected: (on) => setState(
                          () => on ? _habits.add(h) : _habits.remove(h),
                        ),
                      ),
                  ],
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Chấp nhận thú cưng'),
                  value: _petFriendly,
                  activeThumbColor: EliteColors.champagne,
                  onChanged: (v) => setState(() => _petFriendly = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Tôi có hút thuốc'),
                  value: _smoking,
                  activeThumbColor: EliteColors.champagne,
                  onChanged: (v) => setState(() => _smoking = v),
                ),
                TextField(
                  controller: _bioController,
                  maxLines: 4,
                  maxLength: 500,
                  decoration: const InputDecoration(
                    labelText: 'Giới thiệu bản thân',
                    alignLabelWithHint: true,
                  ),
                ),
                if (_error != null) ...[
                  Text(_error!, style: const TextStyle(color: Colors.red)),
                  const SizedBox(height: 8),
                ],
                FilledButton(
                  onPressed: _isSaving ? null : _save,
                  style: eliteFilledStyle(height: 50),
                  child: Text(_isSaving ? 'Đang lưu...' : 'Lưu hồ sơ ở ghép'),
                ),
              ],
            ),
    );
  }
}
