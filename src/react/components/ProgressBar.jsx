import React from 'react';
import styled from 'styled-components';

const ProgressContainer = styled.div`
  margin-top: 24px;
`;

const ProgressBackground = styled.div`
  background-color: #eef2f6;
  border-radius: 8px;
  height: 8px;
  width: 100%;
  overflow: hidden;
`;

const ProgressForeground = styled.div`
  background: linear-gradient(90deg, #007aff 0%, #0051ff 100%);
  height: 100%;
  width: ${props => props.percentage}%;
  border-radius: 8px;
  transition: width 0.3s ease-in-out;
`;

const ProgressText = styled.p`
  text-align: center;
  margin-top: 8px;
  font-size: 14px;
  color: #6e6e73;
`;

const DetailStatus = styled.p`
  text-align: center;
  margin-top: 4px;
  font-size: 12px;
  color: #8a8a8e;
`;

function ProgressBar({ current, total, currentTask, visible = false }) {
  if (!visible) return null;
  
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return (
    <ProgressContainer>
      <ProgressBackground>
        <ProgressForeground percentage={percentage} />
      </ProgressBackground>
      <ProgressText>
        Выполнено: {current} из {total} ({percentage}%)
      </ProgressText>
      {currentTask && (
        <DetailStatus>{currentTask}</DetailStatus>
      )}
    </ProgressContainer>
  );
}

export default ProgressBar;