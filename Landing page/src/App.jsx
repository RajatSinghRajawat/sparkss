import { useEffect, useState } from 'react'
import pulseIcon from './assets/pulse.jpg'
import mentraIcon from './assets/mentra.jpg'
import './App.css'

const APPS = {
  student: {
    key: 'student',
    name: 'Sparks Pulse',
    role: 'For Students',
    icon: pulseIcon,
    apk: '/downloads/sparks-pulse-student.apk',
    size: '94.5 MB',
    version: '1.0.0',
    tagline: 'Learn in quick bites. Practice with quizzes. Grow every day.',
    features: [
      'Short learning reels from top teachers',
      'Full courses & curated playlists',
      'Live quizzes with instant results',
      'Follow teachers & save your favourite reels',
    ],
  },
  teacher: {
    key: 'teacher',
    name: 'Sparks Mentra',
    role: 'For Teachers',
    icon: mentraIcon,
    apk: '/downloads/sparks-mentra-teacher.apk',
    size: '86.6 MB',
    version: '1.0.0',
    tagline: 'Create, publish and track your teaching — all from your phone.',
    features: [
      'Upload reels & long-form video lessons',
      'Build courses, categories & playlists',
      'Create and edit tests in minutes',
      'Grow your follower base & earnings',
    ],
  },
}

const STUDENT_FEATURES = [
  { icon: '⚡', title: 'Learning Reels', text: 'Concepts explained in 60 seconds. Swipe, learn, repeat — studying that feels like scrolling.' },
  { icon: '🎯', title: 'Smart Quizzes', text: 'Test yourself after every topic and see detailed results to know exactly where you stand.' },
  { icon: '📚', title: 'Courses & Playlists', text: 'Structured courses and playlists so you never wonder what to study next.' },
  { icon: '🔖', title: 'Save & Revisit', text: 'Bookmark reels and come back to them right before your exam.' },
  { icon: '👩‍🏫', title: 'Follow Teachers', text: 'Follow the teachers you love and get notified the moment they post.' },
  { icon: '🔍', title: 'Instant Search', text: 'Find any topic, teacher or course in a single tap.' },
]

const TEACHER_FEATURES = [
  { icon: '🎬', title: 'Reels & Videos', text: 'Upload bite-sized reels or full lectures straight from your phone.' },
  { icon: '🗂️', title: 'Course Builder', text: 'Organise content into categories, courses and playlists effortlessly.' },
  { icon: '📝', title: 'Test Creator', text: 'Design tests, edit questions and review performance — no laptop needed.' },
  { icon: '📈', title: 'Grow Your Reach', text: 'Build a following of students who learn from you every day.' },
]

const STEPS = [
  { n: '01', title: 'Download the APK', text: 'Tap the download button for the Student or Teacher app.' },
  { n: '02', title: 'Allow installation', text: 'If asked, allow your browser to "Install unknown apps" in Settings.' },
  { n: '03', title: 'Install & sign in', text: 'Open the downloaded file, tap Install, and start learning or teaching.' },
]

const FAQS = [
  { q: 'Which app should I download?', a: 'Students should download Sparks Pulse. Teachers who want to publish content and create tests should download Sparks Mentra.' },
  { q: 'Is Sparks free to use?', a: 'Yes — downloading and signing up on both apps is completely free.' },
  { q: 'Android says the app is from an unknown source. Is it safe?', a: 'Yes. Because the app is distributed directly from this website instead of the Play Store, Android shows a standard warning. Just allow installation for your browser once.' },
  { q: 'Is there an iPhone version?', a: 'Right now Sparks is available for Android. The iOS version is on its way.' },
  { q: 'How do I update the app?', a: 'Download the latest APK from this page and install it over the existing app — your account and data stay safe.' },
]

const IS_IOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
const YEAR = new Date().getFullYear()

