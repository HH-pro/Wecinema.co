import React, { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { Box } from "@mui/material";

interface LayoutProps {
  children: ReactNode; // Define the children prop
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box display="flex">
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: "#1a1a2e" }}>
        {children} {/* Render the children */}
      </Box>
    </Box>
  );
};

export default Layout;
