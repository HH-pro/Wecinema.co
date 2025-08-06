import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  IconButton,
  useMediaQuery,
  styled,
  keyframes
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import PaymentIcon from "@mui/icons-material/Payment";
import SettingsIcon from "@mui/icons-material/Settings";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import DescriptionIcon from "@mui/icons-material/Description";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { logout } from "../../utilities/helperfFunction";
import logo from "../../assets/wecinema.png";
import NotificationImportantIcon from "@mui/icons-material/NotificationImportant";

// Keyframe animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(124, 58, 237, 0); }
  100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
`;

// Styled components
const AnimatedListItemButton = styled(ListItemButton)(({ theme }) => ({
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateX(5px)',
    '& .MuiListItemIcon-root': {
      transform: 'scale(1.1)'
    }
  },
  '&.active': {
    background: `linear-gradient(90deg, var(--primary-purple) 0%, rgba(124, 58, 237, 0.3) 100%)`,
    borderLeft: '3px solid var(--pure-white)',
    '& .MuiListItemIcon-root': {
      color: 'var(--pure-white)'
    }
  }
}));

const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/admin/dashboard" },
  { text: "Users", icon: <PeopleIcon />, path: "/admin/users" },
  { text: "Videos", icon: <VideoLibraryIcon />, path: "/admin/videos" },
  { text: "Script", icon: <DescriptionIcon />, path: "/admin/script" },
  { text: "Transactions", icon: <PaymentIcon />, path: "/admin/transactions" },
  { text: "Domain and hosting", icon: <NotificationImportantIcon />, path: "/admin/domain" },
  { text: "Settings", icon: <SettingsIcon />, path: "/admin/settings" },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const isSmallScreen = useMediaQuery("(max-width: 600px)");
  const [isDrawerOpen, setIsDrawerOpen] = useState(!isSmallScreen);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleDrawerToggle = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const drawerWidth = isCollapsed ? 80 : 260;

  return (
    <>
      {isSmallScreen && (
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            position: "fixed",
            top: 10,
            left: 10,
            zIndex: 1200,
            backgroundColor: "var(--primary-purple)",
            color: "var(--pure-white)",
            animation: `${pulse} 2s infinite`,
            "&:hover": {
              backgroundColor: "rgba(124, 58, 237, 0.8)",
              animation: 'none'
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      <Drawer
        variant={isSmallScreen ? "temporary" : "permanent"}
        open={isSmallScreen ? isDrawerOpen : true}
        onClose={handleDrawerToggle}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            backgroundColor: "var(--dark-bg)",
            color: "var(--pure-white)",
            paddingTop: "10px",
            borderRight: "none",
            transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            overflowX: "hidden",
            boxShadow: "2px 0 20px rgba(0, 0, 0, 0.5)",
            backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.9))',
            backdropFilter: 'blur(5px)',
            '&:hover': {
              boxShadow: "2px 0 20px rgba(124, 58, 237, 0.3)"
            }
          },
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo Section */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
            padding: "20px 10px",
            marginLeft: "10px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            animation: `${fadeIn} 0.3s ease-out`
          }}
        >
          {!isCollapsed && (
            <img
              src={logo}
              alt="Logo"
              style={{ 
                width: "20%", 
                height: "auto", 
                filter: "brightness(0) invert(1)",
                transition: 'opacity 0.3s ease',
                opacity: isHovered ? 1 : 0.9
              }}
            />
          )}

          <IconButton
            onClick={toggleCollapse}
            sx={{
              color: "var(--pure-white)",
              transition: 'transform 0.3s ease, background-color 0.2s ease',
              "&:hover": {
                backgroundColor: "var(--input-bg)",
                transform: 'rotate(180deg)'
              },
            }}
          >
            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Box>

        <List sx={{ padding: '0 8px' }}>
          {menuItems.map((item, index) => (
            <ListItem 
              key={item.text} 
              disablePadding
              sx={{
                animation: `${fadeIn} ${0.1 * index}s ease-out`,
                my: 0.5
              }}
            >
              <AnimatedListItemButton
                component={Link}
                to={item.path}
                className={location.pathname === item.path ? 'active' : ''}
                sx={{
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  py: 1.5,
                  px: 2,
                  borderRadius: '8px',
                  color: location.pathname === item.path 
                    ? 'var(--pure-white)' 
                    : 'rgba(255, 255, 255, 0.7)',
                }}
              >
                <ListItemIcon
                  sx={{
                    color: 'inherit',
                    minWidth: 'auto',
                    mr: isCollapsed ? 0 : 2,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!isCollapsed && (
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: location.pathname === item.path ? 600 : 400,
                      fontSize: '0.875rem',
                      transition: 'all 0.2s ease'
                    }}
                  />
                )}
              </AnimatedListItemButton>
            </ListItem>
          ))}

          <Divider sx={{ 
            backgroundColor: "var(--input-bg)", 
            my: 2,
            opacity: isHovered ? 1 : 0.7,
            transition: 'opacity 0.3s ease'
          }} />

          <ListItem disablePadding>
            <AnimatedListItemButton
              onClick={logout}
              sx={{
                justifyContent: isCollapsed ? "center" : "flex-start",
                py: 1.5,
                px: 2,
                borderRadius: '8px',
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  color: 'var(--pure-white)',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)'
                }
              }}
            >
              <ListItemIcon sx={{ 
                color: 'inherit', 
                minWidth: 'auto',
                mr: isCollapsed ? 0 : 2
              }}>
                <ExitToAppIcon />
              </ListItemIcon>
              {!isCollapsed && (
                <ListItemText 
                  primary="Logout" 
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                />
              )}
            </AnimatedListItemButton>
          </ListItem>
        </List>
      </Drawer>
    </>
  );
};

export default Sidebar;