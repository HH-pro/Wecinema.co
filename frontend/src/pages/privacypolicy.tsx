import styled from 'styled-components';
import { Layout } from '../components';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  line-height: 1.6;
  font-family: Arial, sans-serif;
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 20px;
  font-size: 2.5em;

`;

const SectionTitle = styled.h2`
  margin-top: 30px;
  font-size: 1.5em;
`;

const Paragraph = styled.p`
  margin: 10px 0;
`;

const List = styled.ul`
  margin: 10px 0 20px 20px;
`;

const ListItem = styled.li`
  margin-bottom: 10px;
`;

const PrivacyPolicy = () => {
  return (
    <Layout expand={false} hasHeader={false}>
      <Container>
        <Title>Privacy Policy</Title>
        
        <Paragraph>
          Welcome to WeCinema! Your privacy is critically important to us. This privacy policy explains how we collect, use, and share your personal information when you use our website.
        </Paragraph>
        
        <SectionTitle>1. Information We Collect</SectionTitle>
        <Paragraph>We collect information to provide better services to our users. The types of information we collect include:</Paragraph>
        <List>
          <ListItem><strong>Personal Information:</strong> When you sign up for WeCinema, we collect personal information such as your name, email address, and payment details.</ListItem>
          <ListItem><strong>Usage Data:</strong> We collect information about how you use our website, such as the pages you visit and the actions you take.</ListItem>
          <ListItem><strong>Cookies and Tracking Technologies:</strong> We use cookies and other tracking technologies to enhance your experience on our website.</ListItem>
        </List>
        
        <SectionTitle>2. How We Use Your Information</SectionTitle>
        <Paragraph>We use the information we collect for various purposes, including:</Paragraph>
        <List>
          <ListItem>Providing and improving our services</ListItem>
          <ListItem>Personalizing your experience on our website</ListItem>
          <ListItem>Processing transactions and sending you related information</ListItem>
          <ListItem>Communicating with you, including sending you updates and promotional materials</ListItem>
          <ListItem>Monitoring and analyzing trends, usage, and activities</ListItem>
        </List>
        
        <SectionTitle>3. How We Share Your Information</SectionTitle>
        <Paragraph>We do not share your personal information with third parties except in the following circumstances:</Paragraph>
        <List>
          <ListItem><strong>With Your Consent:</strong> We may share your information when you have given us explicit consent to do so.</ListItem>
          <ListItem><strong>For Legal Reasons:</strong> We may share your information if required by law or to protect our rights and property.</ListItem>
          <ListItem><strong>With Service Providers:</strong> We may share your information with third-party service providers who help us operate our website.</ListItem>
        </List>
        
        <SectionTitle>4. Security</SectionTitle>
        
        <SectionTitle>5. Your Rights</SectionTitle>
        <Paragraph>You have certain rights regarding your personal information, including the right to access, correct, or delete your data. To exercise these rights, please contact us at support@wecinema.co.</Paragraph>
        
        <SectionTitle>6. Changes to This Privacy Policy</SectionTitle>
        <Paragraph>We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on our website.</Paragraph>
        
        <SectionTitle>7. Contact Us</SectionTitle>
        <Paragraph>If you have any questions about this privacy policy, please contact us at:</Paragraph>
        <Paragraph>Email: support@wecinema.co</Paragraph>
        <Paragraph>Address: [Your Company Address]</Paragraph>
        
      </Container>
    </Layout>
  );
};

export default PrivacyPolicy;
