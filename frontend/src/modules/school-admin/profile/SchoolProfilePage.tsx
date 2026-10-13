import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import {
  School,
  FileText,
  Plus,
  Save,
  Trash2,
  ExternalLink,
  Eye,
  CheckCircle2,
  AlertCircle,
  Share2,
  Sparkles,
  Image as ImageIcon,
  User,
  Globe,
  Tag,
} from 'lucide-react';

export const SchoolProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'BLOGS'>('PROFILE');
  const [profile, setProfile] = useState<any>(null);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Profile Form
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    motto: '',
    aboutHtml: '',
    headerImageUrl: '',
    managerName: '',
    managerMessage: '',
    eitaa: '',
    shad: '',
    bale: '',
    telegram: '',
    instagram: '',
  });

  // Blog Modal
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [isSubmittingBlog, setIsSubmittingBlog] = useState(false);
  const [blogError, setBlogError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [blogForm, setBlogForm] = useState({
    title: '',
    slug: '',
    content: '',
    coverImageUrl: '',
    tags: '',
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [profileRes, blogsRes] = await Promise.allSettled([
        apiClient.get('/profiles/school'),
        apiClient.get('/profiles/blogs'),
      ]);

      if (profileRes.status === 'fulfilled') {
        const p = profileRes.value.data || {};
        setProfile(p);
        setProfileForm({
          motto: p.motto || '',
          aboutHtml: p.aboutHtml || '',
          headerImageUrl: p.headerImageUrl || '',
          managerName: p.managerName || '',
          managerMessage: p.managerMessage || '',
          eitaa: p.socialLinks?.eitaa || '',
          shad: p.socialLinks?.shad || '',
          bale: p.socialLinks?.bale || '',
          telegram: p.socialLinks?.telegram || '',
          instagram: p.socialLinks?.instagram || '',
        });
      }

      if (blogsRes.status === 'fulfilled') {
        setBlogs(blogsRes.value.data || []);
      }
    } catch (err) {
      console.error('Failed to load profile data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccess(null);
    try {
      await apiClient.patch('/profiles/school', {
        motto: profileForm.motto,
        aboutHtml: profileForm.aboutHtml,
        headerImageUrl: profileForm.headerImageUrl,
        managerName: profileForm.managerName,
        managerMessage: profileForm.managerMessage,
        socialLinks: {
          eitaa: profileForm.eitaa,
          shad: profileForm.shad,
          bale: profileForm.bale,
          telegram: profileForm.telegram,
          instagram: profileForm.instagram,
        },
      });
      setProfileSuccess('مشخصات و بیوگرافی مدرسه با موفقیت ذخیره شد.');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در ذخیره مشخصات مدرسه');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCreateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBlog(true);
    setBlogError(null);
    try {
      const tagsArray = blogForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const generatedSlug =
        blogForm.slug.trim() ||
        blogForm.title
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-') + `-${Date.now()}`;

      await apiClient.post('/profiles/blogs', {
        title: blogForm.title.trim(),
        slug: generatedSlug,
        content: blogForm.content.trim(),
        coverImageUrl: blogForm.coverImageUrl.trim() || undefined,
        tags: tagsArray,
        isPublished: true,
      });

      setIsBlogModalOpen(false);
      setBlogForm({ title: '', slug: '', content: '', coverImageUrl: '', tags: '' });
      const res = await apiClient.get('/profiles/blogs');
      setBlogs(res.data || []);
    } catch (err: any) {
      setBlogError(err.response?.data?.message || 'خطا در ثبت مقاله');
    } finally {
      setIsSubmittingBlog(false);
    }
  };

  const handleDeleteBlog = async (id: string, title: string) => {
    if (!window.confirm(`آیا از حذف مقاله «${title}» اطمینان دارید؟`)) return;
    try {
      await apiClient.delete(`/profiles/blogs/${id}`);
      setBlogs((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در حذف مقاله');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <ResponsivePageHeader
        icon={School}
        title="پروفایل رسمی مدرسه"
        actions={
          <div className="flex items-center space-x-2 space-x-reverse">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/app/media'}
              className="flex items-center space-x-1.5 space-x-reverse text-xs dark:bg-[#1C2536] dark:text-white dark:border-gray-700"
            >
              <Sparkles className="h-4 w-4 ml-1 text-primary" />
              <span>رسانه و رویدادهای هنرستان</span>
            </Button>
            {activeTab === 'BLOGS' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsBlogModalOpen(true)}
                className="flex items-center space-x-1.5 space-x-reverse text-xs"
              >
                <Plus className="h-4 w-4 ml-1" />
                <span>انتشار خبر جدید</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex space-x-2 space-x-reverse border-b border-gray-200">
        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse ${
            activeTab === 'PROFILE'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <School className="h-4 w-4" />
          <span>مشخصات عمومی و هویت بصری</span>
        </button>

        <button
          onClick={() => setActiveTab('BLOGS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse ${
            activeTab === 'BLOGS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>اخبار، مقالات و دستاوردها ({blogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Profile Form */}
      {activeTab === 'PROFILE' && (
        <form onSubmit={handleSaveProfile} className="space-y-6 max-w-4xl">
          {profileSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 space-x-reverse">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-sm text-ink-darker flex items-center gap-2 border-b pb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>شعار و معرفی عمومی</span>
            </h3>

            <Input
              label="شعار رسمی مدرسه"
              placeholder="مثال: پیشرو در آموزش‌های مهارتی، فناوری و نوآوری"
              value={profileForm.motto}
              onChange={(e) => setProfileForm({ ...profileForm, motto: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
                متن معرفی / درباره مدرسه
              </label>
              <textarea
                rows={4}
                value={profileForm.aboutHtml}
                onChange={(e) => setProfileForm({ ...profileForm, aboutHtml: e.target.value })}
                placeholder="معرفی جامع تاریخچه، اهداف آموزشی، امکانات کارگاهی و چشم‌انداز مدرسه..."
                className="w-full rounded-xl border border-gray-300 p-3 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <Input
              label="آدرس اینترنتی تصویر بنر مدرسه"
              placeholder="https://..."
              value={profileForm.headerImageUrl}
              onChange={(e) => setProfileForm({ ...profileForm, headerImageUrl: e.target.value })}
            />
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-sm text-ink-darker flex items-center gap-2 border-b pb-3">
              <User className="h-4 w-4 text-primary" />
              <span>راهبری و پیام رسمی</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="نام و نام خانوادگی راهبر"
                placeholder="مثال: دکتر صادقی"
                value={profileForm.managerName}
                onChange={(e) => setProfileForm({ ...profileForm, managerName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
                پیام راهبر به دانش‌آموزان و اولیا
              </label>
              <textarea
                rows={3}
                value={profileForm.managerMessage}
                onChange={(e) => setProfileForm({ ...profileForm, managerMessage: e.target.value })}
                placeholder="پیام خوش‌آمدگویی و توصیه‌های آموزشی راهبر مدرسه..."
                className="w-full rounded-xl border border-gray-300 p-3 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-sm text-ink-darker flex items-center gap-2 border-b pb-3">
              <Globe className="h-4 w-4 text-primary" />
              <span>کانال‌ها و شبکه‌های اجتماعی مدرسه</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="لینک کانال ایتا"
                placeholder="https://eitaa.com/..."
                value={profileForm.eitaa}
                onChange={(e) => setProfileForm({ ...profileForm, eitaa: e.target.value })}
              />
              <Input
                label="لینک کانال شاد"
                placeholder="https://shad.ir/..."
                value={profileForm.shad}
                onChange={(e) => setProfileForm({ ...profileForm, shad: e.target.value })}
              />
              <Input
                label="لینک پیام‌رسان بله"
                placeholder="https://ble.ir/..."
                value={profileForm.bale}
                onChange={(e) => setProfileForm({ ...profileForm, bale: e.target.value })}
              />
              <Input
                label="کانال تلگرام"
                placeholder="https://t.me/..."
                value={profileForm.telegram}
                onChange={(e) => setProfileForm({ ...profileForm, telegram: e.target.value })}
              />
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" isLoading={isSavingProfile}>
              <Save className="h-4 w-4 ml-1.5" />
              <span>ذخیره تغییرات پروفایل</span>
            </Button>
          </div>
        </form>
      )}

      {/* Tab 2: Blogs Grid */}
      {activeTab === 'BLOGS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-40 w-full rounded-xl mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </Card>
            ))
          ) : blogs.length === 0 ? (
            <div className="col-span-3 text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-500">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <div className="text-sm font-bold text-ink-dark mb-1">هنوز مقاله‌ای منتشر نشده است</div>
              <p className="text-xs text-gray-400 mb-4">
                برای اشتراک‌گذاری اخبار، رویدادها یا مقالات علمی مدرسه از دکمه زیر استفاده کنید.
              </p>
              <Button variant="primary" size="sm" onClick={() => setIsBlogModalOpen(true)}>
                <Plus className="h-4 w-4 ml-1" />
                <span>اولین مقاله را ثبت کنید</span>
              </Button>
            </div>
          ) : (
            blogs.map((b) => (
              <Card
                key={b.id}
                className="flex flex-col justify-between overflow-hidden border border-gray-200 hover:border-primary/50 transition-all rounded-2xl bg-white"
              >
                {b.coverImageUrl ? (
                  <img src={b.coverImageUrl} alt={b.title} className="h-44 w-full object-cover" />
                ) : (
                  <div className="h-32 bg-gradient-to-br from-primary-light/40 to-primary/20 flex items-center justify-center">
                    <FileText className="h-10 w-10 text-primary/60" />
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] text-gray-400">
                        {new Date(b.createdAt).toLocaleDateString('fa-IR')}
                      </span>
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{b.viewCount || 0} بازدید</span>
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-ink-darker mb-2 line-clamp-2">{b.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 mb-4">{b.content}</p>

                    {b.tags && b.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {b.tags.map((t: string, idx: number) => (
                          <span
                            key={idx}
                            className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px] font-medium"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs font-bold text-gray-600">
                      {b.author?.firstName} {b.author?.lastName}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteBlog(b.id, b.title)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="حذف مقاله"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedPost(b);
                          setIsViewModalOpen(true);
                        }}
                        className="text-xs h-8 px-2.5"
                      >
                        <Eye className="h-3.5 w-3.5 ml-1" />
                        <span>مشاهده کامل</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modal: Create Blog Post */}
      <Modal
        isOpen={isBlogModalOpen}
        onClose={() => setIsBlogModalOpen(false)}
        title="انتشار مقاله یا خبر جدید"
        description="ثبت رویدادها، اخبار و مطالب علمی در وبلاگ مدرسه"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateBlog} className="space-y-4">
          {blogError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{blogError}</span>
            </div>
          )}

          <Input
            label="عنوان مقاله یا خبر *"
            placeholder="مثال: برگزاری کارگاه تخصصی هوش مصنوعی و مهندسی داده در هنرستان رکاد"
            value={blogForm.title}
            onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="اسلاگ آدرس (اختیاری)"
              placeholder="مثال: ai-data-workshop"
              value={blogForm.slug}
              onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
            />
            <Input
              label="آدرس تصویر شاخص (URL کاور)"
              placeholder="https://..."
              value={blogForm.coverImageUrl}
              onChange={(e) => setBlogForm({ ...blogForm, coverImageUrl: e.target.value })}
            />
          </div>

          <Input
            label="برچسب‌ها (با کاما جدا کنید)"
            placeholder="مثال: کارگاه, آموزش, کامپیوتر, رکاد"
            value={blogForm.tags}
            onChange={(e) => setBlogForm({ ...blogForm, tags: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
              متن کامل مقاله *
            </label>
            <textarea
              rows={8}
              required
              value={blogForm.content}
              onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
              placeholder="شرح کامل خبر یا دستاورد..."
              className="w-full rounded-xl border border-gray-300 p-3.5 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsBlogModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingBlog}>
              انتشار در وبلاگ
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Blog Details */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={selectedPost?.title || 'مشاهده مقاله'}
        description={`منتشرشده در ${selectedPost ? new Date(selectedPost.createdAt).toLocaleDateString('fa-IR') : ''}`}
        maxWidth="lg"
      >
        {selectedPost && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pl-1">
            {selectedPost.coverImageUrl && (
              <img
                src={selectedPost.coverImageUrl}
                alt={selectedPost.title}
                className="w-full max-h-64 object-cover rounded-xl border"
              />
            )}
            <div className="text-sm text-ink-normal leading-relaxed whitespace-pre-line">
              {selectedPost.content}
            </div>

            {selectedPost.tags && selectedPost.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-4 border-t">
                {selectedPost.tags.map((t: string, idx: number) => (
                  <Badge key={idx} variant="neutral" className="text-xs">
                    #{t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
