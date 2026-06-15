import 'package:image_picker/image_picker.dart';

/// 统一图片选择 + 上传前压缩参数。
///
/// 所有「选图后上传」的入口都应走这里，保证全站压缩策略一致：
/// 之前各屏 maxWidth/imageQuality 不统一（部分甚至未设质量，接近原图），
/// 导致上传体积偏大、耗时长。这里集中收紧。
class ImagePick {
  ImagePick._();

  static final ImagePicker _picker = ImagePicker();

  /// 内容图（作品、设计、聊天、下单、反馈等）：长边 ≤ 1440，JPEG 质量 80。
  static Future<XFile?> content({ImageSource source = ImageSource.gallery}) {
    return _picker.pickImage(
        source: source, maxWidth: 1440, maxHeight: 1440, imageQuality: 80);
  }

  /// 多选内容图（作品集等）。
  static Future<List<XFile>> contentMulti() {
    return _picker.pickMultiImage(
        maxWidth: 1440, maxHeight: 1440, imageQuality: 80);
  }

  /// 头像：512×512，JPEG 质量 85（小而清晰）。
  static Future<XFile?> avatar({ImageSource source = ImageSource.gallery}) {
    return _picker.pickImage(
        source: source, maxWidth: 512, maxHeight: 512, imageQuality: 85);
  }
}
