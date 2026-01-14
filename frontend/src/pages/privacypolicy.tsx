// src/pages/PrivacyPolicy.js
import styled from 'styled-components';
import { Layout } from '../components';

const currentDate = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem 1rem;
`;

const PrivacyWrapper = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea, #764ba2);
  }
`;

const Header = styled.header`
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 3rem 2rem;
  text-align: center;
  border-bottom: 1px solid #dee2e6;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 1rem;
  background: linear-gradient(90deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const MetaInfo = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  color: #718096;
  font-size: 0.95rem;
`;

const MetaItem = styled.p`
  background: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const Content = styled.div`
  padding: 2rem;
  line-height: 1.8;
  color: #4a5568;
`;

const Section = styled.section`
  margin: 3rem 0;
  padding: 1.5rem;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #667eea;
    box-shadow: 0 5px 20px rgba(102, 126, 234, 0.1);
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
  display: flex;
  align-items: center;
  
  &::before {
    content: '🔒';
    margin-right: 0.75rem;
    font-size: 1.5rem;
  }
`;

const Paragraph = styled.p`
  margin: 1rem 0;
  font-size: 1.1rem;
  color: #4a5568;
`;

const List = styled.ul`
  margin: 1.5rem 0;
  padding-left: 1.5rem;
  list-style: none;
`;

const ListItem = styled.li`
  margin: 0.75rem 0;
  padding-left: 1.5rem;
  position: relative;
  
  &::before {
    content: '→';
    position: absolute;
    left: 0;
    color: #667eea;
    font-weight: bold;
  }
`;

const SubListItem = styled.li`
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  
  &::before {
    content: '•';
    position: absolute;
    left: 0.5rem;
    color: #718096;
  }
