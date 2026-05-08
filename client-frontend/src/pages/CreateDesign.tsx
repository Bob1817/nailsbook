import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { designService } from '../services/design';
import { uploadService } from '../services/upload';

const CreateDesign: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const result = await uploadService.uploadImage(file);
        return result.url;
      });

      const urls = await Promise.all(uploadPromises);
      setImages((prev) => [...prev, ...urls]);
    } catch (error) {
      console.error('Failed to upload images:', error);
      alert('图片上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (images.length === 0) {
      alert('请至少上传一张图片');
      return;
    }

    setSubmitting(true);
    try {
      await designService.createDesign({
        title: title.trim() || undefined,
        imageUrls: images,
        description,
      });
      navigate('/designs');
    } catch (error: any) {
      alert(error.response?.data?.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#fff8fa_0%,#f8f9fc_24%,#f5f6f8_100%)]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/82 px-5 app-header-safe pb-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white shadow-sm ring-1 ring-black/5 flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Reference Upload</p>
            <h1 className="mt-0.5 text-lg font-semibold text-gray-900">上传设计</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Image Upload */}
        <div className="bg-white rounded-[28px] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            设计标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给你的设计起个名字..."
            className="w-full px-4 py-3 bg-gray-50 rounded-2xl text-gray-900 outline-none focus:ring-2 focus:ring-[#FF6B8A]/20"
          />
        </div>

        {/* Image Upload */}
        <div className="bg-white rounded-[28px] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            上传图片 <span className="text-gray-400">({images.length}/9)</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {images.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
                <img src={url} alt={`设计${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {images.length < 9 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 bg-[#fffafc] flex flex-col items-center justify-center gap-2 hover:border-[#FF6B8A] transition-colors"
              >
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-[#FF6B8A] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs text-gray-400">添加图片</span>
                  </>
                )}
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        {/* Description */}
        <div className="bg-white rounded-[28px] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
          <label className="block text-sm font-medium text-gray-700 mb-3">设计描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述您想要的美甲款式，如：想做类似图片的猫眼款式..."
            rows={5}
            className="w-full px-4 py-3 bg-gray-50 rounded-2xl text-gray-900 outline-none focus:ring-2 focus:ring-[#FF6B8A]/20 resize-none"
          />
        </div>

        {/* Tips */}
        <div className="rounded-[24px] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">上传建议</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                上传清晰的参考图片，并详细描述你的风格偏好，方便美甲师理解设计方向。
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || images.length === 0}
          className="w-full py-4 bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] text-white rounded-full font-medium shadow-lg shadow-pink-200 btn-pressed disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '提交中...' : '提交设计'}
        </button>
      </form>
    </div>
  );
};

export default CreateDesign;
