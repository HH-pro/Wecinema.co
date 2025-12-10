// utils/emailService.js
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    console.log('📧 Initializing Email Service...');
    console.log('GMAIL_USER:', process.env.GMAIL_USER ? 'Set' : 'Not Set');
    console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Not Set');
    
    // Configure transporter with debugging
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection configuration
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      console.log('🔍 Verifying email connection...');
      await this.transporter.verify();
      console.log('✅ Email server is ready to take messages');
    } catch (error) {
      console.error('❌ Email connection failed:', error.message);
      console.log('⚠️ Please check GMAIL_USER and GMAIL_APP_PASSWORD in .env file');
      console.log('⚠️ Make sure 2-Step Verification is enabled and App Password is generated');
    }
  }

  async sendOrderConfirmationToSeller(order, buyer, seller, chatLink) {
    try {
      console.log(`📧 Preparing seller email to: ${seller.email}`);
      
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error('Email credentials not configured in environment variables');
      }

      const formattedDate = new Date(order.orderDate).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎉 New Order Received - ${process.env.SITE_NAME || 'Marketplace'}</title>
    <style>
        /* CSS styles same as before */
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .content { padding: 30px; }
        .order-card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #4CAF50; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
        .info-item { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e0e0e0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; margin: 10px 0; }
        .footer { background-color: #f1f1f1; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .highlight { color: #4CAF50; font-weight: bold; }
        .badge { display: inline-block; background: #4CAF50; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 10px; }
        .section-title { color: #444; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-top: 30px; font-size: 18px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">${process.env.SITE_NAME || 'Marketplace'}</div>
            <h1>🎉 Congratulations! You Have a New Order</h1>
            <p>Order #${order._id.toString().slice(-8).toUpperCase()}</p>
        </div>
        
        <div class="content">
            <div class="order-card">
                <h2 style="margin-top: 0; color: #2c3e50;">$${order.amount} Order Received</h2>
                <p>You've received a new order from <span class="highlight">${buyer.username}</span>.</p>
            </div>

            <!-- Rest of the HTML template -->
            <div class="section-title">📋 Order Details</div>
            <div class="info-grid">
                <div class="info-item">
                    <strong>Order ID:</strong><br>
                    ${order._id.toString().slice(-8).toUpperCase()}
                </div>
                <div class="info-item">
                    <strong>Order Amount:</strong><br>
                    <span class="highlight">$${order.amount}</span>
                </div>
                <div class="info-item">
                    <strong>Buyer:</strong><br>
                    ${buyer.username}
                </div>
                <div class="info-item">
                    <strong>Order Date:</strong><br>
                    ${formattedDate}
                </div>
            </div>

            ${order.requirements ? `
            <div class="section-title">📝 Order Requirements</div>
            <div style="background: #fffde7; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 15px 0;">
                ${order.requirements}
            </div>
            ` : ''}

            <div class="section-title">🚀 Next Steps</div>
            <ol style="padding-left: 20px; margin: 20px 0;">
                <li><strong>Contact the buyer</strong> to confirm all requirements</li>
                <li><strong>Start working</strong> on the order as per agreed timeline</li>
                <li><strong>Deliver</strong> the completed work through the platform</li>
                <li><strong>Get paid</strong> once buyer approves delivery</li>
            </ol>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${chatLink}" class="btn">💬 Open Chat with Buyer</a><br>
                <small style="color: #666; margin-top: 10px; display: block;">Secure payment of $${order.amount} is held in escrow</small>
            </div>

            <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2196F3;">
                <strong>💰 Payment Status:</strong> Secured in escrow<br>
                <strong>🔒 Funds will be released:</strong> When order is completed and approved by buyer
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.SITE_URL || 'http://localhost:5173'}/seller/dashboard" class="btn" style="background: linear-gradient(135deg, #2196F3 0%, #21CBF3 100%);">📊 Go to Dashboard</a>
            </div>
        </div>

        <div class="footer">
            <p>This is an automated message from ${process.env.SITE_NAME || 'Marketplace'}. Please do not reply to this email.</p>
            <p>Need help? <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@example.com'}" style="color: #667eea;">Contact Support</a></p>
            <p>© ${new Date().getFullYear()} ${process.env.SITE_NAME || 'Marketplace'}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

      const mailOptions = {
        from: `"${process.env.GMAIL_SENDER_NAME || 'Marketplace'}" <${process.env.GMAIL_USER}>`,
        to: seller.email,
        subject: `🎉 New Order Received - ${order._id.toString().slice(-8).toUpperCase()} - $${order.amount}`,
        html: emailTemplate,
        text: `New Order Received!\n\nOrder ID: ${order._id}\nAmount: $${order.amount}\nBuyer: ${buyer.username}\n\nChat Link: ${chatLink}\n\nThank you for using ${process.env.SITE_NAME || 'Marketplace'}!`
      };

      console.log('📤 Sending seller email...');
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Seller email sent successfully:', info.messageId);
      return info;

    } catch (error) {
      console.error('❌ Seller email error:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  async sendOrderConfirmationToBuyer(order, buyer, seller, chatLink) {
    try {
      console.log(`📧 Preparing buyer email to: ${buyer.email}`);
      
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error('Email credentials not configured in environment variables');
      }

      const formattedDate = new Date(order.orderDate).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>✅ Order Confirmed - ${process.env.SITE_NAME || 'Marketplace'}</title>
    <style>
        /* CSS styles same as seller email but with green theme */
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); color: white; padding: 30px 20px; text-align: center; }
        .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .content { padding: 30px; }
        .order-card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #4CAF50; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
        .info-item { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e0e0e0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; margin: 10px 0; }
        .footer { background-color: #f1f1f1; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .highlight { color: #4CAF50; font-weight: bold; }
        .section-title { color: #444; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-top: 30px; font-size: 18px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">${process.env.SITE_NAME || 'Marketplace'}</div>
            <h1>✅ Your Order Has Been Confirmed!</h1>
            <p>Order #${order._id.toString().slice(-8).toUpperCase()}</p>
        </div>
        
        <div class="content">
            <div class="order-card">
                <h2 style="margin-top: 0; color: #2c3e50;">$${order.amount} Order Confirmed</h2>
                <p>Your order with <span class="highlight">${seller.username}</span> has been confirmed.</p>
            </div>

            <!-- Rest of buyer template -->
            <div class="section-title">📋 Order Details</div>
            <div class="info-grid">
                <div class="info-item">
                    <strong>Order ID:</strong><br>
                    ${order._id.toString().slice(-8).toUpperCase()}
                </div>
                <div class="info-item">
                    <strong>Order Amount:</strong><br>
                    <span class="highlight">$${order.amount}</span>
                </div>
                <div class="info-item">
                    <strong>Seller:</strong><br>
                    ${seller.username}
                </div>
                <div class="info-item">
                    <strong>Order Date:</strong><br>
                    ${formattedDate}
                </div>
            </div>

            ${order.requirements ? `
            <div class="section-title">📝 Your Requirements</div>
            <div style="background: #fffde7; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 15px 0;">
                ${order.requirements}
            </div>
            ` : ''}

            <div class="section-title">🚀 What Happens Next?</div>
            <ol style="padding-left: 20px; margin: 20px 0;">
                <li><strong>Seller will contact you</strong> to confirm requirements</li>
                <li><strong>Seller will start working</strong> on your order</li>
                <li><strong>You'll receive updates</strong> through the chat</li>
                <li><strong>Review the delivery</strong> and approve when satisfied</li>
                <li><strong>Payment will be released</strong> to the seller</li>
            </ol>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${chatLink}" class="btn">💬 Open Chat with Seller</a><br>
                <small style="color: #666; margin-top: 10px; display: block;">Track order progress and communicate directly</small>
            </div>

            <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2196F3;">
                <strong>💰 Payment Status:</strong> Secured in escrow<br>
                <strong>🔒 Funds protected:</strong> Your payment is safe until you approve the delivery<br>
                <strong>⏱️ Estimated delivery:</strong> Check with seller for timeline
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.SITE_URL || 'http://localhost:5173'}/orders/${order._id}" class="btn" style="background: linear-gradient(135deg, #2196F3 0%, #21CBF3 100%);">📦 View Order Details</a>
                <a href="${process.env.SITE_URL || 'http://localhost:5173'}/my-orders" class="btn" style="background: linear-gradient(135deg, #FF9800 0%, #FF5722 100%); margin-left: 10px;">📋 My Orders</a>
            </div>
        </div>

        <div class="footer">
            <p>This is an automated message from ${process.env.SITE_NAME || 'Marketplace'}. Please do not reply to this email.</p>
            <p>Need help? <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@example.com'}" style="color: #4CAF50;">Contact Support</a></p>
            <p>© ${new Date().getFullYear()} ${process.env.SITE_NAME || 'Marketplace'}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

      const mailOptions = {
        from: `"${process.env.GMAIL_SENDER_NAME || 'Marketplace'}" <${process.env.GMAIL_USER}>`,
        to: buyer.email,
        subject: `✅ Order Confirmed - ${order._id.toString().slice(-8).toUpperCase()} - $${order.amount}`,
        html: emailTemplate,
        text: `Order Confirmed!\n\nOrder ID: ${order._id}\nAmount: $${order.amount}\nSeller: ${seller.username}\n\nChat Link: ${chatLink}\n\nThank you for using ${process.env.SITE_NAME || 'Marketplace'}!`
      };

      console.log('📤 Sending buyer email...');
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Buyer email sent successfully:', info.messageId);
      return info;

    } catch (error) {
      console.error('❌ Buyer email error:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();