`;

const Highlight = styled.span`
  background: linear-gradient(120deg, #667eea15 0%, #764ba215 100%);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  color: #667eea;
`;

const WarningBox = styled.div`
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1.5rem 0;
`;

const InfoBox = styled.div`
  background: #d1ecf1;
  border-left: 4px solid #0dcaf0;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1.5rem 0;
  color: #055160;
`;

const DataTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin: 1.5rem 0;
`;

const DataCard = styled.div`
  background: ${props => props.highlight ? 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)' : '#f8f9fa'};
  border: 2px solid ${props => props.highlight ? '#667eea' : '#e2e8f0'};
  border-radius: 12px;
  padding: 1.5rem;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const DataTitle = styled.h4`
  color: ${props => props.highlight ? '#667eea' : '#2d3748'};
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
`;

const RightsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
`;

const RightCard = styled.div`
  background: #e8f4f8;
  border-radius: 8px;
  padding: 1.25rem;
  text-align: center;
  border: 1px solid #b6e0f0;
`;

const RightIcon = styled.span`
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.5rem;
`;

const ContactSection = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2.5rem;
  border-radius: 16px;
  text-align: center;
  margin: 3rem 0;
`;

const ContactTitle = styled.h3`
  font-size: 1.75rem;
  margin-bottom: 1rem;
`;

const UpdateSection = styled.div`
  background: #f8f9fa;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  margin-top: 3rem;
  border: 2px dashed #dee2e6;
`;

const UpdateInfo = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const UpdateItem = styled.div`
  background: white;
  padding: 1rem;
  border-radius: 8px;
  min-width: 150px;
`;

const PrivacyPolicy = () => {
  return (
    <Layout expand={false} hasHeader={true}>
      <Container>
        <PrivacyWrapper>
          <Header>
            <Title>Privacy Policy</Title>
            <MetaInfo>
              <MetaItem>Effective: {currentDate}</MetaItem>
              <MetaItem>WeCinema Video Platform</MetaItem>
            </MetaInfo>
          </Header>
          
          <Content>
            <WarningBox>
              <Paragraph><strong>IMPORTANT:</strong> This Privacy Policy explains how WeCinema collects, uses, and protects your personal information when you use our video platform, marketplace, and communication features.</Paragraph>
            </WarningBox>
            
            <Section id="overview">
              <SectionTitle>1. Overview & Scope</SectionTitle>
              <Paragraph>
                Welcome to WeCinema! Your privacy is critically important to us. This Privacy Policy applies to all users of WeCinema.co platform, including Content Creators, Buyers, and Sellers. By using our services, you agree to the collection and use of information in accordance with this policy.
              </Paragraph>
            </Section>
            
            <Section id="information-collected">
              <SectionTitle>2. Information We Collect</SectionTitle>
              <Paragraph>We collect several types of information to provide and improve our services:</Paragraph>
              
              <DataTypeGrid>
                <DataCard>
                  <DataTitle>Account Information</DataTitle>
                  <Paragraph>When you register, we collect your name, email, password, and profile information.</Paragraph>
                </DataCard>
                
                <DataCard highlight>
                  <DataTitle highlight>Payment Information</DataTitle>
                  <Paragraph>Through Stripe integration, we process payment details for marketplace transactions and revenue sharing.</Paragraph>
                </DataCard>
                
                <DataCard>
                  <DataTitle>Content Information</DataTitle>
                  <Paragraph>Metadata and details about videos you upload, including titles, descriptions, and usage rights.</Paragraph>
                </DataCard>
                
                <DataCard>
                  <DataTitle>Usage Data</DataTitle>
                  <Paragraph>How you interact with our platform, including pages visited, videos watched, and marketplace activities.</Paragraph>
                </DataCard>
              </DataTypeGrid>
              
              <SubSection>
                <h3>2.1 Automatic Data Collection</h3>
                <Paragraph>We automatically collect certain information through:</Paragraph>
                <List>
                  <ListItem><Highlight>Cookies:</Highlight> Small data files stored on your device to enhance user experience</ListItem>
                  <ListItem><Highlight>Log Files:</Highlight> Track actions occurring on the Site and collect data including your IP address, browser type, and timestamps</ListItem>
                  <ListItem><Highlight>Web Beacons:</Highlight> Electronic files used to record information about how you browse the Site</ListItem>
                  <ListItem><Highlight>Analytics Tools:</Highlight> Google Analytics and similar tools to understand user behavior</ListItem>
                </List>
              </SubSection>
              
              <SubSection>
                <h3>2.2 Marketplace Transaction Data</h3>
                <Paragraph>For marketplace activities, we collect:</Paragraph>
                <List>
                  <ListItem>Order details and transaction history</ListItem>
                  <ListItem>Chat communications between buyers and sellers</ListItem>
                  <ListItem>Dispute resolution records</ListItem>
                  <ListItem>Revenue sharing calculations and payment records</ListItem>
                </List>
              </SubSection>
            </Section>
            
            <Section id="information-use">
              <SectionTitle>3. How We Use Your Information</SectionTitle>
              <Paragraph>We use the collected information for various purposes:</Paragraph>
              
              <List>
                <ListItem>
                  <strong>Service Provision:</strong> To operate and maintain our video platform, marketplace, and communication systems
                  <List>
                    <SubListItem>Hosting and streaming your video content</SubListItem>
                    <SubListItem>Processing marketplace transactions</SubListItem>
                    <SubListItem>Facilitating buyer-seller communications</SubListItem>
                  </List>
                </ListItem>
                
                <ListItem>
                  <strong>Business Operations:</strong> For platform management and improvement
                  <List>
                    <SubListItem>Calculating revenue shares and processing payments</SubListItem>
                    <SubListItem>Monitoring for fraudulent activity</SubListItem>
                    <SubListItem>Resolving disputes between users</SubListItem>
                  </List>
                </ListItem>
                
                <ListItem>
                  <strong>Personalization:</strong> To enhance your experience
                  <List>
                    <SubListItem>Recommending relevant videos based on viewing history</SubListItem>
                    <SubListItem>Suggesting marketplace listings</SubListItem>
                    <SubListItem>Customizing your dashboard and notifications</SubListItem>
                  </List>
                </ListItem>
                
                <ListItem>
                  <strong>Communication:</strong> To contact you about platform updates
                  <List>
                    <SubListItem>Order status and transaction notifications</SubListItem>
                    <SubListItem>Revenue payment confirmations</SubListItem>
                    <SubListItem>Platform announcements and policy updates</SubListItem>
                  </List>
                </ListItem>
              </List>
            </Section>
            
            <Section id="information-sharing">
              <SectionTitle>4. Information Sharing & Disclosure</SectionTitle>
              <Paragraph>We do not sell your personal information. We may share information in these circumstances:</Paragraph>
              
              <List>
                <ListItem>
                  <strong>Service Providers:</strong> With third-party vendors who assist in platform operations
                  <List>
                    <SubListItem>Stripe for payment processing</SubListItem>
                    <SubListItem>AWS for video hosting and storage</SubListItem>
                    <SubListItem>Email service providers for communications</SubListItem>
                  </List>
                </ListItem>
                
                <ListItem>
                  <strong>Legal Requirements:</strong> When required by law or to protect rights
                  <List>
                    <SubListItem>To comply with legal obligations</SubListItem>
                    <SubListItem>To protect against legal liability</SubListItem>
                    <SubListItem>To prevent or investigate possible wrongdoing</SubListItem>
                  </List>
                </ListItem>
                
                <ListItem>
                  <strong>Business Transfers:</strong> In connection with merger, acquisition, or sale of assets
                </ListItem>
                
                <ListItem>
                  <strong>With Your Consent:</strong> When you explicitly authorize specific sharing
                </ListItem>
              </List>
              
              <InfoBox>
                <Paragraph><strong>Note:</strong> Your marketplace transaction details (excluding payment information) may be visible to other users as part of the marketplace functionality.</Paragraph>
              </InfoBox>
            </Section>
            
            <Section id="data-security">
              <SectionTitle>5. Data Security & Protection</SectionTitle>
              <Paragraph>We implement appropriate security measures to protect your personal information:</Paragraph>
              
              <List>
                <ListItem>Encryption of sensitive data during transmission (SSL/TLS)</ListItem>
                <ListItem>Secure storage of passwords using hashing algorithms</ListItem>
                <ListItem>Regular security audits and vulnerability assessments</ListItem>
                <ListItem>Access controls and authentication mechanisms</ListItem>
                <ListItem>Secure payment processing through PCI-compliant partners</ListItem>
              </List>
              
              <Paragraph>
                While we strive to use commercially acceptable means to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
              </Paragraph>
            </Section>
            
            <Section id="user-rights">
              <SectionTitle>6. Your Rights & Choices</SectionTitle>
              <Paragraph>Depending on your location, you may have certain rights regarding your personal information:</Paragraph>
              
              <RightsGrid>
                <RightCard>
                  <RightIcon>👁️</RightIcon>
                  <h4>Access</h4>
                  <Paragraph>Right to access your personal data</Paragraph>
                </RightCard>
                
                <RightCard>
                  <RightIcon>✏️</RightIcon>
                  <h4>Correction</h4>
                  <Paragraph>Right to correct inaccurate data</Paragraph>
                </RightCard>
                
                <RightCard>
                  <RightIcon>🗑️</RightIcon>
                  <h4>Deletion</h4>
                  <Paragraph>Right to request data deletion</Paragraph>
                </RightCard>
                
                <RightCard>
                  <RightIcon>⛔</RightIcon>
                  <h4>Opt-Out</h4>
                  <Paragraph>Right to opt-out of marketing</Paragraph>
                </RightCard>
              </RightsGrid>
              
              <Paragraph>
                To exercise these rights, contact us at privacy@wecinema.co. We may need to verify your identity before processing your request.
              </Paragraph>
            </Section>
            
            <Section id="cookies">
              <SectionTitle>7. Cookies & Tracking Technologies</SectionTitle>
              <Paragraph>We use cookies and similar tracking technologies:</Paragraph>
              
              <List>
                <ListItem>
                  <strong>Essential Cookies:</strong> Required for platform functionality (login, transactions)
                </ListItem>
                <ListItem>
                  <strong>Performance Cookies:</strong> Help understand how users interact with our platform
                </ListItem>
                <ListItem>
                  <strong>Functionality Cookies:</strong> Remember your preferences and settings
                </ListItem>
                <ListItem>
                  <strong>Advertising Cookies:</strong> Used to deliver relevant advertisements
                </ListItem>
              </List>
              
              <Paragraph>
                You can control cookies through your browser settings. However, disabling essential cookies may affect platform functionality.
              </Paragraph>
            </Section>
            
            <Section id="international">
              <SectionTitle>8. International Data Transfers</SectionTitle>
              <Paragraph>
                Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those of your jurisdiction.
              </Paragraph>
              <Paragraph>
                By using WeCinema, you consent to the transfer of your information to countries, including the United States, where we operate.
              </Paragraph>
            </Section>
            
            <Section id="children">
              <SectionTitle>9. Children's Privacy</SectionTitle>
              <Paragraph>
                WeCinema is not intended for users under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
              </Paragraph>
            </Section>
            
            <ContactSection>
              <ContactTitle>Contact Us</ContactTitle>
              <Paragraph>If you have questions about this Privacy Policy or your personal information:</Paragraph>
              <Paragraph>
                <strong>Email:</strong> privacy@wecinema.co<br />
                <strong>Support:</strong> support@wecinema.co<br />
                <strong>Business Hours:</strong> Mon-Fri, 9 AM - 6 PM [Your Timezone]
              </Paragraph>
            </ContactSection>
            
            <UpdateSection>
              <SectionTitle>Updates to This Policy</SectionTitle>
              <Paragraph>
                We may update this Privacy Policy periodically to reflect changes in our practices or for other operational, legal, or regulatory reasons.
              </Paragraph>
              
              <UpdateInfo>
                <UpdateItem>
                  <strong>Last Updated</strong><br />
                  {currentDate}
                </UpdateItem>
                <UpdateItem>
                  <strong>Version</strong><br />
                  2.0
                </UpdateItem>
                <UpdateItem>
                  <strong>Next Review</strong><br />
                  {new Date(new Date().setMonth(new Date().getMonth() + 6)).toLocaleDateString('en-US', { 
                    month: 'long',
                    year: 'numeric'
                  })}
                </UpdateItem>
              </UpdateInfo>
            </UpdateSection>
          </Content>
        </PrivacyWrapper>
      </Container>
    </Layout>
  );
};

// Helper component for sub-sections
const SubSection = styled.div`
  margin: 1.5rem 0;
  padding-left: 1rem;
  border-left: 3px solid #e2e8f0;
  
  h3 {
    font-size: 1.25rem;
    color: #4a5568;
    margin-bottom: 1rem;
  }
`;

export default PrivacyPolicy;