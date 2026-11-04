import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'auth_screen.dart';
import 'main.dart' show EliteColors;
import 'tenant_api.dart';
import 'ui_kit.dart';

/// Hàng sao đánh giá; có [onChanged] thì bấm được để chọn số sao.
class EliteStarRating extends StatelessWidget {
  const EliteStarRating({
    super.key,
    required this.value,
    this.size = 16,
    this.onChanged,
  });

  final double value;
  final double size;
  final ValueChanged<int>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [for (var star = 1; star <= 5; star++) _star(star)],
    );
  }

  Widget _star(int star) {
    final icon = Icon(
      value >= star
          ? Icons.star_rounded
          : value >= star - 0.5
          ? Icons.star_half_rounded
          : Icons.star_outline_rounded,
      size: size,
      color: EliteColors.champagne,
    );
    if (onChanged == null) return icon;
    return IconButton(
      tooltip: '$star sao',
      visualDensity: VisualDensity.compact,
      onPressed: () => onChanged!(star),
      icon: icon,
    );
  }
}

/// Đánh giá của người thuê ở chi tiết phòng, cùng quy tắc với `RoomReviews.tsx`:
/// chỉ người đã thuê hoặc đã đi xem phòng mới viết được.
class RoomReviewsSection extends StatefulWidget {
  const RoomReviewsSection({
    super.key,
    required this.roomId,
    this.refreshKey = 0,
  });

  final int roomId;

  /// Đổi giá trị để tải lại, khi kênh thời gian thực báo có đánh giá mới.
  final int refreshKey;

  @override
  State<RoomReviewsSection> createState() => _RoomReviewsSectionState();
}

