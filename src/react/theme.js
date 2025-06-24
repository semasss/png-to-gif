import { createGlobalStyle } from 'styled-components';

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

export const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  body {
    background: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
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