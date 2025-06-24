import React from 'react';
import styled, { css } from 'styled-components';
import { Warning, Check, Error, Folder } from './Icons';

const CardContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }
  
  ${props => props.warning && css`
    background-color: #fff8e1;
    border-color: #ffb74d;
  `}
  
  ${props => props.error && css`
    background-color: #ffebee;
    border-color: #f44336;
  `}
`;

const Preview = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 8px;
  flex-shrink: 0;
  overflow: hidden;
  background: #f5f5f5;
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
  color: ${props => props.warning ? '#f57c00' : props.error ? '#c62828' : '#000'};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Meta = styled.div`
  font-size: 14px;
  color: #6e6e73;
`;

const WarningMessage = styled.div`
  background-color: #ffecb3;
  color: #f57c00;
  padding: 8px 12px;
  border-radius: 8px;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ErrorMessage = styled.div`
  color: #c62828;
  font-weight: 500;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ActionButton = styled.button`
  background: #f0f4f8;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #007aff;
  cursor: pointer;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:hover {
    background: #e2e8f0;
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