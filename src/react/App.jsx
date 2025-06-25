import React, { useState, useEffect } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import Button from './components/Button';
import Input from './components/Input';
import Card from './components/Card';
import { Section, TitleRow, Title, Subtitle } from './components/Section';
import ProgressBar from './components/ProgressBar';
import Modal from './components/Modal';
import HelpModal from './components/HelpModal';
// import { Arrow, Folder } from './components/Icons'; // Убрали иконки
import { lightTheme, darkTheme, brightTheme, GlobalStyle } from './theme';

const Container = styled.div`
  width: 768px;
  max-width: 100%;
`;

const FolderButton = styled(Button)`
  width: 100%;
  justify-content: space-between;
  font-size: 18px;
  padding: 18px 24px;
  background: ${props => props.chosen 
    ? props.theme.colors.surface 
    : props.theme.colors.primaryLight};
  color: ${props => props.chosen 
    ? props.theme.colors.text 
    : props.theme.colors.primary};
  border: 1px solid ${props => props.chosen 
    ? props.theme.colors.primary 
    : 'transparent'};
  
  &:hover:not(:disabled) {
    background: ${props => props.chosen 
      ? props.theme.colors.surface 
      : props.theme.colors.primaryLight};
    opacity: 0.8;
  }
`;

const Fields = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px 32px;
  margin-bottom: 32px;
`;

const GroupsList = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 40px;
  margin-top: 16px;
`;

const GroupItem = styled.div`
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${props => props.theme.colors.text};
`;

const TinyPreview = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 4px;
  object-fit: cover;
`;

const GroupsInfo = styled.p`
  font-size: 15px;
  margin: 16px 0 16px 0;
  color: ${props => props.theme.colors.textSecondary};
`;

const ResultsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const StatusMessage = styled.div`
  padding: 15px;
  border-radius: ${props => props.theme.colors.borderRadius};
  text-align: center;
  margin-bottom: 20px;
  font-weight: 500;
  
  &.success {
    background-color: ${props => props.theme.colors.success};
    color: white;
  }
  
  &.error {
    background-color: ${props => props.theme.colors.error};
    color: white;
  }
  
  &.warning {
    background-color: ${props => props.theme.colors.warning};
    color: white;
  }
  
  &.info {
    background-color: ${props => props.theme.colors.primary};
    color: white;
  }
`;

const Footer = styled.footer`
  text-align: center;
  margin-top: 40px;
  padding: 20px;
`;

const AboutLink = styled.a`
  color: ${props => props.theme.colors.textSecondary};
  text-decoration: none;
  font-size: 13px;
  opacity: 0.6;
  transition: opacity 0.2s;
  cursor: pointer;
  
  &:hover {
    opacity: 1;
    text-decoration: underline;
  }
`;

const HelpButton = styled.button`
  background: transparent;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 8px;
  
  &:hover {
    background: ${props => props.theme.colors.primaryLight};
    color: ${props => props.theme.colors.primary};
    border-color: ${props => props.theme.colors.primary};
  }
`;

const NoGroupsMessage = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0;
  text-align: center;
  
  h4 {
    color: ${props => props.theme.colors.text};
    margin: 0 0 12px 0;
    font-size: 16px;
  }
  
  p {
    color: ${props => props.theme.colors.textSecondary};
    margin: 8px 0;
    font-size: 14px;
    line-height: 1.5;
  }
  
  .example {
    background: ${props => props.theme.colors.border}30;
    padding: 8px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 13px;
    color: ${props => props.theme.colors.text};
    margin: 12px 0;
  }
`;

