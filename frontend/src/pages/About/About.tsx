import React from 'react';
import { Layout } from "../../components/Layout";
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
  FaHandshake,
  FaVideo,
  FaFilm,
  FaUpload,
  FaUserPlus,
  FaRobot,
  FaShoppingCart,
  FaStore,
  FaComments,
  FaShieldAlt,
  FaBolt,
  FaGlobe,
  FaLayerGroup,
  FaBell,
  FaChartLine,
  FaLock,
  FaSync,
  FaCog,
  FaQrcode,
  FaWallet,
  FaTrophy,
  FaHeart
} from 'react-icons/fa';
import './About.css';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  category: string;
}

interface WebsiteFeature {
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string[];
}

interface TechStack {
  category: string;
  technologies: string[];
}

interface Principle {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface Stat {
  number: string;
  label: string;
  icon: React.ReactNode;
}

interface JourneyItem {
  date: string;
  title: string;
  description: string;
}

const About: React.FC = () => {
  const websiteFeatures: WebsiteFeature[] = [
    {
      icon: <FaUpload />,
      title: 'Video Upload & Management',
      description: 'Seamless video uploading and content management system',
      details: [
        '4K video support',
        'Batch uploads',
        'Auto-encoding',
        'Thumbnail generation',
        'Content organization'
      ]
    },
    {
      icon: <FaUserPlus />,
      title: 'User Registration & Profiles',
      description: 'Comprehensive user management system',
      details: [
        'Social login options',
        'Profile customization',
        'Verification system',
        'Role-based access',
        'Privacy controls'
      ]
    },
    {
      icon: <FaRobot />,
      title: 'AI Chatbot Assistant',
      description: 'Intelligent chatbot for customer support',
      details: [
        '24/7 availability',
        'Multi-language support',
        'Context-aware responses',
        'Ticket escalation',
        'Learning capabilities'
      ]
    },
    {
      icon: <FaBolt />,
      title: 'HypeMode Feature',
      description: 'Advanced engagement and promotion system',
      details: [
        'Live streaming',
        'Interactive polls',
        'Gamification',
        'Real-time analytics',
        'Audience engagement'
      ]
    },
    {
      icon: <FaStore />,
      title: 'Seller Marketplace',
      description: 'Complete e-commerce platform for sellers',
      details: [
        'Product listings',
        'Inventory management',
        'Price customization',
        'Promotional tools',
        'Sales analytics'
      ]
    },
    {
      icon: <FaShoppingCart />,
      title: 'Buyer Order System',
      description: 'Streamlined purchasing experience',
      details: [
        'Cart management',
        'Multiple payment options',
        'Order tracking',
        'Review system',
        'Wishlist feature'
      ]
    },
    {
      icon: <FaComments />,
      title: 'Live Chat System',
      description: 'Real-time communication platform',
      details: [
        'Seller-buyer messaging',
        'File sharing',
        'Video calls',
        'Chat history',
        'Notification system'
      ]
    },
    {
      icon: <FaShieldAlt />,
      title: 'Secure Transactions',
      description: 'Protected payment processing',
      details: [
        'SSL encryption',
        'PCI compliance',
        'Fraud detection',
        'Secure wallets',
        'Escrow system'
      ]
    }
  ];

  const additionalFeatures: Feature[] = [
    {
      icon: <FaSync />,
      title: 'Order Processing',
      description: 'Automated order workflow management',
      category: 'Workflow'
    },
    {
      icon: <FaCog />,
      title: 'Custom Requirements',
      description: 'Flexible customization options for orders',
      category: 'Workflow'
    },
    {
      icon: <FaQrcode />,
      title: 'QR Code Integration',
      description: 'Quick access and verification system',
      category: 'Technology'
    },
    {
      icon: <FaWallet />,
      title: 'Digital Wallet',
      description: 'Integrated payment and wallet system',
      category: 'Finance'
    },
    {
      icon: <FaTrophy />,
      title: 'Achievement System',
      description: 'Gamified rewards and recognition',
      category: 'Engagement'
    },
    {
      icon: <FaHeart />,
      title: 'Favorites System',
      description: 'Personalized content curation',
      category: 'User Experience'
    },
    {
      icon: <FaBell />,
      title: 'Smart Notifications',
      description: 'Real-time alerts and updates',
      category: 'Communication'
    },
    {
      icon: <FaChartLine />,
      title: 'Analytics Dashboard',
      description: 'Comprehensive performance insights',
      category: 'Analytics'
    }
  ];

  const techStack: TechStack[] = [
    {
      category: 'Frontend',
      technologies: ['React.js', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Redux', 'WebSocket']
    },
    {
      category: 'Backend',
      technologies: ['Node.js', 'Express.js', 'Python', 'Django', 'GraphQL', 'REST API']
    },
    {
      category: 'Database',
      technologies: ['MongoDB', 'PostgreSQL', 'Redis', 'Firebase', 'Elasticsearch']
    },
    {
      category: 'Cloud & DevOps',
      technologies: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Nginx', 'PM2']
    },
    {
      category: 'AI/ML',
      technologies: ['TensorFlow', 'OpenAI', 'ChatGPT', 'Computer Vision', 'NLP']
    },
    {
      category: 'Payment',
      technologies: ['Stripe', 'PayPal', 'Razorpay', 'Wallet System', 'Escrow']
    }
  ];

  const stats: Stat[] = [
    { number: '100K+', label: 'Registered Users', icon: <FaUsers /> },
    { number: '50K+', label: 'Video Uploads', icon: <FaVideo /> },
    { number: '10K+', label: 'Active Sellers', icon: <FaStore /> },
    { number: '95%', label: 'Satisfaction Rate', icon: <FaStar /> },
    { number: '24/7', label: 'Uptime', icon: <FaGlobe /> },
    { number: '99.9%', label: 'Security Score', icon: <FaLock /> }
  ];

  const teamPrinciples: Principle[] = [
    {
      icon: <FaCode />,
      title: 'Technical Excellence',
      description: 'Building with cutting-edge technologies and best practices'
    },
    {
      icon: <FaPaintBrush />,
      title: 'Design First',
      description: 'Creating intuitive and beautiful user experiences'
    },
    {
      icon: <FaRocket />,
      title: 'Innovation Driven',
      description: 'Constantly exploring new solutions and improvements'
    },
    {
      icon: <FaUsers />,
      title: 'User Centric',
      description: 'Focusing on solving real problems for our users'
    }
  ];

  const journey: JourneyItem[] = [
    {
      date: '2022 Q4',
      title: 'Concept & Planning',
      description: 'Identified market gap for creator-focused platform. Designed initial architecture and feature set.'
    },
    {
      date: '2023 Q1',
      title: 'Core Development',
      description: 'Built authentication, video upload, and basic marketplace features. Implemented real-time chat.'
    },
    {
      date: '2023 Q2',
      title: 'Feature Expansion',
      description: 'Added HypeMode, AI chatbot, advanced analytics, and payment integration with escrow system.'
    },
    {
      date: '2023 Q3',
      title: 'Testing & Optimization',
      description: 'Conducted extensive testing, performance optimization, and security audits. Prepared for launch.'
    },
    {
      date: '2023 Q4',
      title: 'Launch & Growth',
      description: 'Official launch with initial user base. Continuous improvements based on user feedback.'
    }
  ];

  // Group features by category
  const groupedFeatures = additionalFeatures.reduce((acc: Record<string, Feature[]>, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="about-page">
        {/* Hero Section */}
        <section className="website-hero">
          <div className="hero-overlay"></div>
          <div className="container">
            <div className="hero-content">
              <h1 className="hero-title">
                Welcome to <span className="highlight">WeCinema.co</span>
              </h1>
              <p className="hero-subtitle">
                The Ultimate Platform for Video Content Creators and Consumers
              </p>
              <p className="hero-description">
                WeCinema is a revolutionary platform that combines video streaming, e-commerce, 
                and social features into one seamless experience. Built by developers, for creators.
              </p>
              <div className="hero-stats">
                {stats.slice(0, 4).map((stat, index) => (
                  <div key={index} className="stat-item">
                    <div className="stat-icon">{stat.icon}</div>
                    <h3>{stat.number}</h3>
                    <p>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Website Features Section */}
        <section className="website-features">
          <div className="container">
            <div className="section-header">
              <h2>WeCinema Platform Features</h2>
              <p>Everything you need in one powerful platform</p>
            </div>
            <div className="features-grid">
              {websiteFeatures.map((feature, index) => (
                <div key={index} className="feature-card">
                  <div className="feature-icon">{feature.icon}</div>
                  <h3>{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                  <div className="feature-details">
                    {feature.details.map((detail, idx) => (
                      <span key={idx} className="detail-tag">
                        {detail}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="workflow-section">
          <div className="container">
            <div className="section-header">
              <h2>How WeCinema Works</h2>
              <p>Seamless workflow from content creation to consumption</p>
            </div>
            <div className="workflow-steps">
              <div className="workflow-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>Content Creation & Upload</h3>
                  <p>Sellers upload videos with detailed descriptions, pricing, and requirements</p>
                  <div className="step-features">
                    <span><FaUpload /> Video Upload</span>
                    <span><FaCog /> Custom Requirements</span>
                    <span><FaLayerGroup /> Content Management</span>
                  </div>
                </div>
              </div>
              
              <div className="workflow-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>Buyer Discovery & Order</h3>
                  <p>Buyers browse listings, communicate with sellers, and place orders</p>
                  <div className="step-features">
                    <span><FaShoppingCart /> Order Placement</span>
                    <span><FaComments /> Live Chat</span>
                    <span><FaHandshake /> Offer Negotiation</span>
                  </div>
                </div>
              </div>
              
              <div className="workflow-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>Order Processing & Delivery</h3>
                  <p>Sellers deliver content, buyers review, and payments are processed</p>
                  <div className="step-features">
                    <span><FaSync /> Order Processing</span>
                    <span><FaVideo /> Content Delivery</span>
                    <span><FaWallet /> Secure Payment</span>
                  </div>
                </div>
              </div>
              
              <div className="workflow-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h3>Community & Engagement</h3>
                  <p>Users interact, share feedback, and grow within the community</p>
                  <div className="step-features">
                    <span><FaStar /> Reviews & Ratings</span>
                    <span><FaBolt /> HypeMode Engagement</span>
                    <span><FaRobot /> AI Support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Additional Features */}
        <section className="additional-features">
          <div className="container">
            <div className="section-header">
              <h2>Advanced Features</h2>
              <p>Powerful tools to enhance your experience</p>
            </div>
            <div className="features-categories">
              {Object.keys(groupedFeatures).map((category) => (
                <div key={category} className="feature-category">
                  <h3>{category}</h3>
                  <div className="category-features">
                    {groupedFeatures[category].map((feature, idx) => (
                      <div key={idx} className="mini-feature">
                        <div className="feature-icon-small">{feature.icon}</div>
                        <div>
                          <h4>{feature.title}</h4>
                          <p>{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <section className="tech-stack-section">
          <div className="container">
            <div className="section-header">
              <h2>Technology Stack</h2>
              <p>Built with modern, scalable technologies</p>
            </div>
            <div className="tech-grid">
              {techStack.map((stack, index) => (
                <div key={index} className="tech-category">
                  <h3>{stack.category}</h3>
                  <div className="tech-tags">
                    {stack.technologies.map((tech, idx) => (
                      <span key={idx} className="tech-tag">{tech}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About Me Section */}
        <section className="personal-section">
          <div className="container">
            <div className="section-header">
              <h2>About the Creator</h2>
              <p>Meet the developer behind WeCinema</p>
            </div>
            <div className="personal-content">
              <div className="personal-info">
                <div className="personal-avatar">
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80" 
                    alt="Hamza Manzoor" 
                  />
                  <div className="avatar-badge">
                    <FaCode /> Developer & Designer
                  </div>
                </div>
                <div className="personal-details">
                  <h3>Hamza Manzoor</h3>
                  <p className="role">Full Stack Developer & UI/UX Designer</p>
                  
                  <div className="personal-bio">
                    <p>
                      As the sole developer and designer of WeCinema, I've dedicated myself to creating 
                      a platform that solves real problems for content creators and consumers alike.
                    </p>
                    <p>
                      With 5+ years of experience in full-stack development, I've built WeCinema from 
                      the ground up, focusing on creating a seamless user experience while implementing 
                      complex features like real-time chat, video processing, and secure transactions.
                    </p>
                  </div>
                  
                  <div className="personal-stats">
                    <div className="personal-stat">
                      <FaCode />
                      <span>5+ Years Experience</span>
                    </div>
                    <div className="personal-stat">
                      <FaProjectDiagram />
                      <span>100+ Projects Completed</span>
                    </div>
                    <div className="personal-stat">
                      <FaAward />
                      <span>Expert in MERN Stack</span>
                    </div>
                  </div>
                  
                  <div className="personal-social">
                    <a href="https://github.com/hamza-manzoor" target="_blank" rel="noopener noreferrer">
                      <FaGithub />
                    </a>
                    <a href="https://linkedin.com/in/hamza-manzoor" target="_blank" rel="noopener noreferrer">
                      <FaLinkedin />
                    </a>
                    <a href="https://twitter.com/hamza_manzoor" target="_blank" rel="noopener noreferrer">
                      <FaTwitter />
                    </a>
                    <a href="mailto:contact@wecinema.co">
                      <FaEnvelope />
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="development-principles">
                <h3>Development Principles</h3>
                <div className="principles-grid">
                  {teamPrinciples.map((principle, index) => (
                    <div key={index} className="principle-card">
                      <div className="principle-icon">{principle.icon}</div>
                      <h4>{principle.title}</h4>
                      <p>{principle.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Development Journey */}
        <section className="journey-section">
          <div className="container">
            <div className="section-header">
              <h2>Development Journey</h2>
              <p>From concept to reality</p>
            </div>
            <div className="journey-timeline">
              {journey.map((item, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-date">{item.date}</div>
                  <div className="timeline-content">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="platform-stats">
          <div className="container">
            <div className="stats-grid">
              {stats.map((stat, index) => (
                <div key={index} className="platform-stat">
                  <div className="stat-icon-large">{stat.icon}</div>
                  <h3>{stat.number}</h3>
                  <p>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="platform-cta">
          <div className="container">
            <div className="cta-content">
              <h2>Join the WeCinema Revolution</h2>
              <p>
                Whether you're a content creator looking to monetize your skills or a consumer 
                seeking quality content, WeCinema offers the perfect platform for your needs.
              </p>
              <div className="cta-buttons">
                <button className="btn btn-primary btn-large">
                  <FaUserPlus /> Join as Creator
                </button>
                <button className="btn btn-secondary btn-large">
                  <FaShoppingCart /> Start Browsing
                </button>
                <button className="btn btn-outline btn-large">
                  <FaVideo /> Explore Features
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="platform-footer">
          <div className="container">
            <div className="footer-content">
              <div className="footer-brand">
                <h3>WeCinema.co</h3>
                <p>Empowering creators, delighting consumers</p>
                <div className="footer-social">
                  <a href="#"><FaGithub /></a>
                  <a href="#"><FaTwitter /></a>
                  <a href="#"><FaLinkedin /></a>
                  <a href="#"><FaEnvelope /></a>
                </div>
              </div>
              <div className="footer-links">
                <div className="link-group">
                  <h4>Platform</h4>
                  <a href="#">Features</a>
                  <a href="#">Pricing</a>
                  <a href="#">API Docs</a>
                  <a href="#">Status</a>
                </div>
                <div className="link-group">
                  <h4>Resources</h4>
                  <a href="#">Documentation</a>
                  <a href="#">Blog</a>
                  <a href="#">Community</a>
                  <a href="#">Support</a>
                </div>
                <div className="link-group">
                  <h4>Legal</h4>
                  <a href="#">Privacy Policy</a>
                  <a href="#">Terms of Service</a>
                  <a href="#">Cookie Policy</a>
                  <a href="#">Security</a>
                </div>
              </div>
            </div>
            <div className="footer-bottom">
              <p>&copy; {new Date().getFullYear()} WeCinema.co. All rights reserved.</p>
              <p>Built with ❤️ by <strong>Hamza Manzoor</strong></p>
            </div>
          </div>
        </footer>
      </div>
    </Layout>
  );
};

export default About;