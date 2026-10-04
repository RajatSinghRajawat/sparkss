import { useState, useEffect } from 'react';
import { BookOpen, Plus, Play, Tag, Search, Video, Image, UploadCloud, AlertCircle, Clock, User, Layers } from 'lucide-react';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import MediaThumb from '../components/common/MediaThumb';
import { readVideoDuration, formatDuration } from '../utils/media';
import { endpoints, safeList } from '../services/api';

const EMPTY_FORM = { title: '', description: '', playlist: '', createdBy: '', duration: 0 };

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const [activeCourse, setActiveCourse] = useState(null);
  const [formError, setFormError] = useState('');

  // New Course Form state
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [progress, setProgress] = useState('');
  const [teacherPlaylists, setTeacherPlaylists] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const [coursesRes, teachRes] = await Promise.all([
        endpoints.courses.getAll({ search: search || undefined }),
        endpoints.teachers.getAll({ limit: 100 }).catch(() => ({ data: { data: [] } })),
      ]);

      setCourses(safeList(coursesRes));
      setTeachers(safeList(teachRes));
    } catch (err) {
      console.error('Failed to load courses:', err);
      setCourses([]);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchCourses, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const handleTeacherChange = async (teacherId) => {
    setFormData((f) => ({ ...f, createdBy: teacherId, playlist: '' }));
    setTeacherPlaylists([]);
    setFormError('');
    if (!teacherId) return;
    try {
      const res = await endpoints.playlists.getAll({ teacherId, limit: 100 });
      setTeacherPlaylists(safeList(res));
    } catch {
      setTeacherPlaylists([]);
    }
  };

  const handleVideoPick = async (file) => {
    setVideoFile(file || null);
    setFormError('');
    if (file) {
      const secs = await readVideoDuration(file);
      if (secs > 0) setFormData((f) => ({ ...f, duration: secs }));
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Please enter a course title.');
      return;
    }
    if (!formData.createdBy) {
      setFormError('Please select an instructing faculty member.');
      return;
    }
    if (!formData.playlist) {
      setFormError('Please select an assigned playlist for this instructor.');
      return;
    }
    if (!videoFile) {
      setFormError('Please choose a video file for this course.');
      return;
    }

    setSubmitting(true);
    try {
      setProgress('Uploading video lesson to storage...');
      const fd = new FormData();
      fd.append('video', videoFile);
      if (thumbFile) fd.append('thumbnail', thumbFile);
      const up = await endpoints.courses.upload(fd);
      const { videoKey, thumbnailKey } = up.data?.data ?? {};
      if (!videoKey) throw new Error('Upload failed: no video key returned.');

      setProgress('Saving and publishing course...');
      const payload = {
        title: formData.title.trim(),
        description: formData.description?.trim(),
        playlist: formData.playlist,
        createdBy: formData.createdBy,
        duration: Number(formData.duration) || 0,
        videoKey,
        thumbnailKey: thumbnailKey || undefined,
      };
      const res = await endpoints.courses.create(payload);
      if (res.data?.success) {
        setShowAddModal(false);
        setFormData(EMPTY_FORM);
        setVideoFile(null);
        setThumbFile(null);
        setTeacherPlaylists([]);
        setFormError('');
        fetchCourses();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create course');
    } finally {
      setSubmitting(false);
      setProgress('');
    }
  };

  const handlePreviewVideo = async (course) => {
    setActiveCourse(course);
    if (course.videoUrl) {
      setActiveVideoUrl(course.videoUrl);
      return;
    }
    try {
      const res = await endpoints.courses.getVideoUrl(course._id);
      const url = res.data?.data?.videoUrl || res.data?.data?.url;
      if (url) {
        setActiveVideoUrl(url);
      } else {
        alert('Video stream URL currently unavailable for this course.');
      }
    } catch {
      alert('Unable to generate secure video streaming URL.');
    }
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BookOpen size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Course Management Hub
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Publish, organize, and inspect educational courses ({Array.isArray(courses) ? courses.length : 0} listed)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
              }}
            />
            <input
              type="text"
              className="input-control"
              placeholder="Search course title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px' }}
            />
          </div>

          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Create Course
          </button>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
          Loading courses catalog...
        </div>
      ) : (!Array.isArray(courses) || courses.length === 0) ? (
        <div
          className="card"
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <BookOpen size={42} style={{ color: 'var(--text-dim)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            No courses found in catalog
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', maxWidth: '400px' }}>
            Get started by publishing your first curriculum or lecture series for students.
          </p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Publish First Course
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {courses.map((course) => (
            <div
              key={course._id}
              className="card card-hover"
              style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              {/* Thumbnail / Video banner */}
              <MediaThumb
                thumbnail={course.thumbnail}
                videoUrl={course.videoUrl}
                height="180px"
                background="rgba(0, 0, 0, 0.4)"
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(8, 12, 20, 0.4)',
                  }}
                />
                <button
                  onClick={() => handlePreviewVideo(course)}
                  className="btn"
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.9)',
                    color: '#090d16',
                    boxShadow: '0 0 20px rgba(245, 158, 11, 0.6)',
                    position: 'relative',
                    zIndex: 2,
                  }}
                  title="Play video lesson"
                >
                  <Play size={22} fill="currentColor" />
                </button>
                <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 2 }}>
                  <Badge variant={course.price > 0 ? 'warning' : 'success'}>
                    {course.price > 0 ? `₹${course.price}` : 'Free Access'}
                  </Badge>
                </div>
              </MediaThumb>

              {/* Course Info */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={13} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        {course.playlistTitle || course.category?.name || 'General Course'}
                      </span>
                    </div>
                    {course.teacherName && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {course.teacherName}
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', lineHeight: 1.3 }}>
                    {course.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.5,
                    }}
                  >
                    {course.description || 'No detailed syllabus summary available.'}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: '18px',
                    paddingTop: '14px',
                    borderTop: '1px solid var(--card-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'Active'}
                  </span>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    onClick={() => handlePreviewVideo(course)}
                  >
                    Preview Media
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Course Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setFormError(''); }} title="Publish New Course" maxWidth="680px">
        <form onSubmit={handleCreateCourse} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {formError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fb7185',
                fontSize: '0.84rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Course Title *
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. Advanced Mathematics for Competitive Exams"
              value={formData.title}
              onChange={(e) => { setFormData({ ...formData, title: e.target.value }); setFormError(''); }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Course Description
            </label>
            <textarea
              className="input-control"
              rows={3}
              placeholder="Describe curriculum modules, prerequisites, and learning outcomes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Teacher First, then Playlist */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Instructing Faculty *
              </label>
              <select
                className="input-control"
                value={formData.createdBy}
                onChange={(e) => handleTeacherChange(e.target.value)}
                required
              >
                <option value="">{teachers.length === 0 ? 'No Teachers (Register one first)' : 'Select Teacher'}</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Assigned Playlist *
              </label>
              <select
                className="input-control"
                value={formData.playlist}
                onChange={(e) => { setFormData({ ...formData, playlist: e.target.value }); setFormError(''); }}
                disabled={!formData.createdBy}
                required
              >
                <option value="">
                  {!formData.createdBy
                    ? '← Select faculty member first'
                    : teacherPlaylists.length === 0
                      ? 'No playlists found for this teacher'
                      : 'Select Playlist'}
                </option>
                {teacherPlaylists.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name || p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Video & Duration Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Video File * (MP4 / WebM / QuickTime)
              </label>
              <input
                type="file"
                className="input-control"
                accept="video/mp4,video/quicktime,video/webm,video/3gpp"
                onChange={(e) => handleVideoPick(e.target.files?.[0])}
                required
                style={{ padding: '8px 12px' }}
              />
              {videoFile && (
                <span style={{ fontSize: '0.74rem', color: 'var(--primary)', marginTop: '4px', display: 'block' }}>
                  Selected: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Duration (Seconds, auto-detected from video)
              </label>
              <input
                type="number"
                className="input-control"
                placeholder="1800"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
              />
              {formData.duration > 0 && (
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                  Formatted length: {formatDuration(formData.duration)}
                </span>
              )}
            </div>
          </div>

          {/* Thumbnail */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Thumbnail Image (Optional — video frame used if blank)
            </label>
            <input
              type="file"
              className="input-control"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setThumbFile(e.target.files?.[0] || null)}
              style={{ padding: '8px 12px' }}
            />
            {thumbFile && (
              <span style={{ fontSize: '0.74rem', color: 'var(--primary)', marginTop: '4px', display: 'block' }}>
                Selected thumbnail: {thumbFile.name}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setShowAddModal(false); setFormError(''); }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? progress || 'Publishing Course...' : 'Save & Publish Course'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Video Player Modal */}
      <Modal
        isOpen={!!activeVideoUrl}
        onClose={() => { setActiveVideoUrl(null); setActiveCourse(null); }}
        title={activeCourse?.title ? `Lesson: ${activeCourse.title}` : 'Course Media Player'}
        maxWidth="820px"
      >
        {activeVideoUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                width: '100%',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                backgroundColor: '#000000',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
              }}
            >
              <video
                src={activeVideoUrl}
                controls
                autoPlay
                style={{ width: '100%', maxHeight: '460px', display: 'block' }}
              />
            </div>

            {/* Course Meta Info */}
            {activeCourse && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                  {activeCourse.playlistTitle && (
                    <Badge variant="indigo">
                      Playlist: {activeCourse.playlistTitle}
                    </Badge>
                  )}
                  {activeCourse.teacherName && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Faculty: <strong style={{ color: 'var(--text-main)' }}>{activeCourse.teacherName}</strong>
                    </span>
                  )}
                  {activeCourse.duration > 0 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      Duration: {formatDuration(activeCourse.duration)}
                    </span>
                  )}
                </div>
                {activeCourse.description && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '4px' }}>
                    {activeCourse.description}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CoursesPage;
