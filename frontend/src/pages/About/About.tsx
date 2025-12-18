import React from 'react';
import { 
  FaCode,
  FaPaintBrush,
  FaRocket,
  FaDatabase,
  FaMobileAlt,
  FaServer,
  FaCloud,
  FaReact,
  FaNodeJs,
  FaPython,
  FaFigma,
  FaLinkedin,
  FaGithub,
  FaTwitter,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaGraduationCap,
  FaBriefcase,
  FaTools,
  FaProjectDiagram,
  FaAward,
  FaStar,
  FaLightbulb,
  FaUsers,
  FaHandshake
} from 'react-icons/fa';
import './About.css';

interface Skill {
  name: string;
  level: number;
  icon: React.ReactNode;
  category: string;
}

interface Project {
  name: string;
  description: string;
  tech: string[];
  link?: string;
  image: string;
}

interface Experience {
  year: string;
  role: string;
  company: string;
  description: string;
}

const About: React.FC = () => {
  const skills: Skill[] = [
    { name: 'React.js', level: 95, icon: <FaReact />, category: 'Frontend' },
    { name: 'TypeScript', level: 90, icon: <FaCode />, category: 'Frontend' },
    { name: 'Node.js', level: 88, icon: <FaNodeJs />, category: 'Backend' },
    { name: 'Python', level: 85, icon: <FaPython />, category: 'Backend' },
    { name: 'UI/UX Design', level: 92, icon: <FaPaintBrush />, category: 'Design' },
    { name: 'MongoDB', level: 87, icon: <FaDatabase />, category: 'Database' },
    { name: 'AWS', level: 80, icon: <FaCloud />, category: 'DevOps' },
    { name: 'React Native', level: 82, icon: <FaMobileAlt />, category: 'Mobile' },
    { name: 'Figma', level: 90, icon: <FaFigma />, category: 'Design' },
    { name: 'Express.js', level: 86, icon: <FaServer />, category: 'Backend' },
  ];

  const projects: Project[] = [
    {
      name: 'WeCinema',
      description: 'A premium movie streaming platform with advanced features and user-friendly interface.',
      tech: ['React', 'TypeScript', 'Node.js', 'MongoDB', 'AWS'],
      image: 'https://images.unsplash.com/photo-1489599809516-9827b6d1cf13?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    },
    {
      name: 'E-Commerce Platform',
      description: 'Full-stack e-commerce solution with payment integration and admin dashboard.',
      tech: ['Next.js', 'TypeScript', 'Stripe', 'PostgreSQL'],
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    },
    {
      name: 'Task Management App',
      description: 'Collaborative project management tool with real-time updates and team features.',
      tech: ['React Native', 'Socket.io', 'Redis', 'MongoDB'],
      image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    },
    {
      name: 'Healthcare Portal',
      description: 'Patient management system with appointment scheduling and telemedicine features.',
      tech: ['Vue.js', 'Python', 'Django', 'PostgreSQL'],
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    }
  ];

  const experiences: Experience[] = [
    {
      year: '2023 - Present',
      role: 'Full Stack Developer & UI/UX Designer',
      company: 'Freelance',
      description: 'Building custom web applications and providing design solutions for various clients.'
    },
    {
      year: '2021 - 2023',
      role: 'Senior Frontend Developer',
      company: 'TechSolutions Inc.',
      description: 'Led frontend development team and implemented complex UI components.'
    },
    {
      year: '2019 - 2021',
      role: 'Full Stack Developer',
      company: 'Digital Innovations',
      description: 'Developed and maintained multiple web applications using modern technologies.'
    },
    {
      year: '2017 - 2019',
      role: 'Junior Developer',
      company: 'WebCraft Studios',
      description: 'Started career in web development and learned industry best practices.'
    }
  ];

  const certifications = [
    'AWS Certified Solutions Architect',
    'Google UX Design Professional Certificate',
    'React Developer Certification',
    'TypeScript Advanced Patterns',
    'Node.js Best Practices'
  ];

  const philosophies = [
    {
      icon: <FaLightbulb />,
      title: 'Design Thinking',
      description: 'Solving problems with user-centered approach and creative solutions'
    },
    {
      icon: <FaCode />,
      title: 'Clean Code',
      description: 'Writing maintainable, scalable, and efficient code with best practices'
    },
    {
      icon: <FaUsers />,
      title: 'Collaboration',
      description: 'Working effectively in teams and communicating clearly'
    },
    {
      icon: <FaRocket />,
      title: 'Innovation',
      description: 'Always exploring new technologies and improving processes'
    }
  ];

  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="hero-overlay"></div>
        <div className="container">
          <div className="hero-content">
            <div className="hero-avatar">
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80" 
                alt="Hamza Manzoor" 
              />
            </div>
            <h1 className="hero-title">
              <span className="highlight">Hamza Manzoor</span>
            </h1>
            <p className="hero-subtitle">
              Full Stack Developer & UI/UX Designer
            </p>
            <p className="hero-tagline">
              Building digital experiences that combine beautiful design with powerful functionality
            </p>
            <div className="hero-actions">
              <a href="#projects" className="btn btn-primary">
                <FaCode /> View Projects
              </a>
              <a href="#contact" className="btn btn-secondary">
                <FaEnvelope /> Contact Me
              </a>
            </div>
            <div className="hero-social">
              <a href="https://github.com/hamza-manzoor" target="_blank" rel="noopener noreferrer">
                <FaGithub />
              </a>
              <a href="https://linkedin.com/in/hamza-manzoor" target="_blank" rel="noopener noreferrer">
                <FaLinkedin />
              </a>
              <a href="https://twitter.com/hamza_manzoor" target="_blank" rel="noopener noreferrer">
                <FaTwitter />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* About Me Section */}
      <section className="about-me-section">
        <div className="container">
          <div className="section-header">
            <h2>About Me</h2>
            <p>Developer. Designer. Problem Solver.</p>
          </div>
          <div className="about-content">
            <div className="about-text">
              <h3>Hello, I'm Hamza! 👋</h3>
              <p>
                I'm a passionate Full Stack Developer and UI/UX Designer with 5+ years of experience 
                creating digital solutions that make a difference. My journey began with a curiosity 
                about how things work, and it has evolved into a career where I blend technical 
                expertise with creative design.
              </p>
              <p>
                As the founder of <strong>WeCinema</strong>, I've combined my love for cinema with 
                technical skills to build a platform that delivers exceptional streaming experiences. 
                I believe in creating products that are not only functional but also delightful to use.
              </p>
              <p>
                When I'm not coding or designing, you can find me exploring new technologies, 
                contributing to open-source projects, or mentoring aspiring developers. I'm always 
                excited about new challenges and opportunities to grow.
              </p>
              <div className="personal-info">
                <div className="info-item">
                  <FaMapMarkerAlt />
                  <span>Based in Pakistan</span>
                </div>
                <div className="info-item">
                  <FaCalendarAlt />
                  <span>5+ Years Experience</span>
                </div>
                <div className="info-item">
                  <FaGraduationCap />
                  <span>Computer Science Graduate</span>
                </div>
                <div className="info-item">
                  <FaBriefcase />
                  <span>Available for Projects</span>
                </div>
              </div>
            </div>
            <div className="about-image">
              <img 
                src="https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                alt="Working Setup" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section className="skills-section">
        <div className="container">
          <div className="section-header">
            <h2>My Skills</h2>
            <p>Technologies I work with</p>
          </div>
          <div className="skills-categories">
            {['Frontend', 'Backend', 'Design', 'Database', 'DevOps', 'Mobile'].map(category => {
              const categorySkills = skills.filter(skill => skill.category === category);
              if (categorySkills.length === 0) return null;
              
              return (
                <div key={category} className="skill-category">
                  <h3>{category}</h3>
                  <div className="category-skills">
                    {categorySkills.map((skill, index) => (
                      <div key={index} className="skill-item">
                        <div className="skill-header">
                          <div className="skill-icon">{skill.icon}</div>
                          <span className="skill-name">{skill.name}</span>
                          <span className="skill-level">{skill.level}%</span>
                        </div>
                        <div className="skill-bar">
                          <div 
                            className="skill-progress" 
                            style={{ width: `${skill.level}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="philosophy-section">
        <div className="container">
          <div className="section-header">
            <h2>My Development Philosophy</h2>
            <p>Principles that guide my work</p>
          </div>
          <div className="philosophy-grid">
            {philosophies.map((philo, index) => (
              <div key={index} className="philosophy-card">
                <div className="philosophy-icon">{philo.icon}</div>
                <h3>{philo.title}</h3>
                <p>{philo.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="projects-section">
        <div className="container">
          <div className="section-header">
            <h2>Featured Projects</h2>
            <p>Some of my recent work</p>
          </div>
          <div className="projects-grid">
            {projects.map((project, index) => (
              <div key={index} className="project-card">
                <div className="project-image">
                  <img src={project.image} alt={project.name} />
                  <div className="project-overlay">
                    <FaProjectDiagram />
                  </div>
                </div>
                <div className="project-content">
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <div className="project-tech">
                    {project.tech.map((tech, idx) => (
                      <span key={idx} className="tech-tag">{tech}</span>
                    ))}
                  </div>
                  <div className="project-links">
                    <button className="btn btn-small btn-primary">
                      <FaCode /> View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section className="experience-section">
        <div className="container">
          <div className="section-header">
            <h2>Work Experience</h2>
            <p>My professional journey</p>
          </div>
          <div className="timeline">
            {experiences.map((exp, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-year">{exp.year}</div>
                <div className="timeline-content">
                  <h3>{exp.role}</h3>
                  <p className="company">{exp.company}</p>
                  <p>{exp.description}</p>
                </div>
                <div className="timeline-marker">
                  <FaBriefcase />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications Section */}
      <section className="certifications-section">
        <div className="container">
          <div className="section-header">
            <h2>Certifications</h2>
            <p>Continuous learning and professional development</p>
          </div>
          <div className="certifications-list">
            {certifications.map((cert, index) => (
              <div key={index} className="certification-item">
                <FaAward />
                <span>{cert}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="tools-section">
        <div className="container">
          <div className="section-header">
            <h2>Development Stack</h2>
            <p>Tools and technologies I use daily</p>
          </div>
          <div className="tools-grid">
            <div className="tool-category">
              <h3>Frontend</h3>
              <div className="tool-list">
                <span>React.js</span>
                <span>TypeScript</span>
                <span>Next.js</span>
                <span>Vue.js</span>
                <span>Tailwind CSS</span>
                <span>Sass</span>
              </div>
            </div>
            <div className="tool-category">
              <h3>Backend</h3>
              <div className="tool-list">
                <span>Node.js</span>
                <span>Express.js</span>
                <span>Python</span>
                <span>Django</span>
                <span>FastAPI</span>
                <span>GraphQL</span>
              </div>
            </div>
            <div className="tool-category">
              <h3>Design</h3>
              <div className="tool-list">
                <span>Figma</span>
                <span>Adobe XD</span>
                <span>Photoshop</span>
                <span>Illustrator</span>
                <span>Framer</span>
                <span>Prototyping</span>
              </div>
            </div>
            <div className="tool-category">
              <h3>DevOps</h3>
              <div className="tool-list">
                <span>Docker</span>
                <span>AWS</span>
                <span>GitHub Actions</span>
                <span>Nginx</span>
                <span>CI/CD</span>
                <span>Monitoring</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="container">
          <div className="section-header">
            <h2>Let's Work Together</h2>
            <p>Have a project in mind? Let's discuss!</p>
          </div>
          <div className="contact-content">
            <div className="contact-info">
              <div className="contact-item">
                <FaEnvelope />
                <div>
                  <h4>Email</h4>
                  <p>hamza@wecinema.co</p>
                </div>
              </div>
              <div className="contact-item">
                <FaMapMarkerAlt />
                <div>
                  <h4>Location</h4>
                  <p>Pakistan · Available Worldwide</p>
                </div>
              </div>
              <div className="contact-item">
                <FaCalendarAlt />
                <div>
                  <h4>Availability</h4>
                  <p>Open for new projects</p>
                </div>
              </div>
              <div className="contact-item">
                <FaHandshake />
                <div>
                  <h4>Services</h4>
                  <p>Web Development · UI/UX Design · Consultation</p>
                </div>
              </div>
            </div>
            <div className="contact-form">
              <h3>Send me a message</h3>
              <form>
                <div className="form-group">
                  <input type="text" placeholder="Your Name" required />
                </div>
                <div className="form-group">
                  <input type="email" placeholder="Your Email" required />
                </div>
                <div className="form-group">
                  <input type="text" placeholder="Subject" required />
                </div>
                <div className="form-group">
                  <textarea placeholder="Your Message" rows={5} required></textarea>
                </div>
                <button type="submit" className="btn btn-primary">
                  <FaEnvelope /> Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="about-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <h3>Hamza Manzoor</h3>
              <p>Full Stack Developer & UI/UX Designer</p>
            </div>
            <div className="footer-social">
              <a href="https://github.com/hamza-manzoor" target="_blank" rel="noopener noreferrer">
                <FaGithub />
              </a>
              <a href="https://linkedin.com/in/hamza-manzoor" target="_blank" rel="noopener noreferrer">
                <FaLinkedin />
              </a>
              <a href="https://twitter.com/hamza_manzoor" target="_blank" rel="noopener noreferrer">
                <FaTwitter />
              </a>
              <a href="mailto:hamza@wecinema.co">
                <FaEnvelope />
              </a>
            </div>
            <div className="footer-copyright">
              <p>&copy; {new Date().getFullYear()} Hamza Manzoor. All rights reserved.</p>
              <p>Building the future, one line of code at a time.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;