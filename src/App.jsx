import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import "./index.css";
import { Download, MessageCircle, ArrowUpRight } from "lucide-react";

const COLS = 34;
const ROWS = 20;
const FPS = 30;

function MeshBackground() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;

    let width = 0, height = 0, dpr = 1, raf = 0, last = 0;
    let scrollY = window.scrollY;
    let visible = !document.hidden;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (event) => {
      mouse.current.x = event.clientX;
      mouse.current.y = event.clientY;
    };
    const onScroll = () => { scrollY = window.scrollY; };

    const tilePath = (a, b, c, d) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
    };

    const draw = (time) => {
      if (!visible) return;
      raf = requestAnimationFrame(draw);
      if (time - last < 1000 / FPS) return;
      last = time;

      ctx.fillStyle = "#040813";
      ctx.fillRect(0, 0, width, height);

      const cw = width / COLS;
      const ch = height / ROWS;
      const gap = Math.max(2, Math.min(3, cw * 0.09));
      const cx = width * 0.5;
      const cy = height * 0.315;
      const rx = Math.min(width * 0.34, 540);
      const ry = Math.min(height * 0.32, 330);
      const pointer = mouse.current;

      // The bowl distortion belongs to the hero only. It fades to a flat grid on scroll.
      const hero = Math.max(0, Math.min(1, 1 - scrollY / (height * 0.42)));
      const pulse = Math.sin((time / 8000) * Math.PI * 2) * 1.5;

      const glow = (x, y, color, alpha) => {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, rx * 0.9);
        gradient.addColorStop(0, color.replace("ALPHA", String(alpha * hero)));
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      };

      glow(cx - rx * 0.42, cy + 15, "rgba(0,135,255,ALPHA)", 0.15);
      glow(cx + rx * 0.42, cy + 8, "rgba(119,40,255,ALPHA)", 0.14);

      // Recess the mesh along Z, away from the camera.
      const vertex = (x, y) => {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const radius = Math.hypot(dx, dy);

        const bowl = Math.exp(-(dx * dx * 1.18 + dy * dy * 1.42)) * hero;
        const rim = Math.exp(-Math.pow(radius - 1, 2) / 0.065) * hero;

        // Negative Z moves the center into the screen.
        // Balanced negative Z-depth creates a visible but controlled recessed well.
        // A longer focal length keeps the perspective natural.
        const z = -bowl * 430;
        const focalLength = 1000;
        const perspective = focalLength / (focalLength - z);

        return {
          x: cx + (x - cx) * perspective,
          y: cy + (y - cy) * perspective + rim * 5,
          z,
          bowl,
          rim,
          depth: perspective,
        };
      };

      for (let row = 0; row < ROWS; row += 1) {
        const top = row * ch + gap / 2;
        const bottom = (row + 1) * ch - gap / 2;

        for (let col = 0; col < COLS; col += 1) {
          const left = col * cw + gap / 2;
          const right = (col + 1) * cw - gap / 2;
          const a = vertex(left, top);
          const b = vertex(right, top);
          const c = vertex(right, bottom);
          const d = vertex(left, bottom);
          const x = (a.x + b.x + c.x + d.x) / 4;
          const y = (a.y + b.y + c.y + d.y) / 4;
          const bowl = (a.bowl + b.bowl + c.bowl + d.bowl) / 4;
          const rim = (a.rim + b.rim + c.rim + d.rim) / 4;
          const hover = Math.max(0, 1 - Math.hypot(pointer.x - x, pointer.y - y) / 175);
          const blend = Math.max(0, Math.min(1, (x - (cx - rx)) / (rx * 2)));

          tilePath(a, b, c, d);
          ctx.fillStyle = `rgba(6,${14 + bowl * 12},${29 + bowl * 28},${0.38 + bowl * 0.12 + hover * 0.08})`;
          ctx.fill();

          ctx.lineWidth = 0.9 + hover * 0.35 + bowl * 0.12;
          ctx.strokeStyle = `rgba(${20 + blend * 65},${75 - blend * 30},255,${0.2 + bowl * 0.2 + rim * 0.18 + hover * 0.45})`;
          ctx.stroke();

          if (rim > 0.35) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${blend < 0.5 ? "25,150,255" : "133,74,255"},${rim * 0.22})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          if (hover > 0.2) {
            ctx.strokeStyle = `rgba(106,171,255,${hover * 0.4})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      const well = ctx.createRadialGradient(cx, cy + 170, 5, cx, cy + 170, rx * 0.78);
      well.addColorStop(0, `rgba(0,2,10,${0.76 * hero})`);
      well.addColorStop(0.35, `rgba(1,8,30,${0.32 * hero})`);
      well.addColorStop(1, "rgba(1,8,30,0)");
      ctx.fillStyle = well;
      ctx.fillRect(0, 0, width, height);

      if (pointer.x > -500) {
        const gradient = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 165);
        gradient.addColorStop(0, "rgba(37,120,255,.13)");
        gradient.addColorStop(0.45, "rgba(68,70,255,.06)");
        gradient.addColorStop(1, "rgba(20,40,100,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      const vignette = ctx.createRadialGradient(
        width * 0.5, height * 0.4, Math.min(width, height) * 0.18,
        width * 0.5, height * 0.4, Math.max(width, height) * 0.74
      );
      vignette.addColorStop(0, "rgba(1,4,12,0)");
      vignette.addColorStop(1, "rgba(1,4,12,.56)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    };

    const visibility = () => {
      visible = !document.hidden;
      cancelAnimationFrame(raf);
      if (visible) {
        last = 0;
        raf = requestAnimationFrame(draw);
      }
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", visibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="mesh-canvas" aria-hidden="true" />;
}

const projects = [
  {
    id: "zervo",
    title: "Zervo – Requirement & Application Platform",
    category: "AI-powered platform",
    description: "An AI-powered job and requirement platform built with Python FastAPI microservices. Users can post requirements, discover opportunities, apply, and manage applications.",
    tags: ["Python", "FastAPI", "AI", "Microservices"],
    preview: "zervo",
  },
  {
    id: "organic",
    title: "Organic Mart – E-Commerce",
    category: "E-commerce",
    description: "An e-commerce platform for organic products with product-level and item-level offers, analytics integration, and a clean, mobile-friendly shopping experience.",
    tags: ["Laravel", "Vue.js", "MySQL"],
    preview: "organic",
  },
  {
    id: "perfex",
    title: "Perfex CRM Customization",
    category: "CRM development",
    description: "Customized CRM workflows including SLA email logic via cron, autoclose compatibility, agent filters, and DataTables enhancements.",
    tags: ["CodeIgniter", "JavaScript", "jQuery", "Cron"],
    preview: "perfex",
  },
  {
    id: "creators",
    title: "Platform for Creators",
    category: "Creator platform",
    description: "A creator-focused platform to build a profile, showcase creative work, discover collaboration opportunities, and connect with brands.",
    tags: ["React", "Vue.js", "Node.js", "Express"],
    preview: "creators",
  },
];

const technologies = [
  ["Laravel", "◆"], ["PHP", "php"], ["Vue.js", "V"], ["React", "⚛"],
  ["Node.js", "JS"], ["Express", "ex"], ["Python", "Py"], ["FastAPI", "API"],
  ["Django", "dj"], ["PostgreSQL", "PG"], ["MySQL", "SQL"], ["Redis", "R"],
  ["AWS", "aws"], ["Tailwind CSS", "≈"], ["Docker", "▣"], ["Git", "⌘"],
];

function App() {
  return (
    <main>
      <MeshBackground />
      <div className="page-content">
        <Header />

        <section className="hero" id="home">
          <motion.div className="hero-content" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
            <div className="eyebrow"><span className="dot" /> FULL-STACK DEVELOPER</div>
            <div className="gravity-title">
  <motion.h1
    className="deep-word"
    initial={{ opacity: 0, y: -14, filter: "blur(4px)" }}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    transition={{ duration: 0.9, delay: 0.1 }}
  >
    DEEP
  </motion.h1>
  <div className="letter-reflection" />
  <div className="gravity-shadow" />
</div>
            <motion.h2 className="surname" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>BAHIRSHET</motion.h2>
            <motion.div className="hero-role" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>FULL-STACK DEVELOPER</motion.div>
            <motion.p className="hero-tagline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              Building scalable web applications with clean code<br />and modern technologies.
            </motion.p>
            <motion.div className="hero-buttons" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}>
              <motion.a href="#projects" className="primary-button" whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.97 }}>View My Work</motion.a>
              <motion.a href="#contact" className="secondary-button" whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.97 }}>Get In Touch</motion.a>
            </motion.div>
          </motion.div>
        </section>

        <motion.section className="stats" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <Stat number="2.5+" label="Years Experience" />
          <Stat number="15+" label="Projects Completed" />
          <Stat number="16+" label="Technologies" />
          <Stat number="100%" label="Commitment" />
        </motion.section>

<section id="about" className="about-section">
      <div className="about-container">

        {/* LEFT CONTENT */}
        <motion.div
          className="about-content"
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <span className="section-label">
            ABOUT ME
          </span>

          <h2>
            Passionate About
            <br />
            Building <span>Digital Solutions</span>
          </h2>

          <p>
            I'm a Full-Stack Developer with 2.5+ years of experience
            building scalable web applications using Laravel, Vue.js,
            React, Node.js and modern web technologies.
          </p>

          <p>
            I enjoy solving real-world problems, designing clean
            architectures, and turning ideas into efficient,
            user-friendly products.
          </p>

          <div className="about-buttons">
            <a
              href="/Deep-Bahirshet-Resume.pdf"
              download
              className="about-btn primary-btn"
            >
              <Download size={17} />
              Download Resume
              <ArrowUpRight size={15} />
            </a>

            <a
              href="#contact"
              className="about-btn secondary-btn"
            >
              <MessageCircle size={17} />
              Let's Talk
            </a>
          </div>
        </motion.div>

        {/* RIGHT PHOTO */}
        <motion.div
          className="about-image-wrapper"
          initial={{ opacity: 0, x: 45 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
        >
          <div className="about-image-glow" />

          <div className="about-image-frame">
            <img
              src="/images/deep-profile.jpg"
              alt="Deep Bahirshet - Full Stack Developer"
              className="about-profile-image"
            />

            <div className="image-overlay" />

            <div className="image-caption">
              <span className="caption-status" />

              <div>
                <h3>Deep Bahirshet</h3>
                <p>Full-Stack Developer</p>
              </div>

              <span className="caption-icon">
                <ArrowUpRight size={18} />
              </span>
            </div>
          </div>
        </motion.div>

      </div>
    </section>

        <section className="section projects-section" id="projects">
          <SectionHeading label="SELECTED WORK" title={<>Projects that solve <span>real problems.</span></>} subtitle="A selection of applications and systems I've worked on." />
          <div className="project-grid">
            {projects.map((project, index) => <ProjectCard project={project} index={index} key={project.id} />)}
          </div>
        </section>

        <section className="section experience-section" id="experience">
          <SectionHeading label="EXPERIENCE" title={<>My Professional <span>Journey</span></>} subtitle="A quick look at my professional experience and responsibilities." />
          <div className="timeline">
            <Experience initials="BT" company="Biyani Technologies" role="Full Stack Developer" dates="Jul 2026 – Present" description="Working on PHP, WordPress, SEO, and Next.js website development." />
            <Experience initials="M" company="Mobifilia Software India LLP" role="Software Engineer" dates="Jan 2026 – Jul 2026" description="Worked on Laravel-based web applications, REST APIs, and feature development." />
            <Experience initials="R" company="Reapmind Technologies" role="Full Stack Developer" dates="Mar 2023 – Dec 2025" description="Developed and maintained web applications using Laravel, PHP, and MySQL." />
          </div>
        </section>

        <section className="section skills-section" id="skills">
          <SectionHeading label="TECHNOLOGIES" title={<>My Technical <span>Toolbox</span></>} subtitle="Technologies I use to build, ship, and maintain web applications." />
          <div className="tech-grid">
            {technologies.map(([name, icon], index) => (
              <motion.div className="tech-card" key={name} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (index % 8) * 0.035 }} whileHover={{ y: -5 }}>
                <strong>{icon}</strong><span>{name}</span>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="section contact-section" id="contact">
          <SectionHeading label="GET IN TOUCH" title={<>Let's Build Something <span>Meaningful</span></>} subtitle="Have a project idea or an opportunity? I'd love to hear from you." />
          <div className="contact-actions">
            <a className="primary-button" href="mailto:your-email@example.com">Send Me a Message <span>→</span></a>
            <a className="social-link" href="https://www.linkedin.com/" target="_blank" rel="noreferrer" aria-label="LinkedIn">in</a>
            <a className="social-link" href="https://github.com/" target="_blank" rel="noreferrer" aria-label="GitHub">⌘</a>
            <a className="social-link" href="mailto:your-email@example.com" aria-label="Email">✉</a>
          </div>
        </section>

        <footer className="footer">
          <a className="logo" href="#home">DB</a>
          <span>Designed & built with care.</span>
          <a href="#home">Back to top ↑</a>
        </footer>
      </div>
    </main>
  );
}

function Header() {
  return (
    <motion.header className="navbar" initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
      <a className="logo" href="#home" aria-label="Home">DB</a>
      <nav aria-label="Main navigation">
        <a className="active" href="#home">Home</a>
        <a href="#about">About</a>
        <a href="#projects">Projects</a>
        <a href="#experience">Experience</a>
        <a href="#skills">Skills</a>
        <a href="#contact">Contact</a>
      </nav>
      <a className="talk-button" href="#contact">Let's Talk</a>
    </motion.header>
  );
}

function SectionHeading({ label, title, subtitle }) {
  return (
    <div className="section-heading">
      <div className="section-label">{label}</div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function Stat({ number, label }) {
  return <div className="stat"><strong>{number}</strong><span>{label}</span></div>;
}

function ProjectCard({ project, index }) {
  return (
    <motion.article className="project-card" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.45, delay: index * 0.06 }}>
      <div className={`project-preview preview-${project.preview}`}>
        <ProjectPreview type={project.preview} />
        <span className="preview-shine" />
      </div>
      <div className="project-info">
        <div className="project-category">{project.category}</div>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
        <div className="project-tags">{project.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
      </div>
    </motion.article>
  );
}

function ProjectPreview({ type }) {
  if (type === "zervo") return (
    <div className="mock-window zervo-window">
      <aside><b>Z</b><i /><i /><i /><i /></aside>
      <div className="mock-main"><div className="mock-top"><b>Zervo</b><span>Dashboard</span><em>DB</em></div><h4>Find your next opportunity.</h4><div className="mock-metrics"><i /><i /><i /></div><div className="mock-list"><b>Recent requirements</b><i /><i /><i /></div></div>
    </div>
  );
  if (type === "organic") return (
    <div className="mock-window organic-window">
      <div className="organic-nav"><b>Organic Mart</b><span>All　 Fruits　 Dairy　 Staples</span></div>
      <div className="organic-products">{["🍎", "🥑", "🍊", "🥦"].map((fruit, i) => <div className="organic-product" key={i}><strong>{fruit}</strong><i /><small>Fresh product</small><b>₹{120 + i * 35}</b></div>)}</div>
    </div>
  );
  if (type === "perfex") return (
    <div className="mock-window perfex-window">
      <aside><b>P</b><i /><i /><i /><i /></aside>
      <div className="perfex-main"><div className="perfex-title">Support Dashboard <span>Today</span></div><div className="perfex-stats"><i /><i /><i /></div><div className="perfex-table"><b>Recent Tickets</b>{[1, 2, 3, 4].map(n => <i key={n}><span /><span /><span /></i>)}</div></div>
    </div>
  );
  return (
    <div className="mock-window creators-window">
      <div className="creator-nav"><b>CreatorsHub</b><span>Discover　 Explore　 Join</span></div>
      <div className="creator-content"><div><small>YOUR CREATIVE SPACE</small><strong>Showcase your<br />creative world.</strong><i>Connect, collaborate and grow.</i><b>Explore creators →</b></div><div className="creator-orb">✦</div></div>
    </div>
  );
}

function Experience({ initials, company, role, dates, description }) {
  return (
    <motion.div className="experience-item" initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
      <div className="timeline-node" />
      <div className="company-mark">{initials}</div>
      <div className="experience-copy"><h3>{company}</h3><span>{role}</span><p>{description}</p></div>
      <time>{dates}</time>
    </motion.div>
  );
}

export default App;
