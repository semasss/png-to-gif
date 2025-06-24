import React from 'react';
import styled from 'styled-components';

const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const Label = styled.label`
  font-size: 14px;
  color: #6e6e73;
  margin-bottom: 8px;
  display: block;
`;

const InputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputField = styled.input`
  width: 100%;
  background: #f7f7f9;
  border: 1px solid #d1d1d6;
  border-radius: 16px;
  padding: 14px 16px;
  padding-right: ${props => props.hasSuffix ? '50px' : '16px'};
  font-size: 16px;
  color: #000;
  transition: border-color 0.2s ease;
  
  &:focus {
    border-color: #007aff;
    outline: none;
  }
  
  &::placeholder {
    color: #8e8e93;
  }
`;

const Suffix = styled.span`
  position: absolute;
  right: 16px;
  color: #8e8e93;
  font-size: 16px;
  pointer-events: none;
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