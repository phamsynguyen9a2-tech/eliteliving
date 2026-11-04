import 'package:flutter/material.dart';

import 'auth.dart';
import 'main.dart' show EliteColors;
import 'tenant_api.dart';

/// Login / register screen for tenants. Pops with `true` once signed in.
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, this.initialTab = 0});

  /// 0 = Đăng nhập, 1 = Đăng ký.
  final int initialTab;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      initialIndex: widget.initialTab,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Tài khoản Elite Living'),
          bottom: const TabBar(
            labelColor: EliteColors.deepNavy,
            unselectedLabelColor: Colors.grey,
            indicatorColor: EliteColors.champagne,
            indicatorWeight: 3,
            labelStyle: TextStyle(fontWeight: FontWeight.w700),
            tabs: [
              Tab(text: 'Đăng nhập'),
              Tab(text: 'Đăng ký'),
            ],
          ),
        ),
        body: const TabBarView(children: [_LoginForm(), _RegisterForm()]),
      ),
    );
  }
}

final _phoneRegex = RegExp(
  r'^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$',
);

String _clean(String value) => value.replaceAll(RegExp(r'[\s-]'), '');

class _LoginForm extends StatefulWidget {
  const _LoginForm();

  @override
  State<_LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<_LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  final _otpController = TextEditingController();
  bool _obscure = true;
  bool _isLoading = false;
  String? _error;

  // Đăng nhập bằng mã OTP, như web
  bool _otpMode = false;
  bool _otpSent = false;
  bool _otpSending = false;
  String? _otpNotice;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  String get _identifier {
    final identifier = _identifierController.text.trim();
    return identifier.contains('@') ? identifier : _clean(identifier);
  }

  Future<void> _requestOtp() async {
    FocusScope.of(context).unfocus();
    if (_identifier.isEmpty) {
      setState(
        () => _error = 'Vui lòng nhập Email hoặc Số điện thoại để nhận mã OTP.',
      );
      return;
    }
    setState(() {
      _otpSending = true;
      _error = null;
      _otpNotice = null;
    });
    try {
      final result = await TenantApi.requestAuthOtp(_identifier, 'LOGIN');
      if (!mounted) return;
      setState(() {
        _otpSent = true;
        _otpNotice = result.developmentCode == null
            ? result.message
            : '${result.message} Mã thử nghiệm: ${result.developmentCode}';
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _otpSending = false);
    }
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      if (_otpMode) {
        await AuthService.loginWithOtp(
          identifier: _identifier,
          code: _otpController.text,
        );
      } else {
        await AuthService.login(
          identifier: _identifier,
          password: _passwordController.text,
        );
      }
      if (mounted) Navigator.pop(context, true);
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _FormShell(
      formKey: _formKey,
      heading: 'Chào mừng trở lại',
      subheading: 'Đăng nhập để đồng bộ lịch hẹn với web Elite Living.',
      error: _error,
      fields: [
        SegmentedButton<bool>(
          segments: const [
            ButtonSegment(value: false, label: Text('Mật khẩu')),
            ButtonSegment(value: true, label: Text('Mã OTP')),
          ],
          selected: {_otpMode},
          showSelectedIcon: false,
          style: SegmentedButton.styleFrom(
            selectedBackgroundColor: EliteColors.champagne,
            selectedForegroundColor: Colors.white,
            foregroundColor: EliteColors.deepNavy,
          ),
          onSelectionChanged: (selection) => setState(() {
            _otpMode = selection.first;
            _error = null;
          }),
        ),
        TextFormField(
          controller: _identifierController,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Email hoặc số điện thoại',
            prefixIcon: Icon(Icons.person_outline_rounded),
          ),
          validator: (value) {
            final text = (value ?? '').trim();
            if (text.isEmpty) return 'Vui lòng nhập Email hoặc SĐT.';
            if (text.contains('@')) return null;
            return _phoneRegex.hasMatch(_clean(text))
                ? null
                : 'Số điện thoại không hợp lệ.';
          },
        ),
        if (_otpMode) ...[
          TextFormField(
            controller: _otpController,
            keyboardType: TextInputType.number,
            maxLength: 6,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _submit(),
            decoration: InputDecoration(
              labelText: 'Mã OTP gồm 6 chữ số',
              prefixIcon: const Icon(Icons.password_rounded),
              counterText: '',
              suffixIcon: TextButton(
                onPressed: _otpSending ? null : _requestOtp,
                style: TextButton.styleFrom(
                  foregroundColor: EliteColors.champagneHover,
                ),
                child: Text(
                  _otpSending
                      ? 'Đang gửi…'
                      : _otpSent
                      ? 'Gửi lại'
                      : 'Nhận mã',
                ),
              ),
            ),
            validator: (value) => RegExp(r'^\d{6}$').hasMatch((value ?? '').trim())
                ? null
                : 'Vui lòng nhập mã OTP gồm 6 chữ số.',
          ),
          if (_otpNotice != null)
            Text(
              _otpNotice!,
              style: const TextStyle(
                fontSize: 12,
                color: EliteColors.deepNavy,
              ),
            ),
        ] else ...[
          TextFormField(
            controller: _passwordController,
            obscureText: _obscure,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _submit(),
            decoration: InputDecoration(
              labelText: 'Mật khẩu',
              prefixIcon: const Icon(Icons.lock_outline_rounded),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscure
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                ),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
            validator: (value) =>
                (value ?? '').length < 6 ? 'Mật khẩu tối thiểu 6 ký tự.' : null,
          ),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
              ),
              style: TextButton.styleFrom(
                foregroundColor: EliteColors.champagneHover,
                visualDensity: VisualDensity.compact,
              ),
              child: const Text('Quên mật khẩu?'),
            ),
          ),
        ],
      ],
      submitLabel: 'Đăng nhập',
      isLoading: _isLoading,
      onSubmit: _submit,
      footer: TextButton(
        onPressed: () => DefaultTabController.of(context).animateTo(1),
        style: TextButton.styleFrom(
          foregroundColor: EliteColors.champagneHover,
        ),
        child: const Text('Chưa có tài khoản? Đăng ký ngay'),
      ),
    );
  }
}

