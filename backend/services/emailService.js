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

  // Modern professional email template
  getEmailTemplate({ title, headerColor, content }) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #2D3748;
            background: linear-gradient(135deg, #667eea0d 0%, #764ba20d 100%);
            margin: 0;
            padding: 20px;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #FFFFFF;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
            border: 1px solid #E2E8F0;
        }
        
        .header {
            background: ${headerColor};
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: -50px;
            right: -50px;
            width: 200px;
            height: 200px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
        }
        
        .header::after {
            content: '';
            position: absolute;
            bottom: -30px;
            left: -30px;
            width: 150px;
            height: 150px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 50%;
        }
        
        .logo {
            font-family: 'Poppins', sans-serif;
            font-size: 32px;
            font-weight: 700;
            color: white;
            margin-bottom: 16px;
            letter-spacing: -0.5px;
            position: relative;
            z-index: 2;
        }
        
        .logo-icon {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            padding: 8px;
            border-radius: 12px;
            margin-right: 10px;
            vertical-align: middle;
        }
        
        .title {
            font-family: 'Poppins', sans-serif;
            font-size: 28px;
            font-weight: 700;
            color: white;
            margin-bottom: 12px;
            line-height: 1.3;
            position: relative;
            z-index: 2;
        }
        
        .subtitle {
            font-size: 16px;
            color: rgba(255, 255, 255, 0.9);
            opacity: 0.9;
            position: relative;
            z-index: 2;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .order-card {
            background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 32px;
            border: 1px solid #E2E8F0;
            text-align: center;
        }
        
        .order-amount {
            font-family: 'Poppins', sans-serif;
            font-size: 48px;
            font-weight: 700;
            color: #2D3748;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .order-message {
            font-size: 18px;
            color: #4A5568;
            margin-bottom: 20px;
        }
        
        .highlight {
            background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 600;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 32px 0;
        }
        
        .info-card {
            background: #FFFFFF;
            border-radius: 16px;
            padding: 24px;
            border: 1px solid #E2E8F0;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .info-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
        }
        
        .info-icon {
            font-size: 24px;
            margin-bottom: 12px;
            display: block;
        }
        
        .info-label {
            font-size: 14px;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .info-value {
            font-size: 18px;
            font-weight: 600;
            color: #2D3748;
        }
        
        .requirements-box {
            background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
            border-radius: 16px;
            padding: 24px;
            margin: 32px 0;
            border-left: 6px solid #F59E0B;
        }
        
        .steps-container {
            background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%);
            border-radius: 16px;
            padding: 32px;
            margin: 32px 0;
        }
        
        .step-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 24px;
            padding-bottom: 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.5);
        }
        
        .step-item:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }
        
        .step-number {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            margin-right: 16px;
            flex-shrink: 0;
        }
        
        .step-content h4 {
            font-size: 16px;
            font-weight: 600;
            color: #2D3748;
            margin-bottom: 4px;
        }
        
        .step-content p {
            font-size: 14px;
            color: #4A5568;
        }
        
        .payment-card {
            background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
            border-radius: 16px;
            padding: 24px;
            margin: 32px 0;
            border-left: 6px solid #10B981;
        }
        
        .btn-container {
            text-align: center;
            margin: 40px 0;
        }
        
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 18px 40px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            margin: 10px;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            border: none;
            cursor: pointer;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        
        .btn-secondary {
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
        }
        
        .footer {
            background: #1A202C;
            color: #CBD5E0;
            padding: 40px 30px;
            text-align: center;
            border-top: 1px solid #2D3748;
        }
        
        .social-links {
            margin: 24px 0;
        }
        
        .social-link {
            display: inline-block;
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            margin: 0 8px;
            line-height: 40px;
            color: white;
            text-decoration: none;
            transition: background 0.3s;
        }
        
        .social-link:hover {
            background: #667eea;
        }
        
        .footer-links {
            margin-top: 20px;
        }
        
        .footer-links a {
            color: #CBD5E0;
            text-decoration: none;
            margin: 0 12px;
            font-size: 14px;
            transition: color 0.3s;
        }
        
        .footer-links a:hover {
            color: #667eea;
        }
        
        .copyright {
            font-size: 12px;
            color: #718096;
            margin-top: 24px;
        }
        
        @media (max-width: 600px) {
            .content {
                padding: 30px 20px;
            }
            
            .header {
                padding: 30px 20px;
            }
            
            .title {
                font-size: 24px;
            }
            
            .order-amount {
                font-size: 36px;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .btn {
                display: block;
                margin: 10px 0;
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
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const siteName = process.env.SITE_NAME || 'WeCinema';
      const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
      const supportEmail = process.env.SUPPORT_EMAIL || 'support@wecinema.co';

      const content = `
        <div class="header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div class="logo">
                <span class="logo-icon">🎬</span>${siteName}
            </div>
            <h1 class="title">New Order Alert! 🎉</h1>
            <p class="subtitle">Congratulations! You've received a new order</p>
        </div>
        
        <div class="content">
            <div class="order-card">
                <div class="order-amount">$${order.amount}</div>
                <p class="order-message">
                    New order from <span class="highlight">${buyer.username}</span> has been placed successfully!
                </p>
                <div style="display: inline-block; background: #10B981; color: white; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                    ORDER #${order._id.toString().slice(-8).toUpperCase()}
                </div>
            </div>
            
            <h3 style="font-family: 'Poppins', sans-serif; font-size: 20px; color: #2D3748; margin-bottom: 20px;">📋 Order Information</h3>
            
            <div class="info-grid">
                <div class="info-card">
                    <span class="info-icon">👤</span>
                    <div class="info-label">Buyer</div>
                    <div class="info-value">${buyer.username}</div>
                </div>
                
                <div class="info-card">
                    <span class="info-icon">💰</span>
                    <div class="info-label">Order Amount</div>
                    <div class="info-value" style="color: #10B981;">$${order.amount}</div>
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
                <h4 style="font-family: 'Poppins', sans-serif; font-size: 16px; color: #92400E; margin-bottom: 12px; display: flex; align-items: center;">
                    <span style="margin-right: 8px;">📝</span> Customer Requirements
                </h4>
                <p style="color: #92400E; line-height: 1.6;">${order.requirements}</p>
            </div>
            ` : ''}
            
            <div class="steps-container">
                <h3 style="font-family: 'Poppins', sans-serif; font-size: 20px; color: #2D3748; margin-bottom: 24px; display: flex; align-items: center;">
                    <span style="margin-right: 10px;">🚀</span> Next Steps to Complete
                </h3>
                
                <div class="step-item">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h4>Contact the Buyer</h4>
                        <p>Reach out within 24 hours to confirm all requirements</p>
                    </div>
                </div>
                
                <div class="step-item">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h4>Start Working</h4>
                        <p>Begin the project as per agreed timeline</p>
                    </div>
                </div>
                
                <div class="step-item">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <h4>Submit Delivery</h4>
                        <p>Upload completed work through the platform</p>
                    </div>
                </div>
                
                <div class="step-item">
                    <div class="step-number">4</div>
                    <div class="step-content">
                        <h4>Get Paid</h4>
                        <p>Receive payment once buyer approves delivery</p>
                    </div>
                </div>
            </div>
            
            <div class="payment-card">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 24px; margin-right: 12px;">💰</span>
                    <h4 style="font-family: 'Poppins', sans-serif; font-size: 18px; color: #065F46; margin: 0;">
                        Payment Secured in Escrow
                    </h4>
                </div>
                <p style="color: #065F46;">
                    <strong>$${order.amount}</strong> has been secured and will be released to you 
                    once the order is completed and approved by the buyer.
                </p>
            </div>
            
            <div class="btn-container">
                <a href="${chatLink}" class="btn">
                    💬 Open Chat with Buyer
                </a>
                <br>
                <a href="${siteUrl}/seller/dashboard" class="btn btn-secondary" style="margin-top: 15px;">
                    📊 Go to Dashboard
                </a>
            </div>
        </div>
        
        <div class="footer">
            <div class="social-links">
                <a href="#" class="social-link">f</a>
                <a href="#" class="social-link">in</a>
                <a href="#" class="social-link">tw</a>
                <a href="#" class="social-link">ig</a>
            </div>
            
            <div class="footer-links">
                <a href="${siteUrl}/help">Help Center</a>
                <a href="${siteUrl}/contact">Contact Us</a>
                <a href="${siteUrl}/terms">Terms of Service</a>
                <a href="${siteUrl}/privacy">Privacy Policy</a>
            </div>
            
            <div class="copyright">
                <p>This is an automated message from ${siteName}. Please do not reply to this email.</p>
                <p>Need help? Contact our support team at <a href="mailto:${supportEmail}" style="color: #667eea;">${supportEmail}</a></p>
                <p>© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
            </div>
        </div>`;

      const emailTemplate = this.getEmailTemplate({
        title: `New Order Received - ${siteName}`,
        headerColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        content: content
      });

      const mailOptions = {
        from: `"${process.env.GMAIL_SENDER_NAME || siteName}" <${process.env.GMAIL_USER}>`,
        to: seller.email,
        subject: `🎉 New Order Received - ${order._id.toString().slice(-8).toUpperCase()} - $${order.amount} - ${siteName}`,
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
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const siteName = process.env.SITE_NAME || 'WeCinema';
      const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
      const supportEmail = process.env.SUPPORT_EMAIL || 'support@wecinema.co';

      const content = `
        <div class="header" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%);">
            <div class="logo">
                <span class="logo-icon">🎬</span>${siteName}
            </div>
            <h1 class="title">Order Confirmed! ✅</h1>
            <p class="subtitle">Your order has been successfully placed</p>
        </div>
        
        <div class="content">
            <div class="order-card">
                <div class="order-amount">$${order.amount}</div>
                <p class="order-message">
                    Your order with <span class="highlight">${seller.username}</span> has been confirmed!
                </p>
                <div style="display: inline-block; background: #3B82F6; color: white; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                    ORDER #${order._id.toString().slice(-8).toUpperCase()}
                </div>
            </div>
            
            <h3 style="font-family: 'Poppins', sans-serif; font-size: 20px; color: #2D3748; margin-bottom: 20px;">📋 Order Summary</h3>
            
            <div class="info-grid">
                <div class="info-card">
                    <span class="info-icon">👨‍💼</span>
                    <div class="info-label">Seller</div>
                    <div class="info-value">${seller.username}</div>
                </div>
                
                <div class="info-card">
                    <span class="info-icon">💰</span>
                    <div class="info-label">Amount Paid</div>
                    <div class="info-value" style="color: #10B981;">$${order.amount}</div>
                </div>
                
                <div class="info-card">
                    <span class="info-icon">📅</span>
                    <div class="info-label">Order Date</div>
                    <div class="info-value">${formattedDate}</div>
                </div>
                
                <div class="info-card">
                    <span class="info-icon">🛡️</span>
                    <div class="info-label">Payment Status</div>
                    <div class="info-value" style="color: #10B981;">Secured in Escrow</div>
                </div>
            </div>
            
            ${order.requirements ? `
            <div class="requirements-box">
                <h4 style="font-family: 'Poppins', sans-serif; font-size: 16px; color: #92400E; margin-bottom: 12px; display: flex; align-items: center;">
                    <span style="margin-right: 8px;">📋</span> Your Requirements
                </h4>
                <p style="color: #92400E; line-height: 1.6;">${order.requirements}</p>
            </div>
            ` : ''}
            
            <div class="steps-container">
                <h3 style="font-family: 'Poppins', sans-serif; font-size: 20px; color: #2D3748; margin-bottom: 24px; display: flex; align-items: center;">
                    <span style="margin-right: 10px;">📈</span> What Happens Next?
                </h3>
                
                <div class="step-item">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h4>Seller Will Contact You</h4>
                        <p>The seller will reach out within 24 hours to confirm requirements</p>
                    </div>
                </div>
                
                <div class="step-item">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h4>Work Progress Updates</h4>
                        <p>Receive regular updates through the chat system</p>
                    </div>
                </div>
                
                <div class="step-item">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <h4>Review Delivery</h4>
                        <p>Carefully review the completed work when delivered</p>
                    </div>
                </div>
                
                <div class="step-item">
                    <div class="step-number">4</div>
                    <div class="step-content">
                        <h4>Approve & Complete</h4>
                        <p>Approve the work to release payment to the seller</p>
                    </div>
                </div>
            </div>
            
            <div class="payment-card">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 24px; margin-right: 12px;">🛡️</span>
                    <h4 style="font-family: 'Poppins', sans-serif; font-size: 18px; color: #065F46; margin: 0;">
                        100% Payment Protection
                    </h4>
                </div>
                <p style="color: #065F46;">
                    Your payment of <strong>$${order.amount}</strong> is securely held in escrow 
                    and will only be released to the seller once you approve the delivery.
                </p>
                <div style="margin-top: 16px; padding: 12px; background: rgba(255, 255, 255, 0.5); border-radius: 8px;">
                    <div style="font-size: 14px; color: #065F46;">
                        <span style="display: inline-block; width: 8px; height: 8px; background: #10B981; border-radius: 50%; margin-right: 8px;"></span>
                        <strong>Your money is safe</strong> - Only pay when you're satisfied
                    </div>
                </div>
            </div>
            
            <div class="btn-container">
                <a href="${chatLink}" class="btn">
                    💬 Message ${seller.username}
                </a>
                <br>
                <div style="margin-top: 20px;">
                    <a href="${siteUrl}/orders/${order._id}" class="btn btn-secondary">
                        📦 Track Order
                    </a>
                    <a href="${siteUrl}/my-orders" class="btn" style="background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%); margin-left: 10px;">
                        📋 View All Orders
                    </a>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="social-links">
                <a href="#" class="social-link">f</a>
                <a href="#" class="social-link">in</a>
                <a href="#" class="social-link">tw</a>
                <a href="#" class="social-link">ig</a>
            </div>
            
            <div class="footer-links">
                <a href="${siteUrl}/help">Help Center</a>
                <a href="${siteUrl}/contact">Contact Us</a>
                <a href="${siteUrl}/terms">Terms of Service</a>
                <a href="${siteUrl}/privacy">Privacy Policy</a>
            </div>
            
            <div class="copyright">
                <p>This is an automated message from ${siteName}. Please do not reply to this email.</p>
                <p>Need help? Contact our support team at <a href="mailto:${supportEmail}" style="color: #10B981;">${supportEmail}</a></p>
                <p>© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
            </div>
        </div>`;

      const emailTemplate = this.getEmailTemplate({
        title: `Order Confirmed - ${siteName}`,
        headerColor: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        content: content
      });

      const mailOptions = {
        from: `"${process.env.GMAIL_SENDER_NAME || siteName}" <${process.env.GMAIL_USER}>`,
        to: buyer.email,
        subject: `✅ Order Confirmed - ${order._id.toString().slice(-8).toUpperCase()} - $${order.amount} - ${siteName}`,
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

  // Additional professional email templates
  async sendWelcomeEmail(user) {
    try {
      const siteName = process.env.SITE_NAME || 'WeCinema';
      
      const content = `
        <div class="header" style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);">
            <div class="logo">
                <span class="logo-icon">🎬</span>${siteName}
            </div>
            <h1 class="title">Welcome to ${siteName}! 👋</h1>
            <p class="subtitle">Your creative journey starts here</p>
        </div>
        
        <div class="content">
            <div class="order-card" style="text-align: center;">
                <h2 style="font-family: 'Poppins', sans-serif; font-size: 28px; color: #2D3748; margin-bottom: 16px;">
                    Hello ${user.username}! 🎉
                </h2>
                <p style="font-size: 18px; color: #4A5568; margin-bottom: 24px;">
                    We're thrilled to have you join ${siteName}, the premier platform for creative professionals and clients.
                </p>
            </div>
            
            <div class="info-grid">
                <div class="info-card">
                    <span class="info-icon">🚀</span>
                    <div class="info-label">Get Started</div>
                    <div class="info-value">Complete your profile</div>
                    <p style="font-size: 14px; color: #718096; margin-top: 8px;">Add skills, portfolio, and bio</p>
                </div>
                
                <div class="info-card">
                    <span class="info-icon">💼</span>
                    <div class="info-label">Explore Work</div>
                    <div class="info-value">Browse projects</div>
                    <p style="font-size: 14px; color: #718096; margin-top: 8px;">Find exciting opportunities</p>
                </div>
            </div>
            
            <div class="btn-container">
                <a href="${process.env.SITE_URL || 'http://localhost:5173'}" class="btn">
                    🚀 Explore Platform
                </a>
            </div>
        </div>
        
        <div class="footer">
            <div class="copyright">
                <p>© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
            </div>
        </div>`;

      const emailTemplate = this.getEmailTemplate({
        title: `Welcome to ${siteName}`,
        headerColor: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
        content: content
      });

      const mailOptions = {
        from: `"${process.env.GMAIL_SENDER_NAME || siteName}" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: `🎬 Welcome to ${siteName}! Start Your Creative Journey`,
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