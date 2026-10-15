import 'package:flutter/material.dart';

import 'auth.dart';
import 'main.dart' show EliteColors;

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
          title: const Text('Tài khoản SmartTro'),
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
  bool _obscure = true;
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
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
      final identifier = _identifierController.text.trim();
      await AuthService.login(
        identifier: identifier.contains('@') ? identifier : _clean(identifier),
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
      heading: 'Chào mừng trở lại',
      subheading: 'Đăng nhập để đồng bộ lịch hẹn với web SmartTro.',
      error: _error,
      fields: [
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
      subheading: 'Dùng chung tài khoản cho cả app và web SmartTro.',
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