function Bolt(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M13.5 2 4 13.5h6.5L9 22l11-12.5h-6.8L13.5 2Z" fill="currentColor" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AndroidIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="currentColor" d="M17.6 9.48 19.44 6.3a.38.38 0 0 0-.66-.38l-1.86 3.22a11.4 11.4 0 0 0-9.84 0L5.22 5.92a.38.38 0 1 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52ZM7 15.25A1.25 1.25 0 1 1 8.25 14 1.25 1.25 0 0 1 7 15.25Zm10 0A1.25 1.25 0 1 1 18.25 14 1.25 1.25 0 0 1 17 15.25Z" />
    </svg>
  )
}

function DownloadButton({ app, variant = 'solid' }) {
  return (
    <a className={`btn btn-${app.key} btn-${variant}`} href={app.apk} download>
      <DownloadIcon />
      <span>
        <small>Download APK</small>
        {app.name}
      </span>
    </a>
  )
}

function Phone({ app }) {
  const student = app.key === 'student'
  return (
    <div className={`phone phone-${app.key}`}>
      <div className="phone-notch" />
      <div className="phone-screen">
        <div className="ps-top">
          <img src={app.icon} alt="" />
          <div>
            <b>{app.name}</b>
            <span>{student ? 'Good evening, Aarav 👋' : 'Welcome back, Ma’am 👋'}</span>
          </div>
        </div>
        {student ? (
          <>
            <div className="ps-banner">
              <small>Today’s streak</small>
              <strong>🔥 12 days</strong>
              <div className="ps-bar"><i style={{ width: '72%' }} /></div>
            </div>
            <p className="ps-label">Trending reels</p>
            <div className="ps-reels">
              <div><span>Physics</span></div>
              <div><span>Maths</span></div>
              <div><span>Biology</span></div>
            </div>
            <p className="ps-label">Continue quiz</p>
            <div className="ps-row"><span>Algebra — Quiz 4</span><em>8/10</em></div>
            <div className="ps-row"><span>Optics — Quiz 2</span><em>Start</em></div>
          </>
        ) : (
          <>
            <div className="ps-stats">
              <div><strong>2.4k</strong><small>Followers</small></div>
              <div><strong>86</strong><small>Reels</small></div>
              <div><strong>12</strong><small>Tests</small></div>
            </div>
            <p className="ps-label">Quick create</p>
            <div className="ps-actions">
              <div>🎬<small>Reel</small></div>
              <div>📚<small>Course</small></div>
              <div>📝<small>Test</small></div>
            </div>
            <p className="ps-label">Recent uploads</p>
            <div className="ps-row"><span>Newton’s Laws</span><em>1.2k views</em></div>
            <div className="ps-row"><span>Cell Structure</span><em>860 views</em></div>
          </>
        )}
      </div>
    </div>
  )
}

function AppCard({ app, ios }) {
  return (
    <article className={`app-card card-${app.key}`}>
      <div className="app-card-glow" />
      <header>
        <img src={app.icon} alt={`${app.name} icon`} />
        <div>
          <span className={`pill pill-${app.key}`}>{app.role}</span>
          <h3>{app.name}</h3>
          <p className="meta"><AndroidIcon /> Android · v{app.version} · {app.size}</p>
        </div>
      </header>
      <p className="app-tagline">{app.tagline}</p>
      <ul>
        {app.features.map((f) => (
          <li key={f}><Bolt className="li-bolt" />{f}</li>
        ))}
      </ul>
      <DownloadButton app={app} />
      {ios && <p className="ios-note">You’re on iPhone — this APK works on Android devices only.</p>}
    </article>
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
        {q}
        <span className="faq-plus" aria-hidden="true" />
      </button>
      <div className="faq-body"><p>{a}</p></div>
    </div>
  )
}

