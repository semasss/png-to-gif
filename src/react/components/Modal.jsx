import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const rainbowAnimation = keyframes`
  0% { color: #ff6b6b; }
  10% { color: #ff8e53; }
  20% { color: #ff9f43; }
  30% { color: #10ac84; }
  40% { color: #0abde3; }
  50% { color: #5f27cd; }
  60% { color: #a55eea; }
  70% { color: #5f27cd; }
  80% { color: #0abde3; }
  90% { color: #10ac84; }
  100% { color: #ff6b6b; }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  opacity: ${props => props.visible ? 1 : 0};
  visibility: ${props => props.visible ? 'visible' : 'hidden'};
  transition: all 0.3s ease;
`;

const ModalContent = styled.div`
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  padding: 40px;
  border-radius: ${props => props.theme.colors.borderRadius};
  max-width: 500px;
  width: 90%;
  position: relative;
  box-shadow: ${props => props.theme.colors.shadow};
  border: 1px solid ${props => props.theme.colors.border};
  text-align: center;
  transform: ${props => props.visible ? 'scale(1)' : 'scale(0.9)'};
  transition: all 0.3s ease;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 20px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${props => props.theme.colors.textSecondary};
  transition: color 0.2s ease;
  
  &:hover {
    color: ${props => props.theme.colors.text};
  }
`;

const AsciiLogo = styled.pre`
  font-family: monospace;
  white-space: pre;
  text-align: center;
  line-height: 1.2;
  margin: 20px 0;
  animation: ${rainbowAnimation} 3s ease infinite;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
  transition: transform 0.1s ease;
  
  &:hover {
    transform: scale(1.02);
  }
  
  &:active {
    transform: scale(0.98);
  }
  
  @media (max-width: 600px) {
    font-size: 10px;
  }
`;

const Credits = styled.div`
  margin-top: 30px;
  
  p {
    color: ${props => props.theme.colors.textSecondary};
    font-size: 16px;
    line-height: 1.5;
    margin: 8px 0;
  }
`;

function Modal({ visible, onClose, onLogoClick, clickCount = 0, brightMode = false }) {
  const [logoText, setLogoText] = useState('');

  useEffect(() => {
    // Загружаем ASCII логотип
    const loadLogo = async () => {
      try {
        const response = await fetch('./assets/logo.txt');
        if (response.ok) {
          const text = await response.text();
          setLogoText(text);
        } else {
          // Fallback логотип если файл не найден
          setLogoText(`  ███╗   ███╗ ██████╗ ███████╗ ██████╗ 
  ████╗ ████║██╔═══██╗╚══███╔╝██╔════╝ 
  ██╔████╔██║██║   ██║  ███╔╝ ██║  ███╗
  ██║╚██╔╝██║██║   ██║ ███╔╝  ██║   ██║
  ██║ ╚═╝ ██║╚██████╔╝███████╗╚██████╔╝
  ╚═╝     ╚═╝ ╚═════╝ ╚══════╝ ╚═════╝`);
        }
      } catch (error) {
        // Fallback логотип в случае ошибки
        setLogoText(`  ███╗   ███╗ ██████╗ ███████╗ ██████╗ 
  ████╗ ████║██╔═══██╗╚══███╔╝██╔════╝ 
  ██╔████╔██║██║   ██║  ███╔╝ ██║  ███╗
  ██║╚██╔╝██║██║   ██║ ███╔╝  ██║   ██║
  ██║ ╚═╝ ██║╚██████╔╝███████╗╚██████╔╝
  ╚═╝     ╚═╝ ╚═════╝ ╚══════╝ ╚═════╝`);
      }
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      loadLogo();
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [visible, onClose]);


  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    }
  };

  return (
    <ModalOverlay visible={visible} onClick={handleOverlayClick}>
      <ModalContent visible={visible}>
        <CloseButton onClick={onClose}>×</CloseButton>
        <AsciiLogo className="ascii-logo" onClick={handleLogoClick}>{logoText}</AsciiLogo>
        <Credits>
          <p>Сделано Егором и Сёмой</p>
          <div style={{ marginTop: '20px', fontSize: '13px', lineHeight: '1.4' }}>
            <p><strong>Используемые библиотеки:</strong></p>
            <p>React, Electron, styled-components, image-js, gifski, gifsicle</p>
            <p style={{ marginTop: '16px', fontStyle: 'italic', opacity: '0.8' }}>
              На создание программы ушло около 6 пачек чипсов и 4 сезона сериала "Кремниевая долина"
            </p>
            {clickCount > 0 && clickCount < 10 && (
              <p style={{ marginTop: '12px', fontSize: '11px', opacity: '0.6', color: '#888' }}>
                🎮 {clickCount}/10
              </p>
            )}
            {brightMode && (
              <p style={{ marginTop: '12px', fontSize: '12px', color: '#ff6b6b', fontWeight: 'bold' }}>
                🎉 Режим "Просто будь ярким" активирован!
              </p>
            )}
          </div>
        </Credits>
      </ModalContent>
    </ModalOverlay>
  );
}

export default Modal;