/// Đặt lại mật khẩu bằng mã OTP gửi về Email hoặc SĐT, như web.
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _codeController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _sending = false;
  bool _saving = false;
  String? _error;
  String? _notice;

  @override
  void dispose() {
    _identifierController.dispose();
    _codeController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  String get _identifier {
    final identifier = _identifierController.text.trim();
    return identifier.contains('@') ? identifier : _clean(identifier);
  }

  Future<void> _requestCode() async {
    FocusScope.of(context).unfocus();
    if (_identifier.isEmpty) {
      setState(() => _error = 'Vui lòng nhập Email hoặc Số điện thoại của tài khoản.');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
      _notice = null;
    });
    try {
      final result = await TenantApi.requestAuthOtp(
        _identifier,
        'RESET_PASSWORD',
      );
      if (!mounted) return;
      setState(() {
        _notice = result.developmentCode == null
            ? result.message
            : '${result.message} Mã thử nghiệm: ${result.developmentCode}';
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final message = await TenantApi.resetPasswordWithOtp(
        identifier: _identifier,
        code: _codeController.text.trim(),
        newPassword: _passwordController.text,
        confirmPassword: _confirmController.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
      Navigator.pop(context);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Quên mật khẩu')),
      body: _FormShell(
        formKey: _formKey,
        heading: 'Đặt lại mật khẩu',
        subheading: 'Nhập Email hoặc SĐT của tài khoản để nhận mã OTP.',
        error: _error,
        fields: [
          TextFormField(
            controller: _identifierController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Email hoặc số điện thoại',
              prefixIcon: Icon(Icons.person_outline_rounded),
            ),
            validator: (value) => (value ?? '').trim().isEmpty
                ? 'Vui lòng nhập Email hoặc SĐT.'
                : null,
          ),
          TextFormField(
            controller: _codeController,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: InputDecoration(
              labelText: 'Mã OTP gồm 6 chữ số',
              prefixIcon: const Icon(Icons.password_rounded),
              counterText: '',
              suffixIcon: TextButton(
                onPressed: _sending ? null : _requestCode,
                style: TextButton.styleFrom(
                  foregroundColor: EliteColors.champagneHover,
                ),
                child: Text(_sending ? 'Đang gửi…' : 'Nhận mã'),
              ),
            ),
            validator: (value) => RegExp(r'^\d{6}$').hasMatch((value ?? '').trim())
                ? null
                : 'Vui lòng nhập mã OTP gồm 6 chữ số.',
          ),
          if (_notice != null)
            Text(
              _notice!,
              style: const TextStyle(fontSize: 12, color: EliteColors.deepNavy),
            ),
          TextFormField(
            controller: _passwordController,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Mật khẩu mới',
              prefixIcon: Icon(Icons.lock_outline_rounded),
            ),
            validator: (value) => (value ?? '').length < 6
                ? 'Mật khẩu mới phải có tối thiểu 6 ký tự.'
                : null,
          ),
          TextFormField(
            controller: _confirmController,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Nhập lại mật khẩu mới',
              prefixIcon: Icon(Icons.lock_outline_rounded),
            ),
            validator: (value) => value != _passwordController.text
                ? 'Mật khẩu xác nhận không khớp.'
                : null,
          ),
        ],
        submitLabel: 'Đặt lại mật khẩu',
        isLoading: _saving,
        onSubmit: _submit,
        footer: const SizedBox.shrink(),
      ),
    );
  }
}