export default function App() {
  const ios = IS_IOS
  const [scrolled, setScrolled] = useState(false)
  const [tab, setTab] = useState('student')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.12 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [tab])

  return (
    <>
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-orb orb-a" aria-hidden="true" />
      <div className="bg-orb orb-b" aria-hidden="true" />

      <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
        <div className="container nav-inner">
          <a href="#top" className="brand">
            <span className="brand-mark"><Bolt /></span>
            Sparks
          </a>
          <div className="nav-links">
            <a href="#apps">Apps</a>
            <a href="#features">Features</a>
            <a href="#install">Install</a>
            <a href="#faq">FAQ</a>
          </div>
          <a href="#apps" className="nav-cta">Get the app</a>
        </div>
      </nav>

      <main id="top">
        {/* HERO */}
        <section className="hero container">
          <div className="hero-copy">
            <span className="eyebrow"><span className="dot" /> Now available on Android</span>
            <h1>
              Learning that <span className="grad-text">sparks</span> curiosity.
            </h1>
            <p className="lead">
              Sparks brings students and teachers together — bite-sized reels, full courses and smart quizzes for learners,
              and powerful creator tools for educators.
            </p>
            <div className="hero-ctas">
              <DownloadButton app={APPS.student} />
              <DownloadButton app={APPS.teacher} variant="ghost" />
            </div>
            <div className="hero-trust">
              <span><b>Free</b> to download</span>
              <span className="sep" />
              <span><b>2</b> dedicated apps</span>
              <span className="sep" />
              <span><b>No</b> Play Store needed</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="phones">
              <Phone app={APPS.teacher} />
              <Phone app={APPS.student} />
            </div>
            <div className="float-chip chip-a">🎯 Quiz score <b>9/10</b></div>
            <div className="float-chip chip-b">🎬 New reel uploaded</div>
          </div>
        </section>

        {/* APPS */}
        <section id="apps" className="section container">
          <div className="section-head reveal">
            <span className="kicker">Download</span>
            <h2>Two apps. One learning universe.</h2>
            <p>Pick the app made for you. Both are free and install in under a minute.</p>
          </div>
          <div className="app-grid">
            <div className="reveal"><AppCard app={APPS.student} ios={ios} /></div>
            <div className="reveal delay-1"><AppCard app={APPS.teacher} ios={ios} /></div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="section container">
          <div className="section-head reveal">
            <span className="kicker">Features</span>
            <h2>Built for the way you learn — and teach.</h2>
          </div>
          <div className="tabs reveal" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'student'} className={tab === 'student' ? 'active student' : ''} onClick={() => setTab('student')}>
              <img src={pulseIcon} alt="" /> Students
            </button>
            <button type="button" role="tab" aria-selected={tab === 'teacher'} className={tab === 'teacher' ? 'active teacher' : ''} onClick={() => setTab('teacher')}>
              <img src={mentraIcon} alt="" /> Teachers
            </button>
          </div>
          <div className={`feature-grid feature-${tab}`} key={tab}>
            {(tab === 'student' ? STUDENT_FEATURES : TEACHER_FEATURES).map((f, i) => (
              <div className="feature reveal" style={{ transitionDelay: `${i * 60}ms` }} key={f.title}>
                <span className="feature-icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* INSTALL */}
        <section id="install" className="section container">
          <div className="section-head reveal">
            <span className="kicker">Install</span>
            <h2>Up and running in 3 steps.</h2>
          </div>
          <div className="steps">
            {STEPS.map((s, i) => (
              <div className={`step reveal delay-${i}`} key={s.n}>
                <span className="step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="section container faq-wrap">
          <div className="section-head reveal">
            <span className="kicker">FAQ</span>
            <h2>Questions? Answered.</h2>
          </div>
          <div className="faq reveal">
            {FAQS.map((f) => <FaqItem key={f.q} {...f} />)}
          </div>
        </section>

        {/* CTA */}
        <section className="container">
          <div className="cta reveal">
            <Bolt className="cta-bolt" />
            <h2>Ready to spark something?</h2>
            <p>Download Sparks today and turn every spare minute into progress.</p>
            <div className="hero-ctas center">
              <DownloadButton app={APPS.student} />
              <DownloadButton app={APPS.teacher} />
            </div>
          </div>
        </section>
      </main>

      <footer className="footer container">
        <a href="#top" className="brand">
          <span className="brand-mark"><Bolt /></span>
          Sparks
        </a>
        <p>© {YEAR} Sparks Learning. All rights reserved.</p>
        <div className="footer-links">
          <a href="#apps">Download</a>
          <a href="#install">Install guide</a>
          <a href="#faq">FAQ</a>
        </div>
      </footer>
    </>
  )
}
