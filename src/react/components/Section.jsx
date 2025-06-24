import styled from 'styled-components';

const Section = styled.section`
  background: ${props => props.theme.colors.surface};
  border-radius: 32px;
  padding: 40px;
  margin-bottom: 40px;
  box-shadow: ${props => props.theme.colors.shadow};
  border: 1px solid ${props => props.theme.colors.border};
  transition: background-color 0.3s ease, border-color 0.3s ease;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  transition: color 0.3s ease;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 24px;
  transition: color 0.3s ease;
`;

export { Section, TitleRow, Title, Subtitle };