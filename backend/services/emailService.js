const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    console.log('📧 Initializing Email Service...');
    console.log('GMAIL_USER:', process.env.GMAIL_USER ? 'Set' : 'Not Set');
    console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Not Set');
    
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      console.log('🔍 Verifying email connection...');
      await this.transporter.verify();
      console.log('✅ Email server is ready to take messages');
    } catch (error) {
      console.error('❌ Email connection failed:', error.message);
    }
  }

  // Modern professional email template with yellow-500 theme
  getEmailTemplate({ title, headerColor, content, isBuyer = false }) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.5;
            color: #374151;
            background-color: #f9fafb;
            margin: 0;
            padding: 20px;
        }
        
        .email-container {
            max-width: 580px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
            border: 1px solid #e5e7eb;
        }
        
        .header {
            background: ${headerColor};
            padding: 32px 24px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .header::after {
            content: '';
            position: absolute;
            bottom: -20px;
            right: -20px;
            width: 120px;
            height: 120px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 50%;
        }
        
        .logo {
            font-size: 24px;
            font-weight: 700;
            color: white;
            margin-bottom: 12px;
            letter-spacing: -0.5px;
        }
        
        .title {
            font-size: 22px;
            font-weight: 700;
            color: white;
            margin-bottom: 8px;
            line-height: 1.3;
        }
        
        .subtitle {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
            opacity: 0.95;
        }
        
        .content {
            padding: 32px 24px;
        }
        
        .order-card {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            border: 1px solid #fbbf24;
            text-align: center;
        }
        
        .order-amount {
            font-size: 40px;
            font-weight: 800;
            color: #92400e;
            margin-bottom: 8px;
        }
        
        .order-message {
            font-size: 16px;
            color: #92400e;
            margin-bottom: 16px;
            font-weight: 500;
        }
        
        .order-badge {
            display: inline-block;
            background: ${isBuyer ? '#059669' : '#dc2626'};
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.3px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin: 24px 0;
        }
        
        .info-card {
            background: #f9fafb;
            border-radius: 10px;
            padding: 16px;
            border: 1px solid #e5e7eb;
            transition: all 0.2s;
        }
        
        .info-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .info-icon {
            font-size: 20px;
            margin-bottom: 8px;
            display: block;
        }
        
        .info-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            font-weight: 600;
        }
        
        .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
        }
        
        .requirements-box {
            background: #fffbeb;
            border-radius: 10px;
            padding: 20px;
            margin: 24px 0;
            border-left: 4px solid #f59e0b;
        }
        
        .steps-container {
            background: #fefce8;
            border-radius: 10px;
            padding: 24px;
            margin: 24px 0;
        }
        
        .step-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(245, 158, 11, 0.2);
        }
        
        .step-item:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }
        
        .step-number {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            margin-right: 12px;
            flex-shrink: 0;
            font-size: 14px;
        }
        
        .step-content h4 {
            font-size: 15px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 4px;
        }
        
        .step-content p {
            font-size: 13px;
            color: #4b5563;
        }
        
        .payment-card {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border-radius: 10px;
            padding: 20px;
            margin: 24px 0;
            border-left: 4px solid #10b981;
        }
        
        .btn-container {
            text-align: center;
            margin: 32px 0 24px;
        }
        
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            margin: 8px;
            transition: all 0.3s;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
            border: none;
            cursor: pointer;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
            background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
        }
        
        .btn-secondary {
            background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
            box-shadow: 0 2px 8px rgba(75, 85, 99, 0.3);
        }
        
        .btn-secondary:hover {
            background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
            box-shadow: 0 4px 16px rgba(75, 85, 99, 0.4);
        }
        
        .footer {
            background: #111827;
            color: #d1d5db;
            padding: 32px 24px;
            text-align: center;
            border-top: 1px solid #374151;
        }
        
        .footer-links {
            margin: 20px 0;
            display: flex;
            justify-content: center;
            gap: 24px;
            flex-wrap: wrap;
        }
        
        .footer-links a {
            color: #9ca3af;
            text-decoration: none;
            font-size: 13px;
            transition: color 0.2s;
        }
        
        .footer-links a:hover {
            color: #f59e0b;
        }
        
        .copyright {
            font-size: 12px;
            color: #6b7280;
            margin-top: 20px;
            line-height: 1.5;
        }
        
        .divider {
            height: 1px;
            background: #e5e7eb;
            margin: 24px 0;
        }
        
        @media (max-width: 600px) {
            .content {
                padding: 24px 20px;
            }
            
            .header {
                padding: 24px 20px;
            }
            
            .title {
                font-size: 20px;
            }
            
            .order-amount {
                font-size: 32px;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .btn {
                display: block;
                margin: 12px 0;
                width: 100%;
            }
            
            .footer-links {
                flex-direction: column;
                gap: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        ${content}
    </div>
</body>
</html>`;
  }

  async sendOrderConfirmationToSeller(order, buyer, seller, chatLink) {
    try {
      console.log(`📧 Preparing seller email to: ${seller.email}`);
      
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error('Email credentials not configured');
      }

      const formattedDate = new Date(order.orderDate).toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const siteName = process.env.SITE_NAME || 'WeCinema';
      const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
      const supportEmail = process.env.SUPPORT_EMAIL || 'support@wecinema.co';

      const content = `
        <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
            <div class="logo">${siteName}</div>
            <h1 class="title">🎉 New Order Received</h1>
            <p class="subtitle">Congratulations! A buyer has placed an order</p>
        </div>
        
        <div class="content">
            <div class="order-card">
                <div class="order-amount">$${order.amount}</div>
                <p class="order-message">
                    New order from <strong>${buyer.username}</strong>
                </p>
                <div class="order-badge">ORDER #${order._id.toString().slice(-8).toUpperCase()}</div>
            </div>
            
            <div class="info-grid">
                <div class="info-card">
                    <span class="info-icon">👤</span>
                    <div class="info-label">Buyer</div>
                    <div class="info-value">${buyer.username}</div>
                </div>
                
                <div class="info-card">
                    <span class="info-icon">💰</span>
                    <div class="info-label">Order Amount</div>
                    <div class="info-value" style="color: #059669;">$${order.amount}</div>
                </div>
                
                <div class="info-card">
                    <span class="info-icon">📅</span>
                    <div class="info-label">Order Date</div>
                    <div class="info-value">${formattedDate}</div>
                </div>
                
                <div class="info-card">
                    <span class="info-icon">🆔</span>
                    <div class="info-label">Order ID</div>
                    <div class="info-value">${order._id.toString().slice(-8).toUpperCase()}</div>
                </div>
            </div>
            
            ${order.requirements ? `
            <div class="requirements-box">
                <h4 style="font-size: 15px; color: #92400e; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    📝 Customer Requirements
                </h4>
                <p style="color: #92400e; font-size: 14px; line-height: 1.5;">${order.requirements}</p>
            </div>
            ` : ''}
            
            <div class="steps-container">
                <h3 style="font-size: 18px; color: #1f2937; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                    🚀 Next Steps
                </h3>
                
                <div class="step-item">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h4>Contact Buyer</h4>
                        <p>Reach out within 24 hours</p>
                    </div>
                </div>
                
                <div class="step-item">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h4>Start Working</h4>
                        <p>Begin as per agreed timeline</p>
                    </div>
                </div>
                
                <div class="step-item">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <h4>Submit Delivery</h4>
                        <p>Upload completed work</p>
                    </div>
                </div>
                
                <div class="step-item">
                    <div class="step-number">4</div>
                    <div class="step-content">
                        <h4>Get Paid</h4>
                        <p>Receive payment after approval</p>
                    </div>
                </div>
            </div>
            
            <div class="payment-card">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <span style="font-size: 20px;">💰</span>
                    <h4 style="font-size: 16px; color: #065f46; margin: 0;">
                        Payment Secured in Escrow
                    </h4>
                </div>
                <p style="color: #065f46; font-size: 14px;">
                    <strong>$${order.amount}</strong> will be released to you once the order is completed and approved.
                </p>
            </div>
            
            <div class="btn-container">
                <a href="${chatLink}" class="btn">
                    💬 Open Chat with Buyer
                </a>
                <a href="${siteUrl}/seller/dashboard" class="btn btn-secondary">
                    📊 Go to Dashboard
                </a>
            </div>
            
            <div class="divider"></div>
        </div>
        
        <div class="footer">
            <div class="footer-links">
                <a href="${siteUrl}/help">Help Center</a>
                <a href="${siteUrl}/contact">Contact Us</a>
                <a href="${siteUrl}/terms">Terms</a>
                <a href="${siteUrl}/privacy">Privacy</a>
            </div>
            
            <div class="copyright">
                <p>This is an automated message from ${siteName}. Please do not reply to this email.</p>
                <p>Need help? <a href="mailto:${supportEmail}" style="color: #f59e0b; text-decoration: none;">${supportEmail}</a></p>
                <p>© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
            </div>
        </div>`;

      const emailTemplate = this.getEmailTemplate({
        title: `New Order - ${siteName}`,
        headerColor: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        content: content,
        isBuyer: false
      });

      const mailOptions = {
        from: `"${process.env.GMAIL_SENDER_NAME || siteName}" <${process.env.GMAIL_USER}>`,
        to: seller.email,
        subject: `🎉 New Order #${order._id.toString().slice(-8).toUpperCase()} - $${order.amount}`,
        html: emailTemplate,
        text: `New Order Received!\n\nOrder ID: ${order._id}\nAmount: $${order.amount}\nBuyer: ${buyer.username}\n\nChat Link: ${chatLink}\n\nThank you for using ${siteName}!`
      };

      console.log('📤 Sending seller email...');
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Seller email sent successfully:', info.messageId);
      return info;

    } catch (error) {
      console.error('❌ Seller email error:', error);
      throw error;
    }
  }

  async sendOrderConfirmationToBuyer(order, buyer, seller, chatLink) {
    try {
      console.log(`📧 Preparing buyer email to: ${buyer.email}`);
      
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error('Email credentials not configured');
      }

      const formattedDate = new Date(order.orderDate).toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const siteName = process.env.SITE_NAME || 'WeCinema';
      const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
      const supportEmail = process.env.SUPPORT_EMAIL || 'support@wecinema.co';

      const content = `
        <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <div class="logo">${siteName}</div>
            <h1 class="title">✅ Order Confirmed</h1>
            <p class="subtitle">Your order has been successfully placed</p>
        </div>
        
        <div class="content">
            <div class="order-card">
                <div class="order-amount">$${order.amount}</div>
                <p class="order-message">
                    Order with <strong>${seller.username}</strong> confirmed
                </p>
                <div class="order-badge">ORDER #${order._id.toString().slice(-8).toUpperCase()}</div>
            </div>
            
            <div class="info-grid">
                <div class="info-card">
                    <span class="info-icon">👨‍💼</span>
                    <div class="info-label">Seller</div>
                    <div class="info-value">${seller.username}</div>
                </div>
                
                <div class="info-card">
                    <span class="info-icon">💰</span>
                    <div class="info-label">Amount Paid</div>
                    <div class="info-value" style="color: #059669;">$${order.amount}</div>
                </div>
                
                <div class="info-card">
                    <span class="info-icon">📅</span>
                    <div class="info-label">Order Date</div>
                    <div class="info-value">${formattedDate}</div>
                </div>
                
                <div class="info-card">
                    <span class="info-icon">🛡️</span>
                    <div class="info-label">Payment Status</div>
                    <div class="info-value" style="color: #059669;">Secured in Escrow</div>
                </div>
            </div>
            
            ${order.requirements ? `
            <div class="requirements-box">
                <h4 style="font-size: 15px; color: #92400e; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    📋 Your Requirements
                </h4>
                <p style="color: #92400e; font-size: 14px; line-height: 1.5;">${order.requirements}</p>
            </div>
            ` : ''}
            
            <div class="steps-container">
                <h3 style="font-size: 18px; color: #1f2937; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                    📈 What Happens Next?
                </h3>
                
                <div class="step-item">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h4>Seller Contacts You</h4>
                        <p>Within 24 hours</p>
                    </div>
                </div>
                
                <div class="step-item">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h4>Work Progress</h4>
                        <p>Regular updates via chat</p>
                    </div>
                </div>
                
                <div class="step-item">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <h4>Review Delivery</h4>
                        <p>Check completed work</p>
                    </div>
                </div>
                
                <div class="step-item">
                    <div class="step-number">4</div>
                    <div class="step-content">
                        <h4>Approve & Complete</h4>
                        <p>Release payment</p>
                    </div>
                </div>
            </div>
            
            <div class="payment-card">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <span style="font-size: 20px;">🛡️</span>
                    <h4 style="font-size: 16px; color: #065f46; margin: 0;">
                        100% Payment Protection
                    </h4>
                </div>
                <p style="color: #065f46; font-size: 14px;">
                    Your payment of <strong>$${order.amount}</strong> is securely held in escrow.
                </p>
                <div style="margin-top: 12px; padding: 10px; background: rgba(255, 255, 255, 0.5); border-radius: 6px;">
                    <div style="font-size: 13px; color: #065f46; display: flex; align-items: center; gap: 6px;">
                        <span style="display: inline-block; width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></span>
                        <strong>Your money is safe</strong> - Pay only when satisfied
                    </div>
                </div>
            </div>
            
            <div class="btn-container">
                <a href="${chatLink}" class="btn">
                    💬 Message ${seller.username}
                </a>
                <div style="margin-top: 16px;">
                    <a href="${siteUrl}/orders/${order._id}" class="btn btn-secondary" style="margin-right: 8px;">
                        📦 Track Order
                    </a>
                    <a href="${siteUrl}/my-orders" class="btn btn-secondary">
                        📋 My Orders
                    </a>
                </div>
            </div>
            
            <div class="divider"></div>
        </div>
        
        <div class="footer">
            <div class="footer-links">
                <a href="${siteUrl}/help">Help Center</a>
                <a href="${siteUrl}/contact">Contact Us</a>
                <a href="${siteUrl}/terms">Terms</a>
                <a href="${siteUrl}/privacy">Privacy</a>
            </div>
            
            <div class="copyright">
                <p>This is an automated message from ${siteName}. Please do not reply to this email.</p>
                <p>Need help? <a href="mailto:${supportEmail}" style="color: #10b981; text-decoration: none;">${supportEmail}</a></p>
                <p>© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
            </div>
        </div>`;

      const emailTemplate = this.getEmailTemplate({
        title: `Order Confirmed - ${siteName}`,
        headerColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        content: content,
        isBuyer: true
      });

      const mailOptions = {
        from: `"${process.env.GMAIL_SENDER_NAME || siteName}" <${process.env.GMAIL_USER}>`,
        to: buyer.email,
        subject: `✅ Order #${order._id.toString().slice(-8).toUpperCase()} Confirmed - $${order.amount}`,
        html: emailTemplate,
        text: `Order Confirmed!\n\nOrder ID: ${order._id}\nAmount: $${order.amount}\nSeller: ${seller.username}\n\nChat Link: ${chatLink}\n\nThank you for using ${siteName}!`
      };

      console.log('📤 Sending buyer email...');
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Buyer email sent successfully:', info.messageId);
      return info;

    } catch (error) {
      console.error('❌ Buyer email error:', error);
      throw error;
    }
  }

  // Compact welcome email
  async sendWelcomeEmail(user) {
    try {
      const siteName = process.env.SITE_NAME || 'WeCinema';
      const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
      
      const content = `
        <div class="header" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
            <div class="logo">${siteName}</div>
            <h1 class="title">Welcome to ${siteName}! 👋</h1>
            <p class="subtitle">Your creative journey starts here</p>
        </div>
        
        <div class="content">
            <div class="order-card" style="text-align: center; background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border-color: #c084fc;">
                <h2 style="font-size: 24px; color: #6b21a8; margin-bottom: 12px;">
                    Hello ${user.username}! 🎉
                </h2>
                <p style="font-size: 15px; color: #7c3aed; margin-bottom: 20px;">
                    Welcome to ${siteName} - the premier platform for creative professionals.
                </p>
            </div>
            
            <div class="info-grid">
                <div class="info-card">
                    <span class="info-icon">🚀</span>
                    <div class="info-label">Get Started</div>
                    <div class="info-value">Complete Profile</div>
                </div>
                
                <div class="info-card">
                    <span class="info-icon">💼</span>
                    <div class="info-label">Explore</div>
                    <div class="info-value">Browse Projects</div>
                </div>
            </div>
            
            <div class="btn-container">
                <a href="${siteUrl}" class="btn" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
                    🚀 Explore Platform
                </a>
            </div>
            
            <div class="divider"></div>
        </div>
        
        <div class="footer">
            <div class="copyright">
                <p>© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
            </div>
        </div>`;

      const emailTemplate = this.getEmailTemplate({
        title: `Welcome to ${siteName}`,
        headerColor: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        content: content,
        isBuyer: false
      });

      const mailOptions = {
        from: `"${process.env.GMAIL_SENDER_NAME || siteName}" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: `🎬 Welcome to ${siteName}!`,
        html: emailTemplate
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Welcome email error:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();