class _RoomReviewsSectionState extends State<RoomReviewsSection> {
  final _commentController = TextEditingController();
  RoomReviewsData? _data;
  String? _error;
  int _rating = 0;
  bool _editing = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(RoomReviewsSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshKey != widget.refreshKey ||
        oldWidget.roomId != widget.roomId) {
      _load();
    }
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await TenantApi.fetchReviews(widget.roomId);
      if (!mounted) return;
      setState(() {
        _data = data;
        _error = null;
        if (data.mine != null && !_editing) {
          _rating = data.mine!.rating;
          _commentController.text = data.mine!.comment;
        }
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _submit() async {
    if (_rating == 0) {
      showSnack(context, 'Vui lòng chọn số sao.');
      return;
    }
    setState(() => _saving = true);
    try {
      final message = await TenantApi.submitReview(
        roomId: widget.roomId,
        rating: _rating,
        comment: _commentController.text.trim(),
      );
      if (!mounted) return;
      setState(() => _editing = false);
      showSnack(context, message);
      await _load();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _remove(RoomReview review) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Xóa đánh giá của bạn?'),
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
            child: const Text('Xóa'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      final message = await TenantApi.deleteReview(review.id);
      if (!mounted) return;
      setState(() {
        _rating = 0;
        _commentController.clear();
      });
      showSnack(context, message);
      await _load();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    }
  }

  Future<void> _openLogin() async {
    final signedIn = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const AuthScreen()),
    );
    if (signedIn == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    final showForm =
        data != null && data.canReview && (data.mine == null || _editing);
    return EliteCard(
      margin: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Đánh giá của người thuê',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: EliteColors.deepNavy,
                  ),
                ),
              ),
              if (data != null && data.count > 0) ...[
                Text(
                  data.average.toStringAsFixed(1),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 18,
                    color: EliteColors.deepNavy,
                  ),
                ),
                const SizedBox(width: 4),
                EliteStarRating(value: data.average, size: 14),
              ],
            ],
          ),
          const SizedBox(height: 2),
          Text(
            data != null && data.count > 0
                ? '${data.count} đánh giá. Chỉ người đã thuê hoặc đã đi xem phòng mới viết được.'
                : 'Chỉ người đã thuê hoặc đã đi xem phòng mới viết được đánh giá.',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(
              _error!,
              style: const TextStyle(color: Color(0xFFC0392B), fontSize: 12),
            ),
          ],
          if (data != null) ...[
            if (data.count > 0) _distribution(data),
            if (!data.signedIn)
              TextButton(
                onPressed: _openLogin,
                style: TextButton.styleFrom(
                  foregroundColor: EliteColors.champagneHover,
                  padding: EdgeInsets.zero,
                ),
                child: const Text(
                  'Đăng nhập để đánh giá phòng đã thuê hoặc đã xem',
                ),
              ),
            if (data.signedIn && !data.canReview && data.mine == null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  'Bạn có thể đánh giá sau khi hoàn tất lịch xem phòng hoặc ký hợp đồng thuê phòng này.',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                ),
              ),
            if (data.mine != null && !_editing) _mine(data),
            if (showForm) _form(data),
            if (data.others.isEmpty && data.mine == null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  'Phòng chưa có đánh giá nào.',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                ),
              ),
            for (final review in data.others) _reviewTile(review),
          ],
        ],
      ),
    );
  }

  Widget _distribution(RoomReviewsData data) {
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(
        children: [
          for (final star in const [5, 4, 3, 2, 1])
            Padding(
              padding: const EdgeInsets.only(bottom: 3),
              child: Row(
                children: [
                  SizedBox(
                    width: 36,
                    child: Text(
                      '$star sao',
                      style: const TextStyle(fontSize: 11),
                    ),
                  ),
                  Expanded(
                    child: LinearProgressIndicator(
                      value: data.count == 0 || data.distribution.length < star
                          ? 0
                          : data.distribution[star - 1] / data.count,
                      minHeight: 5,
                      borderRadius: BorderRadius.circular(4),
                      color: EliteColors.champagne,
                      backgroundColor: EliteColors.border,
                    ),
                  ),
                  SizedBox(
                    width: 24,
                    child: Text(
                      '${data.distribution.length < star ? 0 : data.distribution[star - 1]}',
                      textAlign: TextAlign.right,
                      style: const TextStyle(fontSize: 11),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _mine(RoomReviewsData data) {
    final mine = data.mine!;
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: EliteColors.champagne.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: EliteColors.champagne.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Đánh giá của bạn',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: EliteColors.deepNavy,
                    fontSize: 13,
                  ),
                ),
              ),
              if (data.canReview)
                TextButton(
                  onPressed: () => setState(() => _editing = true),
                  style: TextButton.styleFrom(
                    foregroundColor: EliteColors.champagneHover,
                    visualDensity: VisualDensity.compact,
                  ),
                  child: const Text('Sửa'),
                ),
              IconButton(
                tooltip: 'Xóa đánh giá của bạn',
                visualDensity: VisualDensity.compact,
                onPressed: () => _remove(mine),
                icon: const Icon(Icons.delete_outline_rounded, size: 18),
              ),
            ],
          ),
          EliteStarRating(value: mine.rating.toDouble(), size: 15),
          if (mine.comment.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(mine.comment, style: const TextStyle(fontSize: 13)),
          ],
        ],
      ),
    );
  }

  Widget _form(RoomReviewsData data) {
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: EliteColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Bạn chấm phòng này mấy sao?',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 13,
              color: EliteColors.deepNavy,
            ),
          ),
          EliteStarRating(
            value: _rating.toDouble(),
            size: 26,
            onChanged: (v) => setState(() => _rating = v),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _commentController,
            maxLines: 3,
            maxLength: 1000,
            decoration: const InputDecoration(
              labelText: 'Nhận xét (không bắt buộc)',
              hintText: 'Phòng có giống ảnh không? Chủ trọ hỗ trợ thế nào?',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: _saving ? null : _submit,
                  style: eliteFilledStyle(height: 44),
                  child: Text(
                    _saving
                        ? 'Đang gửi…'
                        : data.mine != null
                        ? 'Lưu đánh giá'
                        : 'Gửi đánh giá',
                  ),
                ),
              ),
              if (_editing) ...[
                const SizedBox(width: 8),
                TextButton(
                  onPressed: () => setState(() => _editing = false),
                  child: const Text('Hủy'),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _reviewTile(RoomReview review) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  review.author,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: EliteColors.deepNavy,
                  ),
                ),
              ),
              if (review.createdAt != null)
                Text(
                  DateFormat('dd/MM/yyyy').format(review.createdAt!.toLocal()),
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
                ),
            ],
          ),
          EliteStarRating(value: review.rating.toDouble(), size: 14),
          if (review.comment.isNotEmpty) ...[
            const SizedBox(height: 3),
            Text(review.comment, style: const TextStyle(fontSize: 13)),
          ],
          if (review.landlordReply != null && review.landlordReply!.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(top: 6, left: 8),
              padding: const EdgeInsets.only(left: 8),
              decoration: const BoxDecoration(
                border: Border(
                  left: BorderSide(color: EliteColors.champagne, width: 2),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Chủ trọ phản hồi',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: EliteColors.champagneHover,
                    ),
                  ),
                  Text(
                    review.landlordReply!,
                    style: const TextStyle(fontSize: 13),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
