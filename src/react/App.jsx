import React, { useState, useEffect } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import Button from './components/Button';
import Input from './components/Input';
import Card from './components/Card';
import { Section, TitleRow, Title, Subtitle } from './components/Section';
import ProgressBar from './components/ProgressBar';
import { Arrow, Folder } from './components/Icons';
import { lightTheme, darkTheme, GlobalStyle } from './theme';

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
  margin-bottom: 16px;
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

function App() {
  // State
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [groupedFiles, setGroupedFiles] = useState({});
  const [frameDelay, setFrameDelay] = useState(3);
  const [conversionResults, setConversionResults] = useState([]);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentTask: '' });
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  // Check for electronAPI on mount and listen to theme changes
  useEffect(() => {
    if (!window.electronAPI) {
      setStatusMessage({
        text: 'Ошибка: electronAPI недоступен. Убедитесь, что приложение запущено в Electron.',
        type: 'error'
      });
    }

    // Listen for theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDarkMode(e.matches);
    
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // Handlers
  const handleChooseDirectory = async () => {
    if (!window.electronAPI) return;
    
    try {
      setStatusMessage({ text: 'Выбор папки...', type: 'info' });
      
      const result = await window.electronAPI.chooseDirectory();
      
      if (result && result.success && result.path) {
        setSelectedDirectory(result.path);
        
        // Get PNG files
        const files = await window.electronAPI.getPngFiles(result.path);
        
        if (files && files.success && files.groups) {
          setGroupedFiles(files.groups);
          setStatusMessage({
            text: `Найдено ${Object.keys(files.groups).length} групп файлов`,
            type: 'success'
          });
        } else {
          const errorMsg = files?.error || 'Неизвестная ошибка при получении файлов';
          setStatusMessage({ text: `Ошибка: ${errorMsg}`, type: 'error' });
        }
      } else if (result && result.error) {
        setStatusMessage({ text: `Ошибка выбора папки: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      setStatusMessage({ text: `Критическая ошибка: ${error.message}`, type: 'error' });
    }
  };

  const handleReset = () => {
    setFrameDelay(3);
    setSelectedDirectory('');
    setGroupedFiles({});
    setConversionResults([]);
    setStatusMessage({ text: 'Настройки сброшены', type: 'success' });
  };

  const handleConvert = async () => {
    if (!window.electronAPI || !selectedDirectory) return;
    
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
            maxKb: 510,
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
      
      // Set final status message
      const warningCount = results.filter(r => r.success && r.warning).length;
      const successCount = results.filter(r => r.success).length;
      
      if (successCount === totalGroups && warningCount === 0) {
        setStatusMessage({
          text: `Успешно сконвертировано ${successCount} групп файлов!`,
          type: 'success'
        });
      } else if (successCount === totalGroups && warningCount > 0) {
        setStatusMessage({
          text: `Успешно сконвертировано ${successCount} групп! (${warningCount} с предупреждениями)`,
          type: 'warning'
        });
      } else if (successCount > 0) {
        const warningMsg = warningCount > 0 ? ` (${warningCount} с предупреждениями)` : '';
        setStatusMessage({
          text: `Сконвертировано ${successCount} из ${totalGroups} групп${warningMsg}`,
          type: 'warning'
        });
      } else {
        setStatusMessage({
          text: 'Не удалось сконвертировать ни одной группы',
          type: 'error'
        });
      }
      
    } catch (error) {
      setStatusMessage({
        text: `Критическая ошибка конвертации: ${error.message}`,
        type: 'error'
      });
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

  // Helper functions
  const getDisplayFolderName = () => {
    if (!selectedDirectory) return '';
    return selectedDirectory.split(/[/\\]/).pop();
  };

  const groupsCount = Object.keys(groupedFiles).length;
  const canConvert = selectedDirectory && groupsCount > 0 && !isConverting;

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <GlobalStyle />
      <Container>
      {/* Status Message */}
      {statusMessage.text && (
        <StatusMessage className={statusMessage.type}>
          {statusMessage.text}
        </StatusMessage>
      )}

      {/* Data Section */}
      <Section>
        <TitleRow>
          <Title>Данные</Title>
        </TitleRow>
        <Subtitle>Выбери папку в которой есть изображения</Subtitle>
        <FolderButton 
          chosen={!!selectedDirectory}
          onClick={handleChooseDirectory}
          disabled={isConverting}
        >
          {getDisplayFolderName() || 'Выбор папки'}
          <Arrow />
        </FolderButton>
        
        {groupsCount > 0 && (
          <>
            <GroupsInfo>
              В папке нашлось {groupsCount} групп изображений
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
            value={510}
            suffix="Кб"
            disabled
            style={{ opacity: 0.6 }}
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
          <Arrow />
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
        <Section>
          <TitleRow>
            <Title>
              Сконвертировано {conversionResults.filter(r => r.success).length} гифов
            </Title>
            <Button secondary onClick={handleOpenOutputFolder}>
              <Folder />
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
                onShowInFolder={result.success ? () => handleShowInFolder(result.path) : null}
              />
            ))}
          </ResultsGrid>
        </Section>
      )}
      </Container>
    </ThemeProvider>
  );
}

export default App;