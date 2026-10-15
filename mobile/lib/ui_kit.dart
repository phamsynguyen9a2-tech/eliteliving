import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'main.dart' show EliteColors;

final NumberFormat vnd = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

const String kFallbackRoomImage =
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';

/// Formats `YYYY-MM-DD` (or ISO) dates as dd/MM/yyyy.
String formatDate(String raw) {
  final parsed = DateTime.tryParse(raw);
  return parsed == null ? raw : DateFormat('dd/MM/yyyy').format(parsed);
}

ButtonStyle eliteFilledStyle({double height = 48}) => FilledButton.styleFrom(
  backgroundColor: EliteColors.champagne,
  foregroundColor: Colors.white,
  minimumSize: Size.fromHeight(height),
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
);

ButtonStyle eliteOutlinedStyle({double height = 48}) =>
    OutlinedButton.styleFrom(
      foregroundColor: EliteColors.deepNavy,
      side: const BorderSide(color: EliteColors.champagne),
      minimumSize: Size.fromHeight(height),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    );

void showSnack(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

class EliteCard extends StatelessWidget {
  const EliteCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(14),
    this.margin = const EdgeInsets.only(bottom: 12),
    this.onTap,
  });

  final Widget child;
  final EdgeInsets padding;
  final EdgeInsets margin;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: EliteColors.border),
        boxShadow: [
          BoxShadow(
            color: EliteColors.deepNavy.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
    return onTap == null ? card : GestureDetector(onTap: onTap, child: card);
  }
}

class EliteSectionTitle extends StatelessWidget {
  const EliteSectionTitle(this.text, {super.key, this.trailing});

  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 15,
                color: EliteColors.deepNavy,
              ),
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

class EliteStatusChip extends StatelessWidget {
  const EliteStatusChip(this.text, {super.key, this.color});

  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? EliteColors.champagneHover;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        text,
        style: TextStyle(color: c, fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class EliteInfoRow extends StatelessWidget {
  const EliteInfoRow({
    super.key,
    required this.label,
    required this.value,
    this.bold = false,
  });

  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 5,
            child: Text(
              label,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
          ),
          Expanded(
            flex: 6,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 13,
                color: EliteColors.deepNavy,
                fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class EliteMessageBox extends StatelessWidget {
  const EliteMessageBox({
    super.key,
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
    return EliteCard(
      margin: const EdgeInsets.only(top: 12, bottom: 12),
      padding: const EdgeInsets.all(20),
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

class EliteChoiceChips<T> extends StatelessWidget {
  const EliteChoiceChips({
    super.key,
    required this.options,
    required this.selected,
    required this.onSelected,
  });

  final List<(T, String)> options;
  final T selected;
  final ValueChanged<T> onSelected;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 6,
      children: [
        for (final (value, label) in options)
          ChoiceChip(
            label: Text(label),
            selected: value == selected,
            showCheckmark: false,
            selectedColor: EliteColors.champagne,
            backgroundColor: Colors.white,
            side: BorderSide(
              color: value == selected
                  ? EliteColors.champagne
                  : EliteColors.border,
            ),
            labelStyle: TextStyle(
              fontSize: 12,
              color: value == selected ? Colors.white : EliteColors.deepNavy,
              fontWeight: value == selected ? FontWeight.w700 : FontWeight.w500,
            ),
            onSelected: (_) => onSelected(value),
          ),
      ],
    );
  }
}
