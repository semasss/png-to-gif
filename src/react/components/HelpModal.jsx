import React, { useEffect } from 'react';
import styled from 'styled-components';

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
  padding: 30px;
  border-radius: ${props => props.theme.colors.borderRadius};
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  box-shadow: ${props => props.theme.colors.shadow};
  border: 1px solid ${props => props.theme.colors.border};
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

const Title = styled.h2`
  margin: 0 0 20px 0;
  color: ${props => props.theme.colors.text};
  font-size: 20px;
`;

const Section = styled.div`
  margin-bottom: 20px;
  
  h3 {
    color: ${props => props.theme.colors.text};
    margin: 0 0 12px 0;
    font-size: 16px;
  }
  
  p {
    color: ${props => props.theme.colors.textSecondary};
    margin: 8px 0;
    line-height: 1.5;
    font-size: 14px;
  }
  
  ul {
    margin: 8px 0;
    padding-left: 20px;
    
    li {
      color: ${props => props.theme.colors.textSecondary};
      margin: 4px 0;
      font-size: 14px;
      line-height: 1.4;
    }
  }
`;

const ExampleBox = styled.div`
  background: ${props => props.theme.colors.border}30;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
  font-family: monospace;
  font-size: 13px;
  color: ${props => props.theme.colors.text};
`;

const WarningBox = styled.div`
  background: ${props => props.theme.colors.warning}20;
  border: 1px solid ${props => props.theme.colors.warning};
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
  
  p {
    color: ${props => props.theme.colors.warning};
    margin: 0;
    font-weight: 500;
  }
`;

function HelpModal({ visible, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
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

  return (
    <ModalOverlay visible={visible} onClick={handleOverlayClick}>
      <ModalContent visible={visible}>
        <CloseButton onClick={onClose}>×</CloseButton>
        <Title>Как работает программа</Title>
        
        <Section>
          <h3>Основы</h3>
          <p>Программа создает GIF-анимации из последовательности PNG-изображений. Для этого файлы должны быть правильно названы и лежать в одной папке.</p>
        </Section>

        <Section>
          <h3>Правильные названия файлов</h3>
          <p>Каждая группа файлов должна следовать формату: <strong>название_номер.png</strong></p>
          <ExampleBox>
            Правильно:<br/>
            character_1.png<br/>
            character_2.png<br/>
            character_3.png<br/><br/>
            
            explosion_01.png<br/>
            explosion_02.png<br/><br/>
            
            walk_cycle_1.png<br/>
            walk_cycle_2.png
          </ExampleBox>
        </Section>

        <Section>
          <h3>Что НЕ распознается</h3>
          <ul>
            <li><strong>Неправильное расширение:</strong> file.jpg, image.gif</li>
            <li><strong>Нет подчеркивания:</strong> image1.png, file2.png</li>
            <li><strong>Нет номера:</strong> character_.png, image.png</li>
            <li><strong>Неправильный порядок:</strong> 1_character.png</li>
          </ul>
        </Section>

        <Section>
          <h3>Результат</h3>
          <p>Каждая группа файлов станет одним GIF-файлом:</p>
          <ExampleBox>
            character_1.png + character_2.png + character_3.png<br/>
            ↓<br/>
            character.gif
          </ExampleBox>
        </Section>

        <WarningBox>
          <p>⚠️ Все кадры в группе должны иметь одинаковые размеры для корректной анимации</p>
        </WarningBox>
      </ModalContent>
    </ModalOverlay>
  );
}

export default HelpModal;