function App() {
  // State
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [groupedFiles, setGroupedFiles] = useState({});
  const [frameDelay, setFrameDelay] = useState(3);
  const [maxFileSize, setMaxFileSize] = useState(510);
  const [conversionResults, setConversionResults] = useState([]);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentTask: '' });
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [brightMode, setBrightMode] = useState(false); // отдельно от dark/light
  const resultsRef = React.useRef(null);

  // Check for electronAPI on mount and listen to theme changes
  useEffect(() => {
    // Listen for theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDarkMode(e.matches);
    
    mediaQuery.addListener(handleChange);
    
    // Принудительно загружаем Comic Sans шрифт
    const font = new FontFace('Comic Sans MS Custom', 'url("./assets/ComicSansMS.ttf")');
    font.load().then(() => {
      document.fonts.add(font);
      console.log('✅ Comic Sans MS Custom загружен успешно');
    }).catch(err => {
      console.error('❌ Ошибка загрузки Comic Sans:', err);
    });
    
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // Bright theme easter egg effect
  useEffect(() => {
    if (logoClickCount >= 10 && !brightMode) {
      setBrightMode(true);
      console.log('🎉 Активируем режим "Просто будь ярким"!');
    }
  }, [logoClickCount, brightMode]);

  // Handlers
  const handleChooseDirectory = async () => {
    if (!window.electronAPI) return;
    
    try {
      const result = await window.electronAPI.chooseDirectory();
      
      if (result && result.success && result.path) {
        setSelectedDirectory(result.path);
        
        // Get PNG files
        const files = await window.electronAPI.getPngFiles(result.path);
        
        if (files && files.success && files.groups) {
          setGroupedFiles(files.groups);
        }
      }
    } catch (error) {
      console.error('Ошибка выбора папки:', error);
    }
  };

  const handleReset = () => {
    setFrameDelay(3);
    setMaxFileSize(510);
    setSelectedDirectory('');
    setGroupedFiles({});
    setConversionResults([]);
  };

  const handleConvert = async () => {
    if (!window.electronAPI || !selectedDirectory) return;
    
    // Basic validation - just return if invalid
    if (isNaN(frameDelay) || frameDelay < 0.01 || isNaN(maxFileSize) || maxFileSize < 10) {
      return;
    }
    
    setIsConverting(true);
    setConversionResults([]);
    setProgress({ current: 0, total: Object.keys(groupedFiles).length, currentTask: 'Подготовка...' });
    
    const results = [];
    const totalGroups = Object.keys(groupedFiles).length;
    let completedGroups = 0;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sessionOutputDir = await window.electronAPI.pathJoin(selectedDirectory, `Результаты конвертации - ${timestamp}`);
      
      for (const [groupName, files] of Object.entries(groupedFiles)) {
        setProgress({
          current: completedGroups,
          total: totalGroups,
          currentTask: `Конвертируется группа: ${groupName}...`
        });
        
        try {
          const result = await window.electronAPI.convertToGif({
            groupName: groupName,
            files: files,
            outputDir: selectedDirectory,
            frameDelay: frameDelay,
            maxKb: maxFileSize,
            sessionOutputDir: sessionOutputDir,
          });
          
          results.push(result);
          
          if (result.success) {
            completedGroups++;
          }
        } catch (groupError) {
          results.push({
            success: false,
            groupName: groupName,
            error: groupError.message
          });
        }
        
        setProgress({
          current: completedGroups,
          total: totalGroups,
          currentTask: `Завершено: ${completedGroups} из ${totalGroups}`
        });
      }
      
      setConversionResults(results);
      
      // Scroll to results section
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      // Conversion complete - results shown in UI
      
    } catch (error) {
      console.error('Критическая ошибка конвертации:', error);
    } finally {
      setIsConverting(false);
    }
  };

  const handleShowInFolder = (path) => {
    if (window.electronAPI && window.electronAPI.showItemInFolder) {
      window.electronAPI.showItemInFolder(path);
    }
  };

  const handleOpenOutputFolder = () => {
    const firstSuccessfulResult = conversionResults.find(r => r.success && r.outputDir);
    if (firstSuccessfulResult && window.electronAPI) {
      window.electronAPI.openPath(firstSuccessfulResult.outputDir);
    } else if (selectedDirectory && window.electronAPI) {
      window.electronAPI.openPath(selectedDirectory);
    }
  };

  const handleAboutClick = (e) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleHelpClick = () => {
    setIsHelpModalOpen(true);
  };

  const handleCloseHelpModal = () => {
    setIsHelpModalOpen(false);
  };

  const handleLogoClick = () => {
    setLogoClickCount(prev => prev + 1);
  };

  // Helper functions
  const getDisplayFolderName = () => {
    if (!selectedDirectory) return '';
    return selectedDirectory.split(/[/\\]/).pop();
  };

  const groupsCount = Object.keys(groupedFiles).length;
  const canConvert = selectedDirectory && groupsCount > 0 && !isConverting;

  // Determine current theme
  const getCurrentTheme = () => {
    if (brightMode) return brightTheme;
    return isDarkMode ? darkTheme : lightTheme; // обычное системное определение
  };

  return (
    <ThemeProvider theme={getCurrentTheme()}>
      <GlobalStyle />
      <Container>

      {/* Data Section */}
      <Section>
        <TitleRow>
          <Title>Данные</Title>
        </TitleRow>
        <Subtitle>
          Выбери папку в которой есть изображения
          <HelpButton onClick={handleHelpClick}>как это работает?</HelpButton>
        </Subtitle>
        <FolderButton 
          chosen={!!selectedDirectory}
          onClick={handleChooseDirectory}
          disabled={isConverting}
        >
          {getDisplayFolderName() || 'Выбор папки'}
          <span style={{ opacity: 0.7, fontSize: '18px' }}>{'→'}</span>
        </FolderButton>
        
        {selectedDirectory && groupsCount === 0 && (
          <NoGroupsMessage>
            <h4>Подходящие файлы не найдены</h4>
            <p>Программа ищет PNG-файлы с определенным названием для создания анимации.</p>
            <div className="example">
              Пример правильных названий:<br/>
              run_1.png, run_2.png, run_3.png<br/>
              walk_1.png, walk_2.png<br/>
              explosion_01.png, explosion_02.png
            </div>
            <p>Файлы должны содержать подчеркивание и номер перед расширением .png</p>
            <HelpButton onClick={handleHelpClick}>подробная справка</HelpButton>
          </NoGroupsMessage>
        )}
        
        {groupsCount > 0 && (
          <>
            <GroupsInfo>
              В папке нашлось {groupsCount} групп изображений
              <HelpButton onClick={handleHelpClick}>тут нет нужного файла?</HelpButton>
            </GroupsInfo>
            <GroupsList>
              {Object.entries(groupedFiles).slice(0, 10).map(([groupName, files]) => (
                <GroupItem key={groupName}>
                  <TinyPreview src={`file://${files[0].path}`} alt="preview" />
                  {groupName.replace(/_/g, ' ')} 
                  <span style={{ color: 'currentColor', opacity: 0.7, fontSize: '0.85em' }}>({files.length})</span>
                </GroupItem>
              ))}
              {groupsCount > 10 && (
                <GroupItem style={{ opacity: 0.7, fontStyle: 'italic' }}>
                  ... и ещё {groupsCount - 10} групп
                </GroupItem>
              )}
            </GroupsList>
          </>
        )}
      </Section>

      {/* Settings Section */}
      <Section>
        <TitleRow>
          <Title>Настройки</Title>
          <Button ghost onClick={handleReset} disabled={isConverting}>
            сбросить
          </Button>
        </TitleRow>
        <Fields>
          <Input
            label="Длина кадра"
            type="number"
            value={frameDelay}
            onChange={(e) => setFrameDelay(Number(e.target.value))}
            suffix="сек"
            min="0.01"
            step="0.1"
            disabled={isConverting}
          />
          <Input
            label="Максимальный вес"
            type="number"
            value={maxFileSize}
            onChange={(e) => setMaxFileSize(Number(e.target.value))}
            suffix="Кб"
            min="10"
            step="10"
            disabled={isConverting}
          />
        </Fields>
        <Button 
          primary 
          size="large"
          full 
          disabled={!canConvert}
          onClick={handleConvert}
        >
          Жмахнуть ЖИФ
        </Button>
        
        <ProgressBar
          visible={isConverting}
          current={progress.current}
          total={progress.total}
          currentTask={progress.currentTask}
        />
      </Section>

      {/* Results Section */}
      {conversionResults.length > 0 && (
        <Section ref={resultsRef}>
          <TitleRow>
            <Title>
              Сконвертировано {conversionResults.filter(r => r.success).length} гифов
            </Title>
            <Button secondary onClick={handleOpenOutputFolder}>
              Открыть папку
            </Button>
          </TitleRow>
          <ResultsGrid>
            {conversionResults.map((result, index) => (
              <Card
                key={result.groupName || index}
                name={result.groupName}
                size={result.size}
                dimensions={result.dimensions || {}}
                quality={result.quality}
                path={result.path}
                warning={result.warning}
                error={result.success ? null : result.error}
                frameCount={result.frameCount}
                frameDelay={frameDelay}
                onShowInFolder={result.success ? () => handleShowInFolder(result.path) : null}
              />
            ))}
          </ResultsGrid>
        </Section>
      )}

      {/* Footer */}
      <Footer>
        <AboutLink onClick={handleAboutClick}>о программе</AboutLink>
      </Footer>
      </Container>

      {/* About Modal */}
      <Modal 
        visible={isModalOpen} 
        onClose={handleCloseModal} 
        onLogoClick={handleLogoClick}
        clickCount={logoClickCount}
        brightMode={brightMode}
      />
      
      {/* Help Modal */}
      <HelpModal visible={isHelpModalOpen} onClose={handleCloseHelpModal} />
    </ThemeProvider>
  );
}

export default App;