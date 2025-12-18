import React from 'react';
import Layout from '../../components/Layout';

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

interface Stat {
  number: string;
  label: string;
  icon: React.ReactNode;
}

const About: React.FC = () => {
  const websiteFeatures: WebsiteFeature[] = [
    {
      icon: <FaUpload />,
      title: 'Video Upload & Management',
      description: 'Seamless video uploading and content management system with 4K support and batch processing',
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
      description: 'Comprehensive user management with social login and profile customization',
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
      description: 'Intelligent chatbot for 24/7 customer support and automated responses',
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
      description: 'Advanced engagement system for live streaming and audience interaction',
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
      description: 'Complete e-commerce platform with inventory management and sales analytics',
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
      description: 'Streamlined purchasing experience with multiple payment options',
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
      description: 'Real-time communication platform for instant seller-buyer interaction',
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
      description: 'Protected payment processing with enterprise-level security',
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
      description: 'Automated order workflow management system',
      category: 'Workflow'
    },
    {
      icon: <FaCog />,
      title: 'Custom Requirements',
      description: 'Flexible customization options for all orders',
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
      description: 'Gamified rewards and recognition system',
      category: 'Engagement'
    },
    {
      icon: <FaHeart />,
      title: 'Favorites System',
      description: 'Personalized content curation tools',
      category: 'User Experience'
    },
    {
      icon: <FaBell />,
      title: 'Smart Notifications',
      description: 'Real-time alerts and updates system',
      category: 'Communication'
    },
    {
      icon: <FaChartLine />,
      title: 'Analytics Dashboard',
      description: 'Comprehensive performance insights',
      category: 'Analytics'
    }
  ];

  const stats: Stat[] = [
    { number: '500K+', label: 'Monthly Active Users', icon: <FaUsers /> },
    { number: '1M+', label: 'Total Video Uploads', icon: <FaVideo /> },
    { number: '50K+', label: 'Verified Sellers', icon: <FaStore /> },
    { number: '98%', label: 'Customer Satisfaction', icon: <FaStar /> },
    { number: '99.9%', label: 'Platform Uptime', icon: <FaGlobe /> },
    { number: '24/7', label: 'Support Available', icon: <FaComments /> }
  ];

  const teamPrinciples = [
    {
      icon: <FaCode />,
      title: 'Technical Excellence',
      description: 'Building with cutting-edge technologies and industry best practices'
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
                Welcome to <span className="highlight">WeCinema</span>
              </h1>
              <p className="hero-subtitle">
                The Professional Platform for Digital Content Creation
              </p>
              <p className="hero-description">
                WeCinema is a comprehensive platform that empowers creators and engages audiences 
                through cutting-edge technology and intuitive design. Built for professionals, 
                by professionals.
              </p>
              <div className="cta-buttons">
                <button className="btn btn-primary btn-large">
                  <FaUserPlus /> <span className="btn-text">Create Professional Account</span>
                </button>
                <button className="btn btn-secondary btn-large">
                  <FaVideo /> <span className="btn-text">Explore Platform Features</span>
                </button>
              </div>
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

        {/* Website Features Section */}
        <section className="website-features">
          <div className="container">
            <div className="section-header">
              <h2>Platform Features</h2>
              <p>Comprehensive Tools for Content Creators and Consumers</p>
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
              <h2>How It Works</h2>
              <p>Streamlined Process from Creation to Consumption</p>
            </div>
            <div className="workflow-steps">
              <div className="workflow-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>Content Creation & Upload</h3>
                  <p>Sellers upload videos with detailed descriptions, pricing, and requirements. Platform supports multiple formats and automatic optimization.</p>
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
                  <p>Buyers browse listings, communicate with sellers via live chat, and place orders with secure payment options.</p>
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
                  <p>Sellers deliver content, buyers review, and payments are processed securely through our escrow system.</p>
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
                  <p>Users interact through reviews, ratings, and participate in HypeMode events for enhanced engagement.</p>
                  <div className="step-features">
                    <span><FaStar /> Reviews & Ratings</span>
                    <span><FaBolt /> HypeMode Engagement</span>
                    <span><FaRobot /> AI Support</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="section-cta">
              <button className="btn btn-primary btn-large">
                <FaStore /> <span className="btn-text">Start Selling Content</span>
              </button>
            </div>
          </div>
        </section>

        {/* Additional Features */}
        <section className="additional-features">
          <div className="container">
            <div className="section-header">
              <h2>Advanced Features</h2>
              <p>Enhanced Capabilities for Professional Users</p>
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

        {/* About Me Section */}
        <section className="personal-section">
          <div className="container">
            <div className="section-header">
              <h2>About the Creator</h2>
              <p>Professional Developer Behind WeCinema</p>
            </div>
            <div className="personal-content">
              <div className="personal-info">
                <div className="personal-avatar">
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80" 
                    alt="Hamza Manzoor" 
                  />
                  <div className="avatar-badge">
                    <FaCode /> Founder & Lead Developer
                  </div>
                </div>
                <div className="personal-details">
                  <h3>Hamza Manzoor</h3>
                  <p className="role">Full Stack Developer & UI/UX Designer</p>
                  
                  <div className="personal-bio">
                    <p>
                      As the creator of WeCinema, I bring together technical expertise and creative 
                      vision to build platforms that solve real-world problems. With extensive experience 
                      in full-stack development, I've designed WeCinema to be a comprehensive ecosystem 
                      that serves both content creators and consumers.
                    </p>
                    <p>
                      My approach combines modern development practices with user-centric design, 
                      ensuring that every feature in WeCinema is not only functional but also intuitive 
                      and efficient. The platform represents years of dedication to creating the ultimate 
                      digital content experience.
                    </p>
                  </div>
                  
                  <div className="personal-stats">
                    <div className="personal-stat">
                      <FaCode />
                      <div>
                        <h4>5+ Years</h4>
                        <p>Development Experience</p>
                      </div>
                    </div>
                    <div className="personal-stat">
                      <FaProjectDiagram />
                      <div>
                        <h4>100+</h4>
                        <p>Projects Completed</p>
                      </div>
                    </div>
                    <div className="personal-stat">
                      <FaAward />
                      <div>
                        <h4>Expert</h4>
                        <p>MERN Stack Developer</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="personal-contact">
                    <h4>Professional Contact</h4>
                    <div className="personal-social">
                      <a href="https://github.com/hamza-manzoor" target="_blank" rel="noopener noreferrer" className="social-btn">
                        <FaGithub />
                        <span className="btn-text">GitHub Portfolio</span>
                      </a>
                      <a href="https://linkedin.com/in/hamza-manzoor" target="_blank" rel="noopener noreferrer" className="social-btn">
                        <FaLinkedin />
                        <span className="btn-text">LinkedIn Profile</span>
                      </a>
                      <a href="mailto:contact@wecinema.co" className="social-btn">
                        <FaEnvelope />
                        <span className="btn-text">Professional Email</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Development Principles */}
        <section className="principles-section">
          <div className="container">
            <div className="section-header">
              <h2>Development Philosophy</h2>
              <p>Principles That Guide Our Platform Development</p>
            </div>
            <div className="principles-grid">
              {teamPrinciples.map((principle, index) => (
                <div key={index} className="principle-card">
                  <div className="principle-icon">{principle.icon}</div>
                  <h3>{principle.title}</h3>
                  <p>{principle.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="final-cta">
          <div className="container">
            <div className="cta-content">
              <h2>Ready to Experience Professional Content Creation?</h2>
              <p>
                Join thousands of professional creators and consumers who trust WeCinema for 
                their digital content needs. Experience the difference of a professionally 
                developed platform.
              </p>
              <div className="cta-buttons">
                <button className="btn btn-primary btn-large">
                  <FaUserPlus /> <span className="btn-text">Create Professional Account</span>
                </button>
                <button className="btn btn-secondary btn-large">
                  <FaVideo /> <span className="btn-text">Explore Platform Features</span>
                </button>
                <button className="btn btn-outline btn-large">
                  <FaStore /> <span className="btn-text">Start Selling Content</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default About;