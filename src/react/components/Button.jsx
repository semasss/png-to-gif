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
    background: linear-gradient(90deg, #007aff 0%, #0051ff 100%);
    color: #ffffff;
    
    &:hover:not(:disabled) {
      background: linear-gradient(90deg, #0066d9 0%, #0044d9 100%);
      transform: translateY(-1px);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
    }
  `}
  
  ${props => props.secondary && css`
    background: #dfeeff;
    color: #007aff;
    
    &:hover:not(:disabled) {
      background: #c9dcff;
    }
  `}
  
  ${props => props.ghost && css`
    background: #eef2f6;
    color: #6e6e73;
    font-size: 13px;
    padding: 4px 12px;
    border-radius: 999px;
    
    &:hover:not(:disabled) {
      background: #e1e3e8;
    }
  `}
  
  ${props => props.full && css`
    width: 100%;
    justify-content: space-between;
  `}
  
  &:disabled {
    background: #d1d1d6;
    color: #999;
    cursor: not-allowed;
    transform: none;
  }
  
  &:focus {
    outline: 2px solid #007aff;
    outline-offset: 2px;
  }
`;

export default Button;