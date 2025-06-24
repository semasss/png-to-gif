import React from 'react';
import styled from 'styled-components';

const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const Label = styled.label`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 8px;
  display: block;
  transition: color 0.3s ease;
`;

const InputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputField = styled.input`
  width: 100%;
  background: ${props => props.theme.colors.primaryLight};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 16px;
  padding: 14px 16px;
  padding-right: ${props => props.hasSuffix ? '50px' : '16px'};
  font-size: 16px;
  color: ${props => props.theme.colors.text};
  transition: all 0.3s ease;
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}20;
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const Suffix = styled.span`
  position: absolute;
  right: 16px;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 16px;
  pointer-events: none;
  transition: color 0.3s ease;
`;

export function Input({ label, suffix, ...props }) {
  return (
    <InputWrapper>
      {label && <Label>{label}</Label>}
      <InputContainer>
        <InputField hasSuffix={!!suffix} {...props} />
        {suffix && <Suffix>{suffix}</Suffix>}
      </InputContainer>
    </InputWrapper>
  );
}

export default Input;