import React from 'react';
import styled, { css } from 'styled-components';
import { Warning, Check, Error, Folder } from './Icons';

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
  background: ${props => props.theme.colors.primaryLight};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:hover {
    background: ${props => props.theme.colors.primaryLight};
    opacity: 0.8;
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
  onShowInFolder 
}) {
  const formatSize = (bytes) => {
    return `${(bytes / 1024).toFixed(1)} КБ`;
  };

  const getStatusIcon = () => {
    if (error) return <Error />;
    if (warning) return <Warning />;
    return <Check />;
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
          {getStatusIcon()}
          {name}
        </Name>
        
        {!error && (
          <>
            <Meta>Размер: {formatSize(size)}</Meta>
            <Meta>Размеры: {dimensions.width || 'N/A'}x{dimensions.height || 'N/A'}</Meta>
            <Meta>Качество: {quality || 'Авто'}</Meta>
          </>
        )}
        
        {warning && (
          <WarningMessage>
            <Warning />
            {warning}
          </WarningMessage>
        )}
        
        {error && (
          <ErrorMessage>
            <Error />
            Ошибка: {error}
          </ErrorMessage>
        )}
      </Info>
      
      {!error && onShowInFolder && (
        <Actions>
          <ActionButton onClick={onShowInFolder}>
            <Folder />
            Показать в проводнике
          </ActionButton>
        </Actions>
      )}
    </CardContainer>
  );
}

export default Card;