// utils/domainNotifications.ts

export const checkExpiryDates = (domains: Domain[]) => {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    
    const expiringDomains = domains.filter(domain => {
      const domainExpiry = new Date(domain.date);
      const hostingExpiry = new Date(domain.hosting.date);
      
      return domainExpiry <= twoDaysFromNow || hostingExpiry <= twoDaysFromNow;
    });
  
    return expiringDomains;
  };
  
  export const sendWhatsAppNotification = async (domain: Domain, phoneNumber: string) => {
    const domainExpiry = new Date(domain.date);
    const hostingExpiry = new Date(domain.hosting.date);
    const now = new Date();
    
    const domainDaysLeft = Math.ceil((domainExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const hostingDaysLeft = Math.ceil((hostingExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let message = `🔔 *Domain Expiry Alert* 🔔\n\n`;
    message += `*Domain:* ${domain.name}\n`;
    
    if (domainDaysLeft <= 2) {
      message += `⚠️ Domain expires in ${domainDaysLeft} day(s) (${domainExpiry.toLocaleDateString()})\n`;
    }
    
    if (hostingDaysLeft <= 2) {
      message += `⚠️ Hosting (${domain.hosting.name}) expires in ${hostingDaysLeft} day(s) (${hostingExpiry.toLocaleDateString()})\n`;
    }
    
    message += `\nPlease renew as soon as possible to avoid service interruption.`;
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp link
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    // Open in new tab (or you could use an API for automated messages)
    window.open(whatsappUrl, '_blank');
  };
  
  export const checkAndNotifyExpiringDomains = (domains: Domain[], phoneNumber: string) => {
    const expiringDomains = checkExpiryDates(domains);
    
    expiringDomains.forEach(domain => {
      sendWhatsAppNotification(domain, phoneNumber);
    });
    
    return expiringDomains.length > 0;
  };