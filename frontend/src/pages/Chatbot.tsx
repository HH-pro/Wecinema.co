import React from "react";
import { Layout } from "../components";

const ChatbotIframe = () => {
  return (
    <Layout expand={false} hasHeader={true}>

    <div style={{ 
        width: "100%", 
        height: "100vh", 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        background: "#f4f4f4", // Light background
        padding: "20px",
        marginTop: "10px",

    }}>
      <iframe
        src="https://www.chatbase.co/chatbot-iframe/lsFgPCP0RGKmhRh996uRc"
        width="100%"
        style={{ 
          height: "100%", 
          minHeight: "600px", 
          maxWidth: "1200px", // Prevents it from getting too wide on large screens
          borderRadius: "10px", // Adds rounded corners
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)" // Adds a subtle shadow
        }}
        frameBorder="0"
      ></iframe>
    </div>
    </Layout>

  );
};

export default ChatbotIframe;
