import { createGlobalStyle } from 'styled-components';

// Load Comic Sans MS font
const ComicSansFont = `
  @font-face {
    font-family: 'Comic Sans MS Custom';
    src: url('./assets/ComicSansMS.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }
`;

export const lightTheme = {
  colors: {
    primary: '#007aff',
    primaryDark: '#0052cc',
    primaryLight: '#e6f0ff',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    error: '#f44336',
    success: '#4caf50',
    warning: '#ff9800',
    border: '#e1e1e1',
    borderRadius: '12px',
    shadow: '0 2px 4px rgba(0,0,0,0.04)'
  }
};

export const darkTheme = {
  colors: {
    primary: '#0a84ff',
    primaryDark: '#0051ff',
    primaryLight: 'rgba(0, 102, 255, 0.15)',
    background: '#1a1a1a',
    surface: '#2d2d2d',
    text: '#ffffff',
    textSecondary: '#b0b0b0',
    error: '#ff453a',
    success: '#30d158',
    warning: '#ff9f0a',
    border: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    shadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
  }
};

export const brightTheme = {
  colors: {
    primary: '#ff6b6b',
    primaryDark: '#ff5252', 
    primaryLight: 'rgba(255, 107, 107, 0.2)',
    background: 'linear-gradient(-45deg, #ff6b6b, #ff8e53, #ff9f43, #10ac84, #0abde3, #5f27cd, #a55eea)',
    backgroundSize: '400% 400%',
    backgroundAnimation: 'rainbowGradient 3s ease infinite',
    surface: 'rgba(255, 255, 255, 0.9)',
    text: '#2d2d2d',
    textSecondary: '#555555',
    error: '#ff453a',
    success: '#30d158',
    warning: '#ff9f0a',
    border: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    shadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    fontFamily: '"Comic Sans MS Custom", "Comic Sans MS", cursive, sans-serif',
    // Добавляем мигающие эффекты
    brightAnimation: 'brightPulse 2s ease-in-out infinite',
    rainbowAnimation: 'rainbowGradient 3s ease infinite'
  }
};

export const GlobalStyle = createGlobalStyle`
  ${ComicSansFont}
  
  @keyframes rainbowGradient {
    0% { background-position: 0% 50%; }
    25% { background-position: 100% 50%; }
    50% { background-position: 200% 50%; }
    75% { background-position: 300% 50%; }
    100% { background-position: 400% 50%; }
  }
  
  @keyframes brightPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: ${props => props.theme.colors.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif'};
  }

  body {
    background: ${props => props.theme.colors.background};
    ${props => props.theme.colors.backgroundSize ? `background-size: ${props.theme.colors.backgroundSize};` : ''}
    ${props => props.theme.colors.backgroundAnimation ? `animation: ${props.theme.colors.backgroundAnimation};` : ''}
    color: ${props => props.theme.colors.text};
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 40px 20px;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  #root {
    width: 100%;
    max-width: 900px;
    display: flex;
    justify-content: center;
  }

  /* Scrollbar styles */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.primaryLight};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.primary};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.primaryDark};
  }
`;