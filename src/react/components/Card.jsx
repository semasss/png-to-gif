import React from 'react';
import styled, { css } from 'styled-components';
// import { Warning, Check, Error, Folder } from './Icons'; // Убрали иконки

const CardContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  padding: 16px;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.colors.shadow};
  }
  
  ${props => props.warning && css`
    background-color: ${props.theme.colors.warning}20;
    border-color: ${props.theme.colors.warning};
  `}
  
  ${props => props.error && css`
    background-color: ${props.theme.colors.error}20;
    border-color: ${props.theme.colors.error};
  `}
`;

const Preview = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 8px;
  flex-shrink: 0;
  overflow: hidden;
  background: ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 4px;
`;

const Name = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${props => 
    props.warning ? props.theme.colors.warning : 
    props.error ? props.theme.colors.error : 
    props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.3s ease;
`;

const Meta = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  transition: color 0.3s ease;
`;

const WarningMessage = styled.div`
  background-color: ${props => props.theme.colors.warning}30;
  color: ${props => props.theme.colors.warning};
  padding: 8px 12px;
  border-radius: 8px;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid ${props => props.theme.colors.warning}50;
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.error};
  font-weight: 500;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.3s ease;
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ActionButton = styled.button`
  background: transparent;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.7;
  
  &:hover {
    background: ${props => props.theme.colors.primaryLight};
    color: ${props => props.theme.colors.primary};
    opacity: 1;
    border-color: ${props => props.theme.colors.primary};
  }
`;

function Card({ 
  name, 
  size, 
  dimensions, 
  quality, 
  path, 
  warning, 
  error,
  frameCount,
  frameDelay,
  onShowInFolder 
}) {
  const formatSize = (bytes) => {
    return `${(bytes / 1024).toFixed(1)} КБ`;
  };

  const getDuration = () => {
    if (!frameCount || !frameDelay) return null;
    return (frameCount * frameDelay).toFixed(1);
  };

  const getColorCount = () => {
    if (!quality) return null;
    const match = quality.match(/colors=(\d+)/);
    return match ? match[1] : null;
  };

  const getStatusIcon = () => {
    if (error) return '❌';
    if (warning) return '⚠️';
    return null; // Убираем ✅ иконку
  };

  return (
    <CardContainer warning={warning} error={error}>
      <Preview>
        {path && !error ? (
          <img src={`file://${path}?t=${new Date().getTime()}`} alt={name} />
        ) : (
          <div style={{ color: '#8e8e93', fontSize: '12px' }}>
            {error ? '❌' : '🎬'}
          </div>
        )}
      </Preview>
      
      <Info>
        <Name warning={warning} error={error}>
          {getStatusIcon() && <span>{getStatusIcon()}</span>}
          {name}
        </Name>
        
        {!error && (
          <Meta>
            {formatSize(size)}
            {frameCount && `, ${frameCount} кадра`}
            {getDuration() && `, ${getDuration()} сек`}
            {dimensions.width && dimensions.height && `, ${dimensions.width}×${dimensions.height}`}
            {getColorCount() && `, ${getColorCount()} цветов`}
          </Meta>
        )}
        
        {warning && (
          <WarningMessage>
            ⚠️ {warning}
          </WarningMessage>
        )}
        
        {error && (
          <ErrorMessage>
            ❌ Ошибка: {error}
          </ErrorMessage>
        )}
      </Info>
      
      {!error && onShowInFolder && (
        <Actions>
          <ActionButton onClick={onShowInFolder}>
            показать файл
          </ActionButton>
        </Actions>
      )}
    </CardContainer>
  );
}

export default Card;