class _RegisterForm extends StatefulWidget {
  const _RegisterForm();

  @override
  State<_RegisterForm> createState() => _RegisterFormState();
}

class _RegisterFormState extends State<_RegisterForm> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _obscure = true;
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await AuthService.register(
        name: _nameController.text,
        email: _emailController.text.toLowerCase(),
        phone: _clean(_phoneController.text),
        password: _passwordController.text,
      );
      if (mounted) Navigator.pop(context, true);
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _FormShell(
      formKey: _formKey,
      heading: 'Tạo tài khoản khách thuê',
      subheading: 'Dùng chung tài khoản cho cả app và web Elite Living.',
      error: _error,
      fields: [
        TextFormField(
          controller: _nameController,
          textCapitalization: TextCapitalization.words,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Họ và tên',
            prefixIcon: Icon(Icons.badge_outlined),
          ),
          validator: (value) {
            final length = (value ?? '').trim().length;
            return length < 2 || length > 100
                ? 'Họ tên phải từ 2 đến 100 ký tự.'
                : null;
          },
        ),
        TextFormField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Email',
            prefixIcon: Icon(Icons.alternate_email_rounded),
          ),
          validator: (value) {
            final text = (value ?? '').trim();
            return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(text)
                ? null
                : 'Vui lòng nhập Email hợp lệ.';
          },
        ),
        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Số điện thoại (không bắt buộc)',
            prefixIcon: Icon(Icons.phone_outlined),
          ),
          validator: (value) {
            final text = _clean(value ?? '');
            if (text.isEmpty) return null;
            return _phoneRegex.hasMatch(text)
                ? null
                : 'SĐT Việt Nam không hợp lệ (VD: 0901234567).';
          },
        ),
        TextFormField(
          controller: _passwordController,
          obscureText: _obscure,
          textInputAction: TextInputAction.next,
          decoration: InputDecoration(
            labelText: 'Mật khẩu',
            prefixIcon: const Icon(Icons.lock_outline_rounded),
            suffixIcon: IconButton(
              icon: Icon(
                _obscure
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
              ),
              onPressed: () => setState(() => _obscure = !_obscure),
            ),
          ),
          validator: (value) =>
              (value ?? '').length < 6 ? 'Mật khẩu tối thiểu 6 ký tự.' : null,
        ),
        TextFormField(
          controller: _confirmController,
          obscureText: _obscure,
          textInputAction: TextInputAction.done,
          onFieldSubmitted: (_) => _submit(),
          decoration: const InputDecoration(
            labelText: 'Nhập lại mật khẩu',
            prefixIcon: Icon(Icons.lock_reset_rounded),
          ),
          validator: (value) => value != _passwordController.text
              ? 'Mật khẩu nhập lại không khớp.'
              : null,
        ),
      ],
      submitLabel: 'Đăng ký',
      isLoading: _isLoading,
      onSubmit: _submit,
      footer: TextButton(
        onPressed: () => DefaultTabController.of(context).animateTo(0),
        style: TextButton.styleFrom(
          foregroundColor: EliteColors.champagneHover,
        ),
        child: const Text('Đã có tài khoản? Đăng nhập'),
      ),
    );
  }
}

class _FormShell extends StatelessWidget {
  const _FormShell({
    required this.formKey,
    required this.heading,
    required this.subheading,
    required this.error,
    required this.fields,
    required this.submitLabel,
    required this.isLoading,
    required this.onSubmit,
    required this.footer,
  });

  final GlobalKey<FormState> formKey;
  final String heading;
  final String subheading;
  final String? error;
  final List<Widget> fields;
  final String submitLabel;
  final bool isLoading;
  final VoidCallback onSubmit;
  final Widget footer;

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
        children: [
          Text(
            heading,
            style: const TextStyle(
              color: EliteColors.deepNavy,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subheading,
            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
          ),
          const SizedBox(height: 20),
          for (final field in fields) ...[field, const SizedBox(height: 14)],
          if (error != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF4E5),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: EliteColors.champagne),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.error_outline_rounded,
                    color: EliteColors.champagneHover,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      error!,
                      style: const TextStyle(
                        color: EliteColors.deepNavy,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
          ],
          SizedBox(
            height: 50,
            child: FilledButton(
              onPressed: isLoading ? null : onSubmit,
              style: FilledButton.styleFrom(
                backgroundColor: EliteColors.champagne,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: isLoading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      submitLabel,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 8),
          Center(child: footer),
        ],
      ),
    );
  }
}
