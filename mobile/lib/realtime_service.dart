import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import 'auth.dart';
import 'main.dart' show kBaseUrl;

/// Một thay đổi từ kênh /api/events: chỉ gồm loại sự kiện và mã phòng.
class RealtimeChange {
  const RealtimeChange({required this.type, this.roomId});

  /// room | appointment | contract | bill | notification | review | roommate ...
  final String type;
  final int? roomId;
}

/// Đọc từng dòng Server-Sent Events, trả về thay đổi khi hết một sự kiện `change`.
class RealtimeFrameParser {
  String? _event;
  String? _data;

  RealtimeChange? addLine(String line) {
    if (line.isEmpty) {
      final event = _event;
      final data = _data;
      _event = null;
      _data = null;
      if (event != 'change' || data == null) return null;
      try {
        final json = jsonDecode(data);
        if (json is! Map || json['type'] is! String) return null;
        return RealtimeChange(
          type: json['type'] as String,
          roomId: (json['roomId'] as num?)?.toInt(),
        );
      } on FormatException {
        return null;
      }
    }
    if (line.startsWith('event:')) _event = line.substring(6).trim();
    if (line.startsWith('data:')) _data = line.substring(5).trim();
    return null;
  }
}

/// Nghe /api/events như `useRealtime` của web: gộp các sự kiện liên tiếp rồi gọi
/// [onChange] một lần, mất kết nối thì tự nối lại sau 5 giây.
class RealtimeListener {
  RealtimeListener({
    required this.types,
    required this.onChange,
    this.debounce = const Duration(milliseconds: 600),
  });

  final Set<String> types;
  final void Function(List<RealtimeChange> changes) onChange;
  final Duration debounce;

  static const _retryDelay = Duration(seconds: 5);

  http.Client? _client;
  StreamSubscription<String>? _subscription;
  Timer? _retryTimer;
  Timer? _debounceTimer;
  final List<RealtimeChange> _pending = [];
  bool _running = false;

  void start() {
    if (_running) return;
    _running = true;
    _connect();
  }

  void stop() {
    _running = false;
    _retryTimer?.cancel();
    _debounceTimer?.cancel();
    _subscription?.cancel();
    _subscription = null;
    _client?.close();
    _client = null;
    _pending.clear();
  }

  Future<void> _connect() async {
    final client = http.Client();
    _client = client;
    try {
      final request =
          http.Request(
              'GET',
              Uri.parse(
                '$kBaseUrl/api/events',
              ).replace(queryParameters: {'scope': 'tenant'}),
            )
            ..headers.addAll({
              ...AuthService.authHeaders,
              'Accept': 'text/event-stream',
            });
      final response = await client.send(request);
      if (!_running) return;
      if (response.statusCode != 200) {
        _retry();
        return;
      }
      final parser = RealtimeFrameParser();
      _subscription = response.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter())
          .listen(
            (line) {
              final change = parser.addLine(line);
              if (change != null && types.contains(change.type)) {
                _queue(change);
              }
            },
            onError: (Object e) {
              debugPrint('Realtime stream lỗi: $e');
              _retry();
            },
            onDone: _retry,
            cancelOnError: true,
          );
    } catch (e) {
      debugPrint('Realtime không kết nối được: $e');
      _retry();
    }
  }

  void _queue(RealtimeChange change) {
    _pending.add(change);
    _debounceTimer?.cancel();
    _debounceTimer = Timer(debounce, () {
      final batch = List<RealtimeChange>.of(_pending);
      _pending.clear();
      if (_running) onChange(batch);
    });
  }

  void _retry() {
    if (!_running) return;
    _subscription?.cancel();
    _subscription = null;
    _client?.close();
    _client = null;
    _retryTimer?.cancel();
    _retryTimer = Timer(_retryDelay, () {
      if (_running) _connect();
    });
  }
}
