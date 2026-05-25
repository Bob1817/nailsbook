import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { designService } from '../services/design';
import { uploadService } from '../services/upload';

// 基础款式选项
const baseStyles = [
  { id: 'french', name: '法式', icon: '🇫🇷', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80' },
  { id: 'gradient', name: '渐变', icon: '🌸', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80' },
  { id: 'cat-eye', name: '猫眼', icon: '✨', image: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=400&q=80' },
  { id: 'nude', name: '裸色', icon: '🤎', image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&q=80' },
  { id: 'geometric', name: '几何', icon: '🔷', image: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=400&q=80' },
  { id: 'floral', name: '花卉', icon: '🌺', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80' },
];

// 甲型选项
const nailShapes = [
  { id: 'square', name: '方形', description: '经典方头' },
  { id: 'round', name: '圆形', description: '柔和圆润' },
  { id: 'almond', name: '杏仁', description: '优雅修长' },
  { id: 'stiletto', name: '尖形', description: '个性时尚' },
  { id: 'coffin', name: '梯形', description: '潮流前卫' },
  { id: 'oval', name: '椭圆', description: '自然百搭' },
];

// 颜色选项
const colorOptions = [
  { id: 'pink', name: '粉色系', hex: '#FFB6C1' },
  { id: 'red', name: '红色系', hex: '#DC143C' },
  { id: 'nude', name: '裸色系', hex: '#D2B48C' },
  { id: 'white', name: '白色系', hex: '#FFFFFF' },
  { id: 'black', name: '黑色系', hex: '#1a1a1a' },
  { id: 'blue', name: '蓝色系', hex: '#4169E1' },
  { id: 'purple', name: '紫色系', hex: '#9370DB' },
  { id: 'green', name: '绿色系', hex: '#3CB371' },
  { id: 'gold', name: '金色系', hex: '#FFD700' },
  { id: 'silver', name: '银色系', hex: '#C0C0C0' },
];

// 元素/配饰选项
const elementOptions = [
  { id: 'rhinestone', name: '水钻', icon: '💎' },
  { id: 'pearl', name: '珍珠', icon: '⚪' },
  { id: 'glitter', name: '闪粉', icon: '✨' },
  { id: 'foil', name: '金箔', icon: '🥇' },
  { id: 'sticker', name: '贴纸', icon: '🏷️' },
  { id: 'line', name: '线条', icon: '📏' },
  { id: 'dot', name: '波点', icon: '🔘' },
  { id: 'marble', name: '大理石', icon: '🪨' },
];

const CustomizeDesign: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 选择状态
  const [selectedBase, setSelectedBase] = useState<string>('');
  const [selectedShape, setSelectedShape] = useState<string>('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customImage, setCustomImage] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // 处理颜色选择
  const toggleColor = (colorId: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorId)
        ? prev.filter((c) => c !== colorId)
        : [...prev, colorId]
    );
  };

  // 处理元素选择
  const toggleElement = (elementId: string) => {
    setSelectedElements((prev) =>
      prev.includes(elementId)
        ? prev.filter((e) => e !== elementId)
        : [...prev, elementId]
    );
  };

  // 处理自定义图片上传
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const result = await uploadService.uploadImage(files[0]);
      setCustomImage(result.url);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('图片上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  // 生成预览标题
  const generateTitle = () => {
    const parts: string[] = [];
    if (selectedBase) {
      const base = baseStyles.find((b) => b.id === selectedBase);
      if (base) parts.push(base.name);
    }
    if (selectedShape) {
      const shape = nailShapes.find((s) => s.id === selectedShape);
      if (shape) parts.push(shape.name);
    }
    if (selectedColors.length > 0) {
      const colorNames = selectedColors
        .map((id) => colorOptions.find((c) => c.id === id)?.name)
        .filter(Boolean);
      if (colorNames.length > 0) parts.push(colorNames.join('+'));
    }
    return parts.length > 0 ? parts.join(' ') : '自定义设计';
  };

  // 提交设计
  const handleSubmit = async () => {
    if (!selectedBase && !customImage) {
      alert('请选择基础款式或上传参考图片');
      return;
    }

    setSubmitting(true);
    try {
      const imageUrls: string[] = [];
      if (customImage) {
        imageUrls.push(customImage);
      } else if (selectedBase) {
        const base = baseStyles.find((b) => b.id === selectedBase);
        if (base) imageUrls.push(base.image);
      }

      const fullDescription = `
${description}

【设计配置】
基础款: ${selectedBase ? baseStyles.find(b => b.id === selectedBase)?.name : '无'}
甲型: ${selectedShape ? nailShapes.find(s => s.id === selectedShape)?.name : '无'}
颜色: ${selectedColors.map(id => colorOptions.find(c => c.id === id)?.name).join(', ') || '无'}
配饰: ${selectedElements.map(id => elementOptions.find(e => e.id === id)?.name).join(', ') || '无'}
      `.trim();

      await designService.createDesign({
        title: title.trim() || generateTitle(),
        imageUrls,
        description: fullDescription,
      });
      navigate('/designs');
    } catch {
      alert('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 步骤配置
  const steps = [
    { id: 1, name: '基础款' },
    { id: 2, name: '甲型' },
    { id: 3, name: '颜色' },
    { id: 4, name: '配饰' },
    { id: 5, name: '预览' },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-body font-medium text-[var(--color-text)]">选择基础款式</h3>
              <span className="text-caption text-[var(--color-text-muted)]">或上传参考图</span>
            </div>

            {/* Base Styles Grid */}
            <div className="grid grid-cols-2 gap-3">
              {baseStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => {
                    setSelectedBase(style.id);
                    setCustomImage('');
                  }}
                  className={`relative aspect-[4/5] rounded-xl overflow-hidden ${
                    selectedBase === style.id
                      ? 'ring-2 ring-[var(--color-primary)] ring-offset-2'
                      : ''
                  }`}
                >
                  <img
                    src={style.image}
                    alt={style.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <span className="text-white text-body font-medium">{style.name}</span>
                  </div>
                  {selectedBase === style.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Custom Upload Option */}
            <div className="pt-4 border-t border-[var(--color-border-light)]">
              <p className="text-caption text-[var(--color-text-muted)] mb-3">或者上传你喜欢的参考图片</p>
              {customImage ? (
                <div className="relative aspect-video rounded-xl overflow-hidden">
                  <img src={customImage} alt="参考图" className="w-full h-full object-cover" />
                  <button
                    onClick={() => {
                      setCustomImage('');
                      setSelectedBase('');
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 hover:border-[var(--color-primary)] transition-colors"
                >
                  {uploading ? (
                    <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-body-sm text-slate-400">点击上传参考图</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-body font-medium text-[var(--color-text)]">选择甲型</h3>
            <div className="grid grid-cols-3 gap-3">
              {nailShapes.map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => setSelectedShape(shape.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedShape === shape.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                      : 'border-slate-100 bg-white'
                  }`}
                >
                  <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-slate-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                  <p className="text-body-sm font-medium text-[var(--color-text)]">{shape.name}</p>
                  <p className="text-caption text-[var(--color-text-muted)] mt-1">{shape.description}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-body font-medium text-[var(--color-text)]">选择颜色（可多选）</h3>
            <div className="grid grid-cols-5 gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color.id}
                  onClick={() => toggleColor(color.id)}
                  className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${
                    selectedColors.includes(color.id)
                      ? 'bg-[var(--color-primary-soft)]'
                      : 'bg-white'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full border-2 shadow-sm ${
                      selectedColors.includes(color.id)
                        ? 'border-[var(--color-primary)] scale-110'
                        : 'border-slate-200'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-caption text-[var(--color-text)]">{color.name}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-body font-medium text-[var(--color-text)]">选择配饰元素（可多选）</h3>
            <div className="grid grid-cols-4 gap-3">
              {elementOptions.map((element) => (
                <button
                  key={element.id}
                  onClick={() => toggleElement(element.id)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    selectedElements.includes(element.id)
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                      : 'border-slate-100 bg-white'
                  }`}
                >
                  <span className="text-2xl">{element.icon}</span>
                  <p className="text-caption text-[var(--color-text)] mt-1">{element.name}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-body font-medium text-[var(--color-text)]">设计预览</h3>

            {/* Preview Card */}
            <div className="bg-white rounded-2xl overflow-hidden card-shadow">
              {/* Preview Image */}
              <div className="aspect-square bg-slate-100 relative">
                {customImage ? (
                  <img src={customImage} alt="预览" className="w-full h-full object-cover" />
                ) : selectedBase ? (
                  <img
                    src={baseStyles.find((b) => b.id === selectedBase)?.image}
                    alt="预览"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Design Details */}
              <div className="p-4 space-y-3">
                {/* Title Input */}
                <div>
                  <label className="block text-caption text-[var(--color-text-muted)] mb-1">设计标题</label>
                  <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder={generateTitle()}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl text-body font-medium text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                </div>

                <h4 className="text-body font-medium text-[var(--color-text)]">{title || generateTitle()}</h4>

                <div className="flex flex-wrap gap-2">
                  {selectedShape && (
                    <span className="text-caption px-2 py-1 bg-slate-100 rounded-full text-[var(--color-text)]">
                      {nailShapes.find((s) => s.id === selectedShape)?.name}
                    </span>
                  )}
                  {selectedColors.map((colorId) => (
                    <span
                      key={colorId}
                      className="text-caption px-2 py-1 rounded-full text-white"
                      style={{ backgroundColor: colorOptions.find((c) => c.id === colorId)?.hex }}
                    >
                      {colorOptions.find((c) => c.id === colorId)?.name}
                    </span>
                  ))}
                  {selectedElements.map((elementId) => (
                    <span key={elementId} className="text-caption px-2 py-1 bg-slate-100 rounded-full text-[var(--color-text)]">
                      {elementOptions.find((e) => e.id === elementId)?.name}
                    </span>
                  ))}
                </div>

                {/* Description Input */}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="添加设计描述或特殊要求..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-body-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-none"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#fff8fa_0%,#f8f9fc_24%,#f5f6f8_100%)]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/82 px-5 app-header-safe pb-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white shadow-sm ring-1 ring-black/5 flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Creative Design</p>
            <h1 className="mt-0.5 text-heading-2 text-[var(--color-text)]">设计美甲</h1>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-white/82 px-5 py-4 border-b border-[var(--color-border-light)] backdrop-blur-md">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex flex-col items-center gap-1 ${
                  currentStep === step.id
                    ? 'text-[var(--color-primary)]'
                    : currentStep > step.id
                    ? 'text-emerald-500'
                    : 'text-slate-300'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-body-sm font-medium ${
                    currentStep === step.id
                      ? 'bg-[var(--color-primary)] text-white'
                      : currentStep > step.id
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {currentStep > step.id ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                <span className="text-caption">{step.name}</span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-emerald-200' : 'bg-slate-100'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-5 pb-32">
        <div className="rounded-[28px] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
          {renderStepContent()}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/94 border-t border-[var(--color-border-light)] px-5 py-4 backdrop-blur-md safe-area-bottom">
        <div className="flex gap-3">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 py-3.5 bg-slate-100 text-[var(--color-text)] text-body font-medium rounded-full active:scale-95 transition-transform"
            >
              上一步
            </button>
          )}
          {currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 1 && !selectedBase && !customImage}
              className="flex-1 py-3.5 bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] text-white text-body font-medium rounded-full active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-200"
            >
              下一步
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3.5 bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] text-white text-body font-medium rounded-full active:scale-95 transition-transform disabled:opacity-50 shadow-lg shadow-pink-200"
            >
              {submitting ? '保存中...' : '保存设计'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomizeDesign;
