import styled from 'styled-components';

const Section = styled.section`
  background: #ffffff;
  border-radius: 32px;
  padding: 40px;
  margin-bottom: 40px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
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
  color: #333;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #6e6e73;
  margin-bottom: 24px;
`;

export { Section, TitleRow, Title, Subtitle };