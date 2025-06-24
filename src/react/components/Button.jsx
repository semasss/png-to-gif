import styled, { css } from 'styled-components';

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: ${props => props.size === 'large' ? '18px 24px' : props.size === 'small' ? '8px 16px' : '12px 20px'};
  font-size: ${props => props.size === 'large' ? '18px' : props.size === 'small' ? '14px' : '16px'};
  font-weight: ${props => props.primary ? '600' : '500'};
  border-radius: 16px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  
  ${props => props.primary && css`
    background: linear-gradient(90deg, ${props.theme.colors.primary} 0%, ${props.theme.colors.primaryDark} 100%);
    color: #ffffff;
    
    &:hover:not(:disabled) {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
    }
  `}
  
  ${props => props.secondary && css`
    background: ${props.theme.colors.primaryLight};
    color: ${props.theme.colors.primary};
    border: 1px solid ${props.theme.colors.primary};
    
    &:hover:not(:disabled) {
      opacity: 0.8;
    }
  `}
  
  ${props => props.ghost && css`
    background: ${props.theme.colors.primaryLight};
    color: ${props.theme.colors.textSecondary};
    font-size: 13px;
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid ${props.theme.colors.border};
    
    &:hover:not(:disabled) {
      background: ${props.theme.colors.primaryLight};
      color: ${props.theme.colors.text};
      opacity: 0.8;
    }
  `}
  
  ${props => props.full && css`
    width: 100%;
    justify-content: space-between;
  `}
  
  &:disabled {
    background: ${props => props.theme.colors.border} !important;
    color: ${props => props.theme.colors.textSecondary} !important;
    cursor: not-allowed;
    transform: none;
    opacity: 0.5 !important;
  }
  
  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

